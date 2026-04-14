import crypto from "node:crypto";
import { config } from "dotenv";
import {
  PrismaClient,
  type CoordinatorType,
  type Prisma,
  type UserRole,
} from "@prisma/client";

config({ path: ".env.local" });
config();

type BootstrapUser = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  coordinatorType?: CoordinatorType;
  phone?: string;
};

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
    .toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

function readBootstrapUsers(): BootstrapUser[] {
  const raw = process.env.BOOTSTRAP_ADMINS_JSON?.trim();

  if (!raw) {
    throw new Error(
      "BOOTSTRAP_ADMINS_JSON is required. Example: " +
        '[{"email":"admin@iitrpr.ac.in","name":"Admin","password":"StrongPass123","role":"tpo_admin"}]',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("BOOTSTRAP_ADMINS_JSON must be valid JSON");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("BOOTSTRAP_ADMINS_JSON must be a non-empty JSON array");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`BOOTSTRAP_ADMINS_JSON[${index}] must be an object`);
    }

    const record = item as Record<string, unknown>;
    const email =
      typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const password =
      typeof record.password === "string" ? record.password.trim() : "";
    const role = record.role;
    const coordinatorType = record.coordinatorType;
    const phone = typeof record.phone === "string" ? record.phone.trim() : "";

    if (!email || !name || !password) {
      throw new Error(
        `BOOTSTRAP_ADMINS_JSON[${index}] requires email, name, and password`,
      );
    }

    if (role !== "tpo_admin" && role !== "coordinator" && role !== "tech_support") {
      throw new Error(
        `BOOTSTRAP_ADMINS_JSON[${index}].role must be one of: tpo_admin, coordinator, tech_support`,
      );
    }

    if (
      coordinatorType !== undefined &&
      coordinatorType !== "general" &&
      coordinatorType !== "student_representative" &&
      coordinatorType !== "mailing_team"
    ) {
      throw new Error(
        `BOOTSTRAP_ADMINS_JSON[${index}].coordinatorType is invalid`,
      );
    }

    return {
      email,
      name,
      password,
      role,
      coordinatorType:
        coordinatorType === undefined
          ? undefined
          : (coordinatorType as CoordinatorType),
      phone: phone || undefined,
    };
  });
}

async function bootstrapAdmins() {
  const databaseUrl =
    process.env.DATABASE_URL_RUNTIME ??
    process.env.DIRECT_URL ??
    process.env.DATABASE_URL_MIGRATIONS ??
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Provide DATABASE_URL, DIRECT_URL, or DATABASE_URL_RUNTIME.",
    );
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    const users = readBootstrapUsers();
    let created = 0;
    let updated = 0;

    for (const user of users) {
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
        select: {
          id: true,
          profileMeta: true,
        },
      });

      const passwordHash = hashPassword(user.password);
      const existingMeta =
        existing?.profileMeta &&
        typeof existing.profileMeta === "object" &&
        !Array.isArray(existing.profileMeta)
          ? (existing.profileMeta as Record<string, unknown>)
          : {};

      const nextProfileMeta: Prisma.InputJsonValue = {
        ...existingMeta,
        passwordHash,
      };

      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: user.role,
          coordinatorType: user.role === "coordinator" ? user.coordinatorType ?? "general" : null,
          phone: user.phone ?? null,
          isActive: true,
          authProvider: "credentials",
          profileMeta: nextProfileMeta,
        },
        create: {
          email: user.email,
          name: user.name,
          role: user.role,
          coordinatorType: user.role === "coordinator" ? user.coordinatorType ?? "general" : null,
          phone: user.phone ?? null,
          isActive: true,
          authProvider: "credentials",
          profileMeta: nextProfileMeta,
        },
      });

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    console.log(
      `Bootstrap complete. ${created} admin/coordinator users created and ${updated} updated.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapAdmins().catch((error) => {
  console.error("bootstrap-admins failed:", error);
  process.exit(1);
});
