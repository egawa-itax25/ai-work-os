import { createHmac, timingSafeEqual } from "crypto";

export type LineWebhookPayload = {
  events?: Array<{
    type?: string;
    timestamp?: number;
    source?: {
      type?: string;
      userId?: string;
      groupId?: string;
      roomId?: string;
    };
    message?: {
      id?: string;
      type?: string;
      text?: string;
    };
  }>;
};

export function verifyLineSignature({
  body,
  signature,
  channelSecret,
}: {
  body: string;
  signature: string | null;
  channelSecret: string | undefined;
}) {
  if (!channelSecret) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function normalizeLineEvents(payload: LineWebhookPayload) {
  return (payload.events ?? []).map((event) => {
    const senderIdentifier =
      event.source?.userId ?? event.source?.groupId ?? event.source?.roomId ?? null;
    const message =
      event.message?.type === "text"
        ? event.message.text ?? ""
        : `[${event.type ?? "event"}:${event.message?.type ?? "no-message"}]`;

    return {
      lineUserId: event.source?.userId ?? null,
      senderName: null,
      senderIdentifier,
      message,
      receivedAt: event.timestamp
        ? new Date(event.timestamp).toISOString()
        : new Date().toISOString(),
      rawEvent: event,
    };
  });
}
