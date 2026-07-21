"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getAuthCallbackUrl() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return `${origin}/auth/callback?next=/portfolio`;
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host?.includes("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");

  return host
    ? `${protocol}://${host}/auth/callback?next=/portfolio`
    : "/auth/callback?next=/portfolio";
}

function loginUrl(params: { error?: string; message?: string; email?: string }) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  return `/login?${searchParams.toString()}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(loginUrl({ error: error.message, email }));
  }

  redirect("/portfolio");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await getAuthCallbackUrl(),
    },
  });

  if (error) {
    redirect(loginUrl({ error: error.message, email }));
  }

  if (data.session) {
    redirect("/portfolio");
  }

  redirect(loginUrl({
    message: "登録を受け付けました。確認メールを開き、メール内の「メールアドレスを確認」を押してください。届かない場合は迷惑メールをご確認ください。",
    email,
  }));
}

export async function resendConfirmation(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(loginUrl({ error: "確認メールを再送するメールアドレスを入力してください。" }));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: await getAuthCallbackUrl(),
    },
  });

  if (error) {
    redirect(loginUrl({ error: error.message, email }));
  }

  redirect(loginUrl({
    message: "確認メールを再送しました。受信トレイと迷惑メールをご確認ください。メール内の確認リンクを開くとログインできるようになります。",
    email,
  }));
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
