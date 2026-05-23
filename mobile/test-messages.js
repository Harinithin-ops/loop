const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://ztxwiifetmyrfrxphcdb.supabase.co";
const supabaseAnonKey = "sb_publishable_8j0CdyiwRHhjKixxsFqdSQ_EEws6LgD";

// Using the public Anon Key to simulate direct client-side (app-side) Supabase calls
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const testId = "test-" + Math.random().toString(36).substring(2, 9);
  console.log("Testing direct insert into messages table with Anon Key...");
  const { data, error } = await supabase
    .from("messages")
    .insert({
      id: "b2c3d4e5-f6a7-8901-abcd-" + Math.random().toString(16).substring(2, 14),
      senderId: "2984b9ef-a82d-452b-a48f-2a79a7221a54",
      receiverId: "d5d53324-6d53-4d7a-a581-e252c4242259",
      content: `Direct Client Insert Test - ${new Date().toISOString()}`
    })
    .select();

  if (error) {
    console.error("Direct insert failed:", error.message);
  } else {
    console.log("Direct insert successful:", data);
  }
}

test();
