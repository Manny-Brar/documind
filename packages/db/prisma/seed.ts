import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";

const prisma = new PrismaClient();

// Simple password hash for development (Better Auth compatible)
// In production, Better Auth handles hashing internally
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(password + salt)
    .digest("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("Seeding database...");

  // Master test user
  const masterEmail = "mannybrar.py@gmail.com";
  const masterPassword = "DocuMind2024!"; // Development password

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: masterEmail },
  });

  if (existingUser) {
    console.log(`Master user ${masterEmail} already exists`);
    return;
  }

  // Create master user
  const user = await prisma.user.create({
    data: {
      email: masterEmail,
      name: "Manny Brar",
      emailVerified: true,
    },
  });

  console.log(`Created user: ${user.email}`);

  // Create email/password account for the user
  // Note: Better Auth expects password in a specific format
  // This creates a credential account that works with email/password login
  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id, // For credential accounts, accountId = userId
      providerId: "credential",
      password: hashPassword(masterPassword),
    },
  });

  console.log(`Created credential account for ${user.email}`);

  // Create default organization
  const org = await prisma.organization.create({
    data: {
      name: "DocuMind Dev",
      slug: "documind-dev",
      planId: "professional",
    },
  });

  console.log(`Created organization: ${org.name}`);

  // Create membership (admin role)
  await prisma.membership.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: "admin",
      status: "active",
      joinedAt: new Date(),
    },
  });

  console.log(`Added ${user.email} as admin of ${org.name}`);

  console.log("\n=== Seed Complete ===");
  console.log(`Master User: ${masterEmail}`);
  console.log(`Password: ${masterPassword}`);
  console.log(`Organization: ${org.name} (${org.slug})`);
  console.log("=====================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
