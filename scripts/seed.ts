import crypto from "node:crypto";
import { config } from "dotenv";
import {
  Prisma,
  PrismaClient,
  type CoordinatorType,
  type SeasonType,
  type UserRole,
} from "@prisma/client";

config({ path: ".env.local" });
config();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
    .toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

type SeasonStatus =
  | "not_contacted"
  | "contacted"
  | "positive"
  | "accepted"
  | "rejected";

type ContactSeed = {
  name: string;
  designation: string;
  email: string;
  phone: string;
  preferredContactMethod: "email" | "phone" | "linkedin";
};

type CoordinatorKey = "ananya" | "rohan" | "priya" | "vibha" | null;

type CompanySeed = {
  name: string;
  slug: string;
  website: string;
  industry: string;
  priority: number;
  status: SeasonStatus;
  assignedTo: CoordinatorKey;
  notes: string;
  contacts: ContactSeed[];
};

type UserSeed = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  coordinatorType?: CoordinatorType;
  authProvider: string;
  profileMeta: Prisma.InputJsonValue;
};

type SeasonSeed = {
  id: string;
  name: string;
  seasonType: SeasonType;
  academicYear: string;
  isActive: boolean;
  createdBy: string;
};

function deterministicUuid(key: string): string {
  const hex = crypto.createHash("sha256").update(key).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function daysAgo(value: number): Date {
  return new Date(Date.now() - value * 24 * 60 * 60 * 1000);
}

function pastDaysAgo(value: number): Date {
  return daysAgo(Math.max(0, value));
}

function websiteToDomain(website: string): string {
  return new URL(website).hostname;
}

function statusPath(status: SeasonStatus): SeasonStatus[] {
  if (status === "accepted") {
    return ["not_contacted", "contacted", "positive", "accepted"];
  }
  if (status === "positive") {
    return ["not_contacted", "contacted", "positive"];
  }
  if (status === "rejected") {
    return ["not_contacted", "contacted", "rejected"];
  }
  if (status === "contacted") {
    return ["not_contacted", "contacted"];
  }
  return ["not_contacted"];
}

const ids = {
  admin: "11111111-1111-1111-1111-111111111111",
  ananya: "22222222-2222-2222-2222-222222222222",
  coordinatorLegacy: "dddddddd-dddd-4ddd-addd-dddddddddddd",
  rohan: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  priya: "bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb",
  vibha: "cccccccc-cccc-4ccc-accc-cccccccccccc",
  student: "33333333-3333-3333-3333-333333333333",
  seasonPlacement: "44444444-4444-4444-4444-444444444444",
  seasonIntern: "55555555-5555-4555-a555-555555555555",
} as const;

const coordinatorIdMap: Record<Exclude<CoordinatorKey, null>, string> = {
  ananya: ids.ananya,
  rohan: ids.rohan,
  priya: ids.priya,
  vibha: ids.vibha,
};

const companiesSeed: CompanySeed[] = [
  {
    name: "Google India",
    slug: "google-india",
    website: "https://google.com",
    industry: "IT",
    priority: 3,
    status: "accepted",
    assignedTo: "ananya",
    notes: "Top partner company with strong internship conversion.",
    contacts: [
      {
        name: "Neha Joshi",
        designation: "Senior HR Business Partner",
        email: "neha.joshi@google.com",
        phone: "+91 9820000001",
        preferredContactMethod: "email",
      },
      {
        name: "Arvind Kapoor",
        designation: "Campus Recruitment Lead",
        email: "arvind.kapoor@google.com",
        phone: "+91 9820000002",
        preferredContactMethod: "phone",
      },
      {
        name: "Sandra Dsouza",
        designation: "Talent Acquisition Manager",
        email: "sandra.dsouza@google.com",
        phone: "+91 9820000003",
        preferredContactMethod: "linkedin",
      },
    ],
  },
  {
    name: "Microsoft",
    slug: "microsoft",
    website: "https://microsoft.com",
    industry: "IT",
    priority: 3,
    status: "positive",
    assignedTo: "rohan",
    notes: "Strong placement partner for SWE and cloud roles.",
    contacts: [
      {
        name: "Ajay Mishra",
        designation: "HR Manager",
        email: "ajay@microsoft.com",
        phone: "+91 9820000030",
        preferredContactMethod: "email",
      },
      {
        name: "Pooja Saxena",
        designation: "University Relations",
        email: "pooja.s@microsoft.com",
        phone: "+91 9820000031",
        preferredContactMethod: "phone",
      },
    ],
  },
  {
    name: "Goldman Sachs",
    slug: "goldman-sachs",
    website: "https://goldmansachs.com",
    industry: "Finance",
    priority: 3,
    status: "contacted",
    assignedTo: "priya",
    notes: "Potential for quant and technology hiring.",
    contacts: [
      {
        name: "Kavita Rao",
        designation: "Campus Relations",
        email: "kavita.rao@gs.com",
        phone: "+91 9820000040",
        preferredContactMethod: "email",
      },
      {
        name: "Harsh Vora",
        designation: "Talent Acquisition Partner",
        email: "harsh.vora@gs.com",
        phone: "+91 9820000041",
        preferredContactMethod: "phone",
      },
    ],
  },
  {
    name: "Deloitte",
    slug: "deloitte",
    website: "https://deloitte.com",
    industry: "Consulting",
    priority: 2,
    status: "not_contacted",
    assignedTo: null,
    notes: "Needs first outreach in current cycle.",
    contacts: [
      {
        name: "Mansi Desai",
        designation: "Campus Hiring Associate",
        email: "mansi.desai@deloitte.com",
        phone: "+91 9820000050",
        preferredContactMethod: "email",
      },
    ],
  },
  {
    name: "Amazon AWS",
    slug: "amazon-aws",
    website: "https://aws.amazon.com",
    industry: "IT",
    priority: 3,
    status: "contacted",
    assignedTo: "ananya",
    notes: "OA round expected once JD finalized.",
    contacts: [
      {
        name: "Rajeev Verma",
        designation: "Campus Recruiter",
        email: "rajeev@amazon.com",
        phone: "+91 9820000010",
        preferredContactMethod: "phone",
      },
      {
        name: "Nikita Jain",
        designation: "Talent Acquisition Specialist",
        email: "nikita.jain@amazon.com",
        phone: "+91 9820000011",
        preferredContactMethod: "email",
      },
    ],
  },
  {
    name: "McKinsey Company",
    slug: "mckinsey",
    website: "https://mckinsey.com",
    industry: "Consulting",
    priority: 3,
    status: "positive",
    assignedTo: "vibha",
    notes: "Awaiting final confirmation on profile mix.",
    contacts: [
      {
        name: "Ritu Bose",
        designation: "Office Recruiter",
        email: "ritu@mckinsey.com",
        phone: "+91 9820000051",
        preferredContactMethod: "email",
      },
      {
        name: "Sameer Kapoor",
        designation: "Talent Acquisition Lead",
        email: "sameer.k@mckinsey.com",
        phone: "+91 9820000052",
        preferredContactMethod: "linkedin",
      },
    ],
  },
  {
    name: "HUL",
    slug: "hul",
    website: "https://hul.co.in",
    industry: "FMCG",
    priority: 2,
    status: "not_contacted",
    assignedTo: null,
    notes: "Good fit for management trainee roles.",
    contacts: [
      {
        name: "Rashmi Menon",
        designation: "Campus Programs",
        email: "rashmi.menon@hul.co.in",
        phone: "+91 9820000060",
        preferredContactMethod: "email",
      },
    ],
  },
  {
    name: "Zomato",
    slug: "zomato",
    website: "https://zomato.com",
    industry: "IT",
    priority: 2,
    status: "rejected",
    assignedTo: "rohan",
    notes: "Not hiring in this cycle; revisit in next term.",
    contacts: [
      {
        name: "Ankita Singh",
        designation: "TA Partner",
        email: "ankita@zomato.com",
        phone: "+91 9820000070",
        preferredContactMethod: "phone",
      },
      {
        name: "Rohit Batra",
        designation: "Hiring Operations",
        email: "rohit.batra@zomato.com",
        phone: "+91 9820000071",
        preferredContactMethod: "email",
      },
    ],
  },
  {
    name: "PhonePe",
    slug: "phonepe",
    website: "https://phonepe.com",
    industry: "Finance",
    priority: 2,
    status: "contacted",
    assignedTo: "priya",
    notes: "Follow-up planned for interview slots.",
    contacts: [
      {
        name: "Ashwin Patel",
        designation: "HR Lead",
        email: "ashwin@phonepe.com",
        phone: "+91 9820000072",
        preferredContactMethod: "phone",
      },
      {
        name: "Mihika Shah",
        designation: "University Hiring",
        email: "mihika.shah@phonepe.com",
        phone: "+91 9820000073",
        preferredContactMethod: "email",
      },
      {
        name: "Aman Gupta",
        designation: "Talent Acquisition",
        email: "aman.gupta@phonepe.com",
        phone: "+91 9820000074",
        preferredContactMethod: "linkedin",
      },
    ],
  },
  {
    name: "Tata Consultancy Services",
    slug: "tcs",
    website: "https://tcs.com",
    industry: "IT",
    priority: 2,
    status: "accepted",
    assignedTo: "ananya",
    notes: "Mass recruiter with high participation.",
    contacts: [
      {
        name: "Shalini Iyer",
        designation: "Talent Partner",
        email: "shalini@tcs.com",
        phone: "+91 9820000020",
        preferredContactMethod: "email",
      },
      {
        name: "Pradeep Nair",
        designation: "Recruitment Head",
        email: "pradeep.nair@tcs.com",
        phone: "+91 9820000021",
        preferredContactMethod: "phone",
      },
      {
        name: "Divya Menon",
        designation: "HR Executive",
        email: "divya.menon@tcs.com",
        phone: "+91 9820000022",
        preferredContactMethod: "email",
      },
    ],
  },
  {
    name: "Infosys",
    slug: "infosys",
    website: "https://infosys.com",
    industry: "IT",
    priority: 2,
    status: "positive",
    assignedTo: "vibha",
    notes: "Positive response and role mapping in progress.",
    contacts: [
      {
        name: "Naman Arora",
        designation: "Lead Recruiter",
        email: "naman.arora@infosys.com",
        phone: "+91 9820000080",
        preferredContactMethod: "email",
      },
      {
        name: "Sana Ali",
        designation: "Campus Hiring Manager",
        email: "sana.ali@infosys.com",
        phone: "+91 9820000081",
        preferredContactMethod: "phone",
      },
    ],
  },
  {
    name: "L and T Technology",
    slug: "lnt-tech",
    website: "https://ltts.com",
    industry: "Core Engineering",
    priority: 1,
    status: "not_contacted",
    assignedTo: null,
    notes: "Potential core profile partner.",
    contacts: [
      {
        name: "Kiran Shetty",
        designation: "TA Associate",
        email: "kiran.shetty@ltts.com",
        phone: "+91 9820000090",
        preferredContactMethod: "email",
      },
    ],
  },
  {
    name: "Accenture",
    slug: "accenture",
    website: "https://accenture.com",
    industry: "Consulting",
    priority: 2,
    status: "contacted",
    assignedTo: "rohan",
    notes: "Awaiting callback from leadership hiring team.",
    contacts: [
      {
        name: "Farah Khan",
        designation: "Campus Talent Team",
        email: "farah.khan@accenture.com",
        phone: "+91 9820000100",
        preferredContactMethod: "phone",
      },
      {
        name: "Rakesh Gupta",
        designation: "Hiring Operations",
        email: "rakesh.gupta@accenture.com",
        phone: "+91 9820000101",
        preferredContactMethod: "email",
      },
    ],
  },
  {
    name: "Flipkart",
    slug: "flipkart",
    website: "https://flipkart.com",
    industry: "IT",
    priority: 3,
    status: "positive",
    assignedTo: "vibha",
    notes: "Strong candidate interest expected for product roles.",
    contacts: [
      {
        name: "Sunita Sharma",
        designation: "Recruiter",
        email: "sunita@flipkart.com",
        phone: "+91 9820000060",
        preferredContactMethod: "email",
      },
      {
        name: "Varun Reddy",
        designation: "University Hiring",
        email: "varun.reddy@flipkart.com",
        phone: "+91 9820000061",
        preferredContactMethod: "phone",
      },
      {
        name: "Sushmita Das",
        designation: "Talent Acquisition",
        email: "sushmita.das@flipkart.com",
        phone: "+91 9820000062",
        preferredContactMethod: "linkedin",
      },
    ],
  },
  {
    name: "Mu Sigma",
    slug: "mu-sigma",
    website: "https://mu-sigma.com",
    industry: "Analytics",
    priority: 2,
    status: "not_contacted",
    assignedTo: null,
    notes: "Analytics partner to be reactivated this month.",
    contacts: [
      {
        name: "Anusha Pillai",
        designation: "Hiring Specialist",
        email: "anusha.pillai@mu-sigma.com",
        phone: "+91 9820000110",
        preferredContactMethod: "email",
      },
    ],
  },
];

async function seed() {
  const databaseUrl =
    process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Optionally, use DATABASE_URL_MIGRATIONS to override the seed connection in .env.local."
    );
  }

  const db = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  let totalContacts = 0;

  try {
    const tx = db;
      const usersToUpsert: UserSeed[] = [
        {
          id: ids.admin,
          email: "admin@nexus.local",
          name: "Nexus Admin",
          role: "tpo_admin" as const,
          authProvider: "credentials",
          profileMeta: { passwordHash: hashPassword("Admin@123") },
        },
        {
          id: ids.ananya,
          email: "ananya@nexus.local",
          name: "Ananya Mehta",
          role: "coordinator" as const,
          coordinatorType: "general" as const,
          authProvider: "credentials",
          profileMeta: { passwordHash: hashPassword("Coord@123") },
        },
        {
          id: ids.coordinatorLegacy,
          email: "coordinator@nexus.local",
          name: "General Coordinator",
          role: "coordinator" as const,
          coordinatorType: "general" as const,
          authProvider: "credentials",
          profileMeta: { passwordHash: hashPassword("Coord@123") },
        },
        {
          id: ids.rohan,
          email: "rohan@nexus.local",
          name: "Rohan Sharma",
          role: "coordinator" as const,
          coordinatorType: "general" as const,
          authProvider: "credentials",
          profileMeta: { passwordHash: hashPassword("Coord@123") },
        },
        {
          id: ids.priya,
          email: "priya@nexus.local",
          name: "Priya Singh",
          role: "coordinator" as const,
          coordinatorType: "general" as const,
          authProvider: "credentials",
          profileMeta: { passwordHash: hashPassword("Coord@123") },
        },
        {
          id: ids.vibha,
          email: "vibha@nexus.local",
          name: "Vibha Kapoor",
          role: "coordinator" as const,
          coordinatorType: "general" as const,
          authProvider: "credentials",
          profileMeta: { passwordHash: hashPassword("Coord@123") },
        },
        {
          id: ids.student,
          email: "student@nexus.local",
          name: "Student User",
          role: "student" as const,
          authProvider: "credentials",
          profileMeta: {
            passwordHash: hashPassword("Student@123"),
            branch: "CSE",
            gradYear: 2027,
          },
        },
      ];

      for (const user of usersToUpsert) {
        await tx.user.upsert({
          where: { id: user.id },
          update: {
            email: user.email,
            name: user.name,
            role: user.role,
            coordinatorType: user.coordinatorType,
            authProvider: user.authProvider,
            profileMeta: user.profileMeta as Prisma.InputJsonValue,
            isActive: true,
            updatedAt: new Date(),
          },
          create: {
            ...user,
            profileMeta: user.profileMeta as Prisma.InputJsonValue,
          },
        });
      }

      const permissionId = deterministicUuid("permission:ananya-export");
      const existingPermission = await tx.userPermission.findFirst({
        where: {
          userId: ids.ananya,
          permissionKey: "export_contacts",
        },
      });
      if (existingPermission) {
        await tx.userPermission.update({
          where: { id: existingPermission.id },
          data: {
            isAllowed: true,
            grantedBy: ids.admin,
            grantedAt: new Date(),
          },
        });
      } else {
        await tx.userPermission.create({
          data: {
            id: permissionId,
            userId: ids.ananya,
            permissionKey: "export_contacts",
            isAllowed: true,
            grantedBy: ids.admin,
          },
        });
      }

      const seasonsToUpsert: SeasonSeed[] = [
        {
          id: ids.seasonPlacement,
          name: "Placement 2025-26",
          seasonType: "placement",
          academicYear: "2025-26",
          isActive: true,
          createdBy: ids.admin,
        },
        {
          id: ids.seasonIntern,
          name: "Intern 2026",
          seasonType: "intern",
          academicYear: "2026-27",
          isActive: true,
          createdBy: ids.admin,
        },
      ];

      for (const season of seasonsToUpsert) {
        await tx.recruitmentSeason.upsert({
          where: { id: season.id },
          update: {
            isActive: true,
            updatedAt: new Date(),
          },
          create: season,
        });
      }

      for (let index = 0; index < companiesSeed.length; index += 1) {
        const company = companiesSeed[index];
        const generatedCompanyId = deterministicUuid(`company:${company.slug}`);
        const ownerId = company.assignedTo
          ? coordinatorIdMap[company.assignedTo]
          : null;

        const upsertedCompany = await tx.company.upsert({
          where: { slug: company.slug },
          update: {
            name: company.name,
            domain: websiteToDomain(company.website),
            industry: company.industry,
            website: company.website,
            priority: company.priority,
            notes: company.notes,
            updatedAt: daysAgo(20 - index),
          },
          create: {
            id: generatedCompanyId,
            name: company.name,
            slug: company.slug,
            domain: websiteToDomain(company.website),
            industry: company.industry,
            website: company.website,
            priority: company.priority,
            notes: company.notes,
            createdBy: ids.admin,
            createdAt: daysAgo(180 - index * 4),
            updatedAt: daysAgo(20 - index),
          },
        });

        const companyId = upsertedCompany.id;

        const generatedCycleId = deterministicUuid(
          `cycle:${companyId}:${ids.seasonPlacement}`,
        );
        const upsertedCycle = await tx.companySeasonCycle.upsert({
          where: {
            companyId_seasonId: {
              companyId,
              seasonId: ids.seasonPlacement,
            },
          },
          update: {
            status: company.status,
            ownerUserId: ownerId,
            lastContactedAt:
              company.status === "not_contacted"
                ? null
                : pastDaysAgo(12 - index),
            notes: `${company.status.replace("_", " ")} for ${company.name}`,
            updatedAt: pastDaysAgo(12 - index),
          },
          create: {
            id: generatedCycleId,
            companyId,
            seasonId: ids.seasonPlacement,
            status: company.status,
            ownerUserId: ownerId,
            lastContactedAt:
              company.status === "not_contacted"
                ? null
                : pastDaysAgo(12 - index),
            notes: `${company.status.replace("_", " ")} for ${company.name}`,
            createdAt: daysAgo(120 - index),
            updatedAt: pastDaysAgo(12 - index),
          },
        });

        const cycleId = upsertedCycle.id;

        const path = statusPath(company.status);
        for (let step = 0; step < path.length; step += 1) {
          const toStatus = path[step];
          const fromStatus = step === 0 ? null : path[step - 1];
          const historyId = deterministicUuid(`history:${cycleId}:${step}`);
          await tx.companySeasonStatusHistory.upsert({
            where: { id: historyId },
            update: {
              fromStatus,
              toStatus,
              changedBy: ownerId ?? ids.admin,
              changeNote:
                step === 0
                  ? "Company added to active season"
                  : `Status moved to ${toStatus.replace("_", " ")}`,
            },
            create: {
              id: historyId,
              companySeasonCycleId: cycleId,
              fromStatus,
              toStatus,
              changedBy: ownerId ?? ids.admin,
              changeNote:
                step === 0
                  ? "Company added to active season"
                  : `Status moved to ${toStatus.replace("_", " ")}`,
              changedAt: daysAgo(35 - index + (path.length - step)),
            },
          });
        }

        if (ownerId) {
          const assignmentId = deterministicUuid(`assignment:${companyId}`);
          await tx.companyAssignment.upsert({
            where: { id: assignmentId },
            update: {
              assigneeUserId: ownerId,
              assignedBy: ids.admin,
              notes: "Seeded assignment",
              isActive: true,
              assignedAt: daysAgo(50 - index),
              updatedAt: daysAgo(50 - index),
            },
            create: {
              id: assignmentId,
              itemType: "company",
              itemId: companyId,
              assigneeUserId: ownerId,
              assignedBy: ids.admin,
              notes: "Seeded assignment",
              isActive: true,
              assignedAt: daysAgo(50 - index),
              updatedAt: daysAgo(50 - index),
            },
          });
        }

        for (let contactIndex = 0; contactIndex < company.contacts.length; contactIndex += 1) {
          const contact = company.contacts[contactIndex];
          const contactId = deterministicUuid(
            `contact:${company.slug}:${contactIndex}`,
          );
          await tx.companyContact.upsert({
            where: { id: contactId },
            update: {
              name: contact.name,
              designation: contact.designation,
              emails: [contact.email],
              phones: [contact.phone],
              preferredContactMethod: contact.preferredContactMethod,
              notes: `LinkedIn: linkedin.com/in/${contact.name.toLowerCase().replace(/\s+/g, "")}`,
              lastContactedAt:
                company.status === "not_contacted"
                  ? null
                  : pastDaysAgo(18 - index + contactIndex),
              updatedAt: pastDaysAgo(15 - index + contactIndex),
            },
            create: {
              id: contactId,
              companyId,
              name: contact.name,
              designation: contact.designation,
              emails: [contact.email],
              phones: [contact.phone],
              preferredContactMethod: contact.preferredContactMethod,
              notes: `LinkedIn: linkedin.com/in/${contact.name.toLowerCase().replace(/\s+/g, "")}`,
              lastContactedAt:
                company.status === "not_contacted"
                  ? null
                  : pastDaysAgo(18 - index + contactIndex),
              createdAt: daysAgo(110 - index + contactIndex),
              updatedAt: pastDaysAgo(15 - index + contactIndex),
            },
          });

          if (contactIndex === 0 && company.status !== "not_contacted") {
            const interactionId = deterministicUuid(`interaction:${contactId}`);
            await tx.contactInteraction.upsert({
              where: { id: interactionId },
              update: {
                interactionType: "call",
                outcome: company.status,
                summary: `Follow-up call logged for ${company.name}`,
                nextFollowUpAt:
                  company.status === "accepted" ||
                  company.status === "rejected"
                    ? null
                    : daysAgo(-(4 + index)),
                createdBy: ownerId ?? ids.admin,
              },
              create: {
                id: interactionId,
                companyId,
                contactId,
                companySeasonCycleId: cycleId,
                interactionType: "call",
                outcome: company.status,
                summary: `Follow-up call logged for ${company.name}`,
                nextFollowUpAt:
                  company.status === "accepted" || company.status === "rejected"
                    ? null
                    : daysAgo(-(4 + index)),
                createdBy: ownerId ?? ids.admin,
                createdAt: daysAgo(10 - index),
              },
            });
          }

          totalContacts += 1;
        }
      }

    console.log(`Seeded ${companiesSeed.length} companies and ${totalContacts} contacts.`);

    console.log("Seed completed.");
    console.log("Demo users:");
    console.log("- admin@nexus.local / Admin@123");
    console.log("- coordinator@nexus.local / Coord@123");
    console.log("- ananya@nexus.local / Coord@123");
    console.log("- rohan@nexus.local / Coord@123");
    console.log("- priya@nexus.local / Coord@123");
    console.log("- vibha@nexus.local / Coord@123");
    console.log("- student@nexus.local / Student@123");
  } finally {
    await db.$disconnect();
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
