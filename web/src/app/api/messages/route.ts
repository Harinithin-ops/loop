import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize the admin client to bypass Row Level Security (RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, senderId, receiverId, content, userId, otherId } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    if (action === "send") {
      if (!senderId || !receiverId || !content) {
        return NextResponse.json({ error: "Missing senderId, receiverId, or content" }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from("messages")
        .insert({
          senderId,
          receiverId,
          content
        })
        .select()
        .single();

      if (error) {
        console.error("Admin message send failed:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: "Message sent successfully", data });
    }

    if (action === "get") {
      if (!userId || !otherId) {
        return NextResponse.json({ error: "Missing userId or otherId" }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from("messages")
        .select("*")
        .or(`and(senderId.eq.${userId},receiverId.eq.${otherId}),and(senderId.eq.${otherId},receiverId.eq.${userId})`)
        .order("createdAt", { ascending: true });

      if (error) {
        console.error("Admin messages fetch failed:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ messages: data || [] });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Messages API route error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
