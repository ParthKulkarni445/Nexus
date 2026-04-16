import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config();

async function run() {
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
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ name: "asc" }],
    });

    let created = 0;
    let updated = 0;
    let suffix = 2;

    for (const company of companies) {
      const email = `2023csb1142+${suffix}@iitrpr.ac.in`;
      suffix += 1;

      const existing = await prisma.companyContact.findFirst({
        where: {
          companyId: company.id,
          name: "HR Guy",
        },
        select: {
          id: true,
        },
        orderBy: [{ createdAt: "asc" }],
      });

      if (existing) {
        await prisma.companyContact.update({
          where: { id: existing.id },
          data: {
            designation: "HR",
            emails: [email],
            phones: ["1234567890"],
            preferredContactMethod: "email",
          },
        });
        updated += 1;
      } else {
        await prisma.companyContact.create({
          data: {
            companyId: company.id,
            name: "HR Guy",
            designation: "HR",
            emails: [email],
            phones: ["1234567890"],
            preferredContactMethod: "email",
          },
        });
        created += 1;
      }
    }

    console.log(
      `Processed ${companies.length} companies. Contacts created: ${created}. Contacts updated: ${updated}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error("update-company-hr-contacts failed:", error);
  process.exit(1);
});
