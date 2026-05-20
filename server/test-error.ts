import { PrismaClient } from "@prisma/client";

const url = `postgres://postgres.ztxwiifetmyrfrxphcdb:${encodeURIComponent("12345678")}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`;
const prisma = new PrismaClient({
  datasources: {
    db: { url }
  }
});

async function run() {
  try {
    await prisma.user.count();
  } catch (error: any) {
    console.error("Full Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
