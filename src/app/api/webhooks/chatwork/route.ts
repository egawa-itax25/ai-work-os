import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSecret } from "@/lib/webhooks/auth";
import {
  ChatworkWebhookPayload,
  normalizeChatworkPayload,
  verifyChatworkSignature,
} from "@/lib/webhooks/chatwork";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const chatworkSignature =
    request.headers.get("x-chatworkwebhooksignature") ??
    request.nextUrl.searchParams.get("chatwork_webhook_signature");
  const isVerified = process.env.CHATWORK_WEBHOOK_TOKEN
    ? verifyChatworkSignature({
        body: rawBody,
        signature: chatworkSignature,
        token: process.env.CHATWORK_WEBHOOK_TOKEN,
      })
    : verifyWebhookSecret(request);

  if (!isVerified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as ChatworkWebhookPayload;
  const normalized = normalizeChatworkPayload(payload);
  const supabase = createSupabaseAdminClient();

  const { data: customer } = normalized.roomId
    ? await supabase
        .from("customers")
        .select("id")
        .eq("chatwork_room_id", normalized.roomId)
        .maybeSingle<{ id: string }>()
    : { data: null };

  const { error } = await supabase.from("notifications").insert({
    customer_id: customer?.id ?? null,
    source: "chatwork",
    sender_name: normalized.senderName,
    sender_identifier: normalized.senderIdentifier,
    message: normalized.message,
    received_at: normalized.receivedAt,
    raw_payload: payload,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    customer_id: customer?.id ?? null,
  });
}
