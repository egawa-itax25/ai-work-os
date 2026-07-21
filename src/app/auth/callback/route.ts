import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const emailOtpTypes = new Set<EmailOtpType>([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/portfolio";
}

function loginRedirect(request: NextRequest, messageType: "error" | "message", message: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set(messageType, message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();

  let errorMessage = "";

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    errorMessage = error?.message ?? "";
  } else if (tokenHash && type && emailOtpTypes.has(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    errorMessage = error?.message ?? "";
  } else {
    return loginRedirect(
      request,
      "error",
      "確認リンクが無効です。ログイン画面から確認メールを再送してください。",
    );
  }

  if (errorMessage) {
    return loginRedirect(
      request,
      "error",
      "確認リンクの有効期限が切れているか、すでに使用されています。確認メールを再送して、最新のリンクを開いてください。",
    );
  }

  const destination = request.nextUrl.clone();
  destination.pathname = next;
  destination.search = "";
  return NextResponse.redirect(destination);
}
