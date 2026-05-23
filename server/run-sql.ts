import { PrismaClient } from "@prisma/client";

// Using port 5432 for a direct database connection
const url = `postgres://postgres.ztxwiifetmyrfrxphcdb:${encodeURIComponent("12345678")}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
const prisma = new PrismaClient({
  datasources: {
    db: { url }
  }
});

async function run() {
  console.log("Connecting to PostgreSQL directly on port 5432...");
  try {
    // 1. Get columns of the 'messages' table
    console.log("\n--- 'messages' Table Columns ---");
    const columns: any = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'messages'
    `);
    console.log(columns);

    // 2. Get RLS policies of the 'messages' table
    console.log("\n--- 'messages' Table RLS Policies ---");
    const policies: any = await prisma.$queryRawUnsafe(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'messages'
    `);
    console.log(policies);

  } catch (error) {
    console.error("Database SQL execution error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
