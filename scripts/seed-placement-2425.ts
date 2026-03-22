import crypto from "node:crypto";
import { config } from "dotenv";
import { PrismaClient, type Prisma } from "@prisma/client";

config({ path: ".env.local" });
config();

const SEASON_2425_ID = "24252425-2425-4425-a425-242524252425";

function deterministicUuid(key: string): string {
  const hex = crypto.createHash("sha256").update(key).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function tableExists(db: PrismaClient, tableName: string): Promise<boolean> {
  const rows = await db.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS "exists"
  `;

  return rows[0]?.exists ?? false;
}

type StudentSeed = {
  email: string;
  name: string;
  branch: string;
  gradYear: number;
};

type PlacementSeed = {
  key: string;
  studentEmail: string;
  companySlug: string;
  role: string;
  packageType: "ctc" | "stipend";
  packageAmount: number;
  packageFrequency: "yearly" | "monthly";
  selectionDate: string;
  placementStatus: "accepted" | "offered";
  source: string;
};

type SeasonContactStatus =
  | "not_contacted"
  | "contacted"
  | "positive"
  | "accepted"
  | "rejected";

function seasonStatusRank(status: SeasonContactStatus): number {
  switch (status) {
    case "accepted":
      return 5;
    case "positive":
      return 4;
    case "contacted":
      return 3;
    case "not_contacted":
      return 2;
    case "rejected":
      return 1;
    default:
      return 0;
  }
}

function seasonStatusFromPlacement(
  placementStatus: PlacementSeed["placementStatus"],
): SeasonContactStatus {
  if (placementStatus === "accepted") {
    return "accepted";
  }
  return "positive";
}

function buildDriveWindow(selectionDate: string): {
  startAt: Date;
  endAt: Date;
} {
  const selection = new Date(`${selectionDate}T10:00:00.000Z`);
  const startAt = new Date(selection);
  startAt.setDate(startAt.getDate() - 8);

  const endAt = new Date(startAt);
  endAt.setHours(endAt.getHours() + 3);

  return { startAt, endAt };
}

const students: StudentSeed[] = [
  { email: "aarav.2425@nexus.local", name: "Aarav Patel", branch: "CSE", gradYear: 2025 },
  { email: "diya.2425@nexus.local", name: "Diya Sharma", branch: "IT", gradYear: 2025 },
  { email: "kabir.2425@nexus.local", name: "Kabir Mehta", branch: "ECE", gradYear: 2025 },
  { email: "isha.2425@nexus.local", name: "Isha Verma", branch: "CSE", gradYear: 2025 },
  { email: "arjun.2425@nexus.local", name: "Arjun Nair", branch: "ME", gradYear: 2025 },
  { email: "meera.2425@nexus.local", name: "Meera Iyer", branch: "EEE", gradYear: 2025 },
  { email: "riya.2425@nexus.local", name: "Riya Khanna", branch: "AI", gradYear: 2025 },
  { email: "naman.2425@nexus.local", name: "Naman Gupta", branch: "CSE", gradYear: 2025 },
  { email: "tanvi.2425@nexus.local", name: "Tanvi Rao", branch: "CE", gradYear: 2025 },
  { email: "pranav.2425@nexus.local", name: "Pranav Kulkarni", branch: "DS", gradYear: 2025 },
];

const placements: PlacementSeed[] = [
  {
    key: "google-aarav",
    studentEmail: "aarav.2425@nexus.local",
    companySlug: "google-india",
    role: "Software Engineer",
    packageType: "ctc",
    packageAmount: 39.5,
    packageFrequency: "yearly",
    selectionDate: "2024-09-12",
    placementStatus: "accepted",
    source: "manual_seed_2425",
  },
  {
    key: "microsoft-diya",
    studentEmail: "diya.2425@nexus.local",
    companySlug: "microsoft",
    role: "SDE I",
    packageType: "ctc",
    packageAmount: 32.0,
    packageFrequency: "yearly",
    selectionDate: "2024-10-03",
    placementStatus: "accepted",
    source: "manual_seed_2425",
  },
  {
    key: "amazon-kabir",
    studentEmail: "kabir.2425@nexus.local",
    companySlug: "amazon-aws",
    role: "Cloud Support Associate",
    packageType: "ctc",
    packageAmount: 18.75,
    packageFrequency: "yearly",
    selectionDate: "2024-10-19",
    placementStatus: "accepted",
    source: "manual_seed_2425",
  },
  {
    key: "flipkart-isha",
    studentEmail: "isha.2425@nexus.local",
    companySlug: "flipkart",
    role: "Product Analyst",
    packageType: "ctc",
    packageAmount: 21.4,
    packageFrequency: "yearly",
    selectionDate: "2024-11-07",
    placementStatus: "accepted",
    source: "manual_seed_2425",
  },
  {
    key: "goldman-riya",
    studentEmail: "riya.2425@nexus.local",
    companySlug: "goldman-sachs",
    role: "Analyst",
    packageType: "ctc",
    packageAmount: 28.0,
    packageFrequency: "yearly",
    selectionDate: "2024-11-14",
    placementStatus: "accepted",
    source: "manual_seed_2425",
  },
  {
    key: "phonepe-naman",
    studentEmail: "naman.2425@nexus.local",
    companySlug: "phonepe",
    role: "Data Analyst",
    packageType: "ctc",
    packageAmount: 16.2,
    packageFrequency: "yearly",
    selectionDate: "2024-12-02",
    placementStatus: "accepted",
    source: "manual_seed_2425",
  },
  {
    key: "infosys-pranav",
    studentEmail: "pranav.2425@nexus.local",
    companySlug: "infosys",
    role: "Systems Engineer",
    packageType: "ctc",
    packageAmount: 9.5,
    packageFrequency: "yearly",
    selectionDate: "2025-01-11",
    placementStatus: "accepted",
    source: "manual_seed_2425",
  },
  {
    key: "tcs-tanvi",
    studentEmail: "tanvi.2425@nexus.local",
    companySlug: "tcs",
    role: "Assistant Systems Engineer",
    packageType: "ctc",
    packageAmount: 7.2,
    packageFrequency: "yearly",
    selectionDate: "2025-01-18",
    placementStatus: "accepted",
    source: "manual_seed_2425",
  },
  {
    key: "mckinsey-arjun-intern",
    studentEmail: "arjun.2425@nexus.local",
    companySlug: "mckinsey",
    role: "Business Analyst Intern",
    packageType: "stipend",
    packageAmount: 120000,
    packageFrequency: "monthly",
    selectionDate: "2025-02-06",
    placementStatus: "offered",
    source: "manual_seed_2425",
  },
  {
    key: "accenture-meera-intern",
    studentEmail: "meera.2425@nexus.local",
    companySlug: "accenture",
    role: "Technology Intern",
    packageType: "stipend",
    packageAmount: 80000,
    packageFrequency: "monthly",
    selectionDate: "2025-02-21",
    placementStatus: "accepted",
    source: "manual_seed_2425",
  },
  {
    key: "google-diya-2",
    studentEmail: "diya.2425@nexus.local",
    companySlug: "google-india",
    role: "Associate Product Manager",
    packageType: "ctc",
    packageAmount: 34.2,
    packageFrequency: "yearly",
    selectionDate: "2025-03-04",
    placementStatus: "offered",
    source: "manual_seed_2425",
  },
  {
    key: "microsoft-isha-2",
    studentEmail: "isha.2425@nexus.local",
    companySlug: "microsoft",
    role: "Program Manager",
    packageType: "ctc",
    packageAmount: 27.6,
    packageFrequency: "yearly",
    selectionDate: "2025-03-13",
    placementStatus: "accepted",
    source: "manual_seed_2425",
  },
];

async function seedPlacement2425() {
  const databaseUrl =
    process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Set it in .env.local before running this seed.",
    );
  }

  const db = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  try {
    const hasPlacementsTable = await tableExists(db, "placements");
    if (!hasPlacementsTable) {
      throw new Error(
        "placements table does not exist in this database. Run migrations for Placement model first.",
      );
    }

    const hasStudentConsentTable = await tableExists(
      db,
      "student_data_consent",
    );

    const admin = await db.user.findFirst({
      where: { role: "tpo_admin" },
      select: { id: true },
    });
    const coordinators = await db.user.findMany({
      where: { role: "coordinator" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    await db.recruitmentSeason.upsert({
      where: { id: SEASON_2425_ID },
      update: {
        name: "Placement 2024-25",
        seasonType: "placement",
        academicYear: "2024-25",
        startDate: new Date("2024-07-01"),
        endDate: new Date("2025-06-30"),
        isActive: false,
        updatedAt: new Date(),
      },
      create: {
        id: SEASON_2425_ID,
        name: "Placement 2024-25",
        seasonType: "placement",
        academicYear: "2024-25",
        startDate: new Date("2024-07-01"),
        endDate: new Date("2025-06-30"),
        isActive: false,
        createdBy: admin?.id ?? null,
      },
    });

    const studentIdByEmail = new Map<string, string>();

    for (const student of students) {
      const userId = deterministicUuid(`student-2425:${student.email}`);
      const upserted = await db.user.upsert({
        where: { email: student.email },
        update: {
          name: student.name,
          role: "student",
          authProvider: "credentials",
          isActive: true,
          profileMeta: {
            branch: student.branch,
            gradYear: student.gradYear,
            seededFor: "placement-2024-25",
          } as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
        create: {
          id: userId,
          email: student.email,
          name: student.name,
          role: "student",
          authProvider: "credentials",
          profileMeta: {
            branch: student.branch,
            gradYear: student.gradYear,
            seededFor: "placement-2024-25",
          } as Prisma.InputJsonValue,
          isActive: true,
        },
      });

      studentIdByEmail.set(student.email, upserted.id);

      if (hasStudentConsentTable) {
        await db.studentDataConsent.upsert({
          where: { studentId: upserted.id },
          update: {
            allowPublicPlacementData: true,
            updatedAt: new Date(),
          },
          create: {
            studentId: upserted.id,
            allowPublicPlacementData: true,
          },
        });
      }
    }

    const targetCompanySlugs = Array.from(
      new Set(placements.map((placement) => placement.companySlug)),
    );

    const companies = await db.company.findMany({
      where: { slug: { in: targetCompanySlugs } },
      select: { id: true, slug: true, name: true },
    });

    const companyBySlug = new Map(
      companies.map((company) => [company.slug, company]),
    );

    for (const slug of targetCompanySlugs) {
      if (companyBySlug.has(slug)) {
        continue;
      }

      const fallbackName = slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

      const created = await db.company.create({
        data: {
          id: deterministicUuid(`company-2425:${slug}`),
          name: fallbackName,
          slug,
          domain: `${slug.replaceAll("-", "")}.example.com`,
          website: `https://${slug.replaceAll("-", "")}.example.com`,
          industry: "General",
          priority: 2,
          notes: "Auto-created to support placement 2024-25 dummy data",
          createdBy: admin?.id ?? null,
        },
        select: { id: true, slug: true, name: true },
      });

      companyBySlug.set(created.slug, created);
    }

    const cycleIdByCompanyId = new Map<string, string>();
    const strongestStatusByCompanySlug = new Map<string, SeasonContactStatus>();

    for (const placement of placements) {
      const nextStatus = seasonStatusFromPlacement(placement.placementStatus);
      const currentStatus =
        strongestStatusByCompanySlug.get(placement.companySlug) ??
        "not_contacted";

      if (seasonStatusRank(nextStatus) >= seasonStatusRank(currentStatus)) {
        strongestStatusByCompanySlug.set(placement.companySlug, nextStatus);
      }
    }

    let cyclesUpserted = 0;

    for (let index = 0; index < targetCompanySlugs.length; index += 1) {
      const slug = targetCompanySlugs[index];
      const company = companyBySlug.get(slug);

      if (!company) {
        continue;
      }

      const strongestStatus = strongestStatusByCompanySlug.get(slug) ?? "contacted";
      const ownerUserId =
        coordinators.length > 0
          ? coordinators[index % coordinators.length].id
          : null;

      const cycle = await db.companySeasonCycle.upsert({
        where: {
          companyId_seasonId: {
            companyId: company.id,
            seasonId: SEASON_2425_ID,
          },
        },
        update: {
          status: strongestStatus,
          ownerUserId,
          lastContactedAt: new Date("2025-03-20T10:00:00.000Z"),
          nextFollowUpAt: strongestStatus === "accepted" ? null : new Date("2025-03-30T10:00:00.000Z"),
          notes: `Auto-seeded cycle for Placement 2024-25 (${slug})`,
          updatedBy: admin?.id ?? null,
          updatedField: "seed-placement-2425",
          updatedAt: new Date(),
        },
        create: {
          id: deterministicUuid(`cycle-2425:${company.id}`),
          companyId: company.id,
          seasonId: SEASON_2425_ID,
          status: strongestStatus,
          ownerUserId,
          lastContactedAt: new Date("2025-03-20T10:00:00.000Z"),
          nextFollowUpAt: strongestStatus === "accepted" ? null : new Date("2025-03-30T10:00:00.000Z"),
          notes: `Auto-seeded cycle for Placement 2024-25 (${slug})`,
          updatedBy: admin?.id ?? null,
          updatedField: "seed-placement-2425",
        },
      });

      cycleIdByCompanyId.set(company.id, cycle.id);
      cyclesUpserted += 1;
    }

    let placementsUpserted = 0;
    let drivesUpserted = 0;

    for (const placement of placements) {
      const studentId = studentIdByEmail.get(placement.studentEmail);
      const company = companyBySlug.get(placement.companySlug);
      const cycleId = company ? cycleIdByCompanyId.get(company.id) : undefined;

      if (!studentId || !company || !cycleId) {
        console.warn(
          `Skipping placement ${placement.key}: missing student/company/cycle mapping.`,
        );
        continue;
      }

      await db.placement.upsert({
        where: { id: deterministicUuid(`placement-2425:${placement.key}`) },
        update: {
          studentId,
          companyId: company.id,
          seasonId: SEASON_2425_ID,
          role: placement.role,
          packageType: placement.packageType,
          packageAmount: placement.packageAmount,
          packageFrequency: placement.packageFrequency,
          currency: "INR",
          selectionDate: new Date(placement.selectionDate),
          placementStatus: placement.placementStatus,
          source: placement.source,
          updatedAt: new Date(),
        },
        create: {
          id: deterministicUuid(`placement-2425:${placement.key}`),
          studentId,
          companyId: company.id,
          seasonId: SEASON_2425_ID,
          role: placement.role,
          packageType: placement.packageType,
          packageAmount: placement.packageAmount,
          packageFrequency: placement.packageFrequency,
          currency: "INR",
          selectionDate: new Date(placement.selectionDate),
          placementStatus: placement.placementStatus,
          source: placement.source,
        },
      });

      const { startAt, endAt } = buildDriveWindow(placement.selectionDate);
      const driveStatus =
        placement.placementStatus === "accepted" ? "completed" : "confirmed";
      const driveStage =
        placement.placementStatus === "accepted" ? "final" : "interview";

      await db.drive.upsert({
        where: { id: deterministicUuid(`drive-2425:${placement.key}`) },
        update: {
          companyId: company.id,
          companySeasonCycleId: cycleId,
          title: `${placement.role} Hiring Drive`,
          stage: driveStage,
          status: driveStatus,
          venue: "Placement Cell - Seminar Hall",
          startAt,
          endAt,
          isConflictFlagged: false,
          notes: `Auto-seeded from placement record ${placement.key}`,
          createdBy: admin?.id ?? null,
          updatedAt: new Date(),
        },
        create: {
          id: deterministicUuid(`drive-2425:${placement.key}`),
          companyId: company.id,
          companySeasonCycleId: cycleId,
          title: `${placement.role} Hiring Drive`,
          stage: driveStage,
          status: driveStatus,
          venue: "Placement Cell - Seminar Hall",
          startAt,
          endAt,
          isConflictFlagged: false,
          notes: `Auto-seeded from placement record ${placement.key}`,
          createdBy: admin?.id ?? null,
        },
      });

      placementsUpserted += 1;
      drivesUpserted += 1;
    }

    console.log(
      `Placement 2024-25 seed complete. Upserted ${students.length} students, ${cyclesUpserted} cycles, ${drivesUpserted} drives, and ${placementsUpserted} placements.`,
    );
    if (!hasStudentConsentTable) {
      console.log(
        "Note: student_data_consent table is missing, so consent rows were skipped.",
      );
    }
  } finally {
    await db.$disconnect();
  }
}

seedPlacement2425().catch((error) => {
  console.error("Placement 2024-25 seed failed:", error);
  process.exit(1);
});
