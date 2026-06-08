import { createHmac, timingSafeEqual } from "crypto";

export type ChatworkWebhookPayload = {
  webhook_event_type?: string;
  webhook_event?: {
    room_id?: string | number;
    account_id?: string | number;
    from_account_id?: string | number;
    from_account_name?: string;
    body?: string;
    send_time?: string | number;
    message_id?: string;
  };
  room_id?: string | number;
  account_id?: string | number;
  from_account_id?: string | number;
  from_account_name?: string;
  body?: string;
  message?: string;
  send_time?: string | number;
};

export function verifyChatworkSignature({
  body,
  signature,
  token,
}: {
  body: string;
  signature: string | null;
  token: string | undefined;
}) {
  if (!token) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const secret = Buffer.from(token, "base64");
  const expected = createHmac("sha256", secret).update(body).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function normalizeChatworkPayload(payload: ChatworkWebhookPayload) {
  const event = payload.webhook_event ?? payload;
  const senderIdentifier = stringify(
    event.from_account_id ?? event.account_id ?? payload.account_id,
  );
  const roomId = stringify(event.room_id ?? payload.room_id);
  const message = event.body ?? payload.body ?? payload.message ?? "";
  const receivedAt = normalizeTimestamp(event.send_time);

  return {
    roomId,
    senderName: event.from_account_name ?? null,
    senderIdentifier,
    message,
    receivedAt,
  };
}

function stringify(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === "number") {
    return new Date(value * 1000).toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);

    if (Number.isFinite(numeric)) {
      return new Date(numeric * 1000).toISOString();
    }

    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}
