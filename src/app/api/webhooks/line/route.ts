import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSecret } from "@/lib/webhooks/auth";
import {
  LineWebhookPayload,
  normalizeLineEvents,
  verifyLineSignature,
} from "@/lib/webhooks/line";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const isVerified = process.env.LINE_CHANNEL_SECRET
    ? verifyLineSignature({
        body: rawBody,
        signature: request.headers.get("x-line-signature"),
        channelSecret: process.env.LINE_CHANNEL_SECRET,
      })
    : verifyWebhookSecret(request);

  if (!isVerified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as LineWebhookPayload;
  const events = normalizeLineEvents(payload);

  if (events.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  const supabase = createSupabaseAdminClient();
  const lineUserIds = [...new Set(events.map((event) => event.lineUserId).filter(Boolean))];
  const { data: customers, error: customersError } =
    lineUserIds.length > 0
      ? await supabase
          .from("customers")
          .select("id,line_user_id")
          .in("line_user_id", lineUserIds)
          .returns<Array<{ id: string; line_user_id: string }>>()
      : { data: [], error: null };

  if (customersError) {
    return NextResponse.json({ error: customersError.message }, { status: 500 });
  }

  const customerByLineUserId = new Map(
    (customers ?? []).map((customer) => [customer.line_user_id, customer.id]),
  );

  const { error } = await supabase.from("notifications").insert(
    events.map((event) => ({
      customer_id: event.lineUserId
        ? customerByLineUserId.get(event.lineUserId) ?? null
        : null,
      source: "line",
      sender_name: event.senderName,
      sender_identifier: event.senderIdentifier,
      message: event.message,
      received_at: event.receivedAt,
      raw_payload: event.rawEvent,
    })),
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: events.length });
}
