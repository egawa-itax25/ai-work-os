import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ key: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { key } = await context.params;
  const auth = await getAuthenticatedClient();

  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await auth.supabase
    .from("workspace_states")
    .select("value, updated_at")
    .eq("user_id", auth.userId)
    .eq("state_key", key)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    value: data?.value ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { key } = await context.params;
  const auth = await getAuthenticatedClient();

  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as { value?: unknown } | null;

  if (!body || !("value" in body)) {
    return NextResponse.json({ error: "value is required" }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();
  const { error } = await auth.supabase.from("workspace_states").upsert({
    user_id: auth.userId,
    state_key: key,
    value: body.value,
    updated_at: updatedAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updatedAt });
}

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "ログインすると端末間で同期できます。" }, { status: 401 }),
    };
  }

  return {
    ok: true as const,
    supabase,
    userId: user.id,
  };
}
