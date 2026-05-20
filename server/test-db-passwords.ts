import { PrismaClient } from "@prisma/client";

const host = "aws-0-us-east-1.pooler.supabase.com";
const user = "postgres.ztxwiifetmyrfrxphcdb";
const dbname = "postgres";

const passwords = [
  "12345678",
  "kanishkaaaj2006",
  "harinithin007",
  "nithin",
  "kanishka",
  "hari__nithin",
  "admin",
  "admin123",
  "admin1234",
  "Password123",
  "Password123!",
  "nithin123",
  "nithin2006",
  "nithin@2006",
  "Nithin@2006",
  "Nithin123",
  "Kan_06",
  "Kani_06"
];

async function tryPassword(password: string): Promise<boolean> {
  const url = `postgres://${user}:${encodeURIComponent(password)}@${host}:6543/${dbname}?pgbouncer=true&connection_limit=1`;
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });

  try {
    // Try to perform a query with a short timeout
    const count = await prisma.user.count();
    console.log(`\n🎉 SUCCESS! Database connected with password: ${password}. User count: ${count}`);
    await prisma.$disconnect();
    return true;
  } catch (error: any) {
    console.log(`Failed with password: ${password} (${error.message.substring(0, 100).replace(/\n/g, ' ')})`);
    await prisma.$disconnect();
    return false;
  }
}

async function run() {
  for (const password of passwords) {
    const success = await tryPassword(password);
    if (success) {
      return;
    }
  }
  console.log("\n❌ All database password attempts failed.");
}

run();
