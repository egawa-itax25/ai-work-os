import { NextRequest } from "next/server";

export function verifyWebhookSecret(request: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}
