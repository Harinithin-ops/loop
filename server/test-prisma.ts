import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("Testing Prisma connection...");
  try {
    const count = await prisma.user.count();
    console.log("Prisma Connected successfully! Total users count:", count);
  } catch (error) {
    console.error("Prisma Connection Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
