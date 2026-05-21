import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key to bypass RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, senderId, receiverId, requestId } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    if (action === "send") {
      if (!senderId || !receiverId) {
        return NextResponse.json({ error: "Missing senderId or receiverId" }, { status: 400 });
      }

      // Check if a request already exists
      const { data: existing } = await supabaseAdmin
        .from("follow_requests")
        .select("id, status")
        .eq("senderId", senderId)
        .eq("receiverId", receiverId)
        .maybeSingle();

      if (existing) {
        if (existing.status === "pending") {
          return NextResponse.json({ message: "Request already pending", id: existing.id });
        }
        // Update status back to pending (e.g. re-following after unfollow)
        const { error } = await supabaseAdmin
          .from("follow_requests")
          .update({ status: "pending" })
          .eq("id", existing.id);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ message: "Request re-sent", id: existing.id });
      }

      // Insert new follow request
      const { data, error } = await supabaseAdmin
        .from("follow_requests")
        .insert({ senderId, receiverId, status: "pending" })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
      }

      return NextResponse.json({ message: "Follow request sent", id: data.id });
    }

    if (action === "accept") {
      if (!requestId) {
        return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
      }

      // Fetch the original request to get senderId and receiverId
      const { data: request, error: fetchError } = await supabaseAdmin
        .from("follow_requests")
        .select("senderId, receiverId")
        .eq("id", requestId)
        .maybeSingle();

      if (fetchError || !request) {
        return NextResponse.json({ error: "Original follow request not found" }, { status: 404 });
      }

      // 1. Accept the original request
      const { error: acceptError } = await supabaseAdmin
        .from("follow_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (acceptError) {
        return NextResponse.json({ error: acceptError.message }, { status: 500 });
      }

      // 2. Automatically create and accept the reverse request (follow back / mutual access)
      const { data: existingReverse } = await supabaseAdmin
        .from("follow_requests")
        .select("id")
        .eq("senderId", request.receiverId)
        .eq("receiverId", request.senderId)
        .maybeSingle();

      let reverseError = null;
      if (existingReverse) {
        const { error } = await supabaseAdmin
          .from("follow_requests")
          .update({ status: "accepted" })
          .eq("id", existingReverse.id);
        reverseError = error;
      } else {
        const { error } = await supabaseAdmin
          .from("follow_requests")
          .insert({
            senderId: request.receiverId,
            receiverId: request.senderId,
            status: "accepted"
          });
        reverseError = error;
      }

      if (reverseError) {
        console.warn("Could not automatically create mutual follow back request:", reverseError.message);
      }

      return NextResponse.json({ message: "Request accepted and mutual follow established" });
    }

    if (action === "reject") {
      if (!requestId) {
        return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from("follow_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ message: "Request rejected" });
    }

    if (action === "cancel") {
      if (!senderId || !receiverId) {
        return NextResponse.json({ error: "Missing senderId or receiverId" }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from("follow_requests")
        .delete()
        .eq("senderId", senderId)
        .eq("receiverId", receiverId)
        .eq("status", "pending");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ message: "Request cancelled" });
    }

    if (action === "incoming") {
      if (!receiverId) {
        return NextResponse.json({ error: "Missing receiverId" }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from("follow_requests")
        .select("*")
        .eq("receiverId", receiverId)
        .eq("status", "pending")
        .order("createdAt", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ requests: data || [] });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Follow API error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
