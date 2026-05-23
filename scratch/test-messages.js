const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://ztxwiifetmyrfrxphcdb.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0eHdpaWZldG15cmZyeHBoY2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE3NTcxNSwiZXhwIjoyMDk0NzUxNzE1fQ.UFKJ2jY7EMiM4GGWm2wJq0d0etO20-M128AXUUMuukI";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function test() {
  console.log("Fetching first row from messages table...");
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error fetching messages:", error.message);
  } else {
    console.log("Successfully fetched:", data);
  }
}

test();
