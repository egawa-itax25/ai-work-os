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
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody) as LineWebhookPayload;
    const events = normalizeLineEvents(payload);

    if (events.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    const isVerified = process.env.LINE_CHANNEL_SECRET
      ? verifyLineSignature({
          body: rawBody,
          signature: request.headers.get("x-line-signature"),
          channelSecret: process.env.LINE_CHANNEL_SECRET,
        })
      : verifyWebhookSecret(request);

    if (!isVerified) {
      console.warn("LINE webhook auth failed", {
        has_line_channel_secret: Boolean(process.env.LINE_CHANNEL_SECRET),
        has_line_signature: Boolean(request.headers.get("x-line-signature")),
        event_count: events.length,
      });

      return NextResponse.json(
        {
          error: "Unauthorized",
          has_line_channel_secret: Boolean(process.env.LINE_CHANNEL_SECRET),
          has_line_signature: Boolean(request.headers.get("x-line-signature")),
        },
        { status: 401 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const lineUserIds = [
      ...new Set(
        events
          .map((event) => event.lineUserId)
          .filter((lineUserId): lineUserId is string => Boolean(lineUserId)),
      ),
    ];
    const { data: customers, error: customersError } =
      lineUserIds.length > 0
        ? await supabase
            .from("customers")
            .select("id,line_user_id")
            .in("line_user_id", lineUserIds)
            .returns<Array<{ id: string; line_user_id: string }>>()
        : { data: [], error: null };

    if (customersError) {
      console.error("LINE webhook customer lookup failed", customersError);

      return NextResponse.json({ error: customersError.message }, { status: 500 });
    }

    const customerByLineUserId = new Map(
      (customers ?? []).map((customer) => [customer.line_user_id, customer.id]),
    );

    const rows = events.map((event) => ({
      customer_id: event.lineUserId
        ? customerByLineUserId.get(event.lineUserId) ?? null
        : null,
      source: "line",
      sender_name: event.senderName,
      sender_identifier: event.senderIdentifier,
      message: event.message,
      received_at: event.receivedAt,
      raw_payload: event.rawEvent,
    }));

    const { error } = await supabase.from("notifications").insert(rows);

    if (error) {
      console.error("LINE webhook notification insert failed", {
        error,
        row_count: rows.length,
        sample: rows[0],
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inserted: events.length });
  } catch (error) {
    console.error("LINE webhook unexpected failure", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
