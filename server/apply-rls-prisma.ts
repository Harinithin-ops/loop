import { PrismaClient } from "@prisma/client";

// Using port 6543 (Pooled connection which bypasses local port 5432 blocks)
const url = `postgres://postgres.ztxwiifetmyrfrxphcdb:${encodeURIComponent("12345678")}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`;
const prisma = new PrismaClient({
  datasources: {
    db: { url }
  }
});

async function run() {
  console.log("Connecting to PostgreSQL pooled connection on port 6543...");
  try {
    // 1. Enable RLS on public.messages
    console.log("Enabling RLS on public.messages...");
    await prisma.$executeRawUnsafe(`ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;`);

    // 2. Drop existing conflicting policies
    console.log("Dropping existing policies on public.messages...");
    const policiesToDrop = [
      "Allow users to read their own messages",
      "Allow users to send messages",
      "Allow receivers to update messages",
      "Users can view their messages",
      "Users can send messages",
      "Receivers can mark as read",
      "Allow anyone to view messages",
      "Allow anyone to send messages",
      "Allow anyone to update messages"
    ];
    for (const p of policiesToDrop) {
      try {
        await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${p}" ON public.messages;`);
      } catch (err: any) {
        console.warn(`Could not drop policy "${p}":`, err.message);
      }
    }

    // 3. Create permissive policies for public.messages
    console.log("Creating public access policies for public.messages...");
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow anyone to view messages"
        ON public.messages FOR SELECT
        TO public
        USING (true);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow anyone to send messages"
        ON public.messages FOR INSERT
        TO public
        WITH CHECK (true);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Allow anyone to update messages"
        ON public.messages FOR UPDATE
        TO public
        USING (true);
    `);

    console.log("✅ RLS policies for messages table successfully updated!");

    // 4. Verify columns in 'messages' table
    console.log("\nVerifying database 'messages' columns:");
    const columns: any = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
    `);
    console.log(columns);

  } catch (error: any) {
    console.error("❌ SQL execution error:", error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
