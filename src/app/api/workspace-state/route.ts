import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type WorkspacePayload = {
  version: 1;
  data: Record<string, string | null>;
};

type WorkspaceRow = {
  state: WorkspacePayload;
  revision: number;
  updated_at: string;
};

const maximumPayloadBytes = 2 * 1024 * 1024;

export async function GET() {
  const clientResult = await getAuthenticatedClient();

  if (clientResult.response) {
    return clientResult.response;
  }

  const { data, error } = await clientResult.supabase
    .from("user_workspace_states")
    .select("state,revision,updated_at")
    .eq("user_id", clientResult.userId)
    .maybeSingle<WorkspaceRow>();

  if (error) {
    return databaseError(error.code);
  }

  return NextResponse.json(
    data
      ? { status: "ready", userId: clientResult.userId, workspace: data }
      : { status: "empty", userId: clientResult.userId },
  );
}

export async function PUT(request: Request) {
  const clientResult = await getAuthenticatedClient();

  if (clientResult.response) {
    return clientResult.response;
  }

  let body: unknown;

  try {
    const text = await request.text();

    if (new TextEncoder().encode(text).byteLength > maximumPayloadBytes) {
      return NextResponse.json({ error: "同期データが大きすぎます。" }, { status: 413 });
    }

    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "同期データの形式が正しくありません。" }, { status: 400 });
  }

  const parsed = parseWriteRequest(body);

  if (!parsed) {
    return NextResponse.json({ error: "同期データの形式が正しくありません。" }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();

  if (parsed.expectedRevision === 0) {
    const { data, error } = await clientResult.supabase
      .from("user_workspace_states")
      .insert({
        user_id: clientResult.userId,
        state: parsed.state,
        revision: 1,
        updated_at: updatedAt,
      })
      .select("state,revision,updated_at")
      .single<WorkspaceRow>();

    if (error?.code === "23505") {
      return conflictResponse(clientResult.supabase, clientResult.userId);
    }

    if (error) {
      return databaseError(error.code);
    }

    return NextResponse.json({ status: "saved", workspace: data });
  }

  const nextRevision = parsed.expectedRevision + 1;
  const { data, error } = await clientResult.supabase
    .from("user_workspace_states")
    .update({
      state: parsed.state,
      revision: nextRevision,
      updated_at: updatedAt,
    })
    .eq("user_id", clientResult.userId)
    .eq("revision", parsed.expectedRevision)
    .select("state,revision,updated_at")
    .maybeSingle<WorkspaceRow>();

  if (error) {
    return databaseError(error.code);
  }

  if (!data) {
    return conflictResponse(clientResult.supabase, clientResult.userId);
  }

  return NextResponse.json({ status: "saved", workspace: data });
}

async function getAuthenticatedClient() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        supabase,
        userId: "",
        response: NextResponse.json({ error: "認証が必要です。" }, { status: 401 }),
      };
    }

    return { supabase, userId: user.id, response: null };
  } catch {
    return {
      supabase: null as never,
      userId: "",
      response: NextResponse.json(
        { error: "同期サービスが設定されていません。" },
        { status: 503 },
      ),
    };
  }
}

async function conflictResponse(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from("user_workspace_states")
    .select("state,revision,updated_at")
    .eq("user_id", userId)
    .maybeSingle<WorkspaceRow>();

  return NextResponse.json(
    { error: "別デバイスで更新されています。", workspace: data ?? null },
    { status: 409 },
  );
}

function databaseError(code?: string) {
  const unavailable = code === "42P01" || code === "PGRST205";

  return NextResponse.json(
    {
      error: unavailable
        ? "同期用データベースが準備されていません。"
        : "同期サービスへ接続できませんでした。",
    },
    { status: unavailable ? 503 : 500 },
  );
}

function parseWriteRequest(value: unknown): {
  state: WorkspacePayload;
  expectedRevision: number;
} | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    state?: unknown;
    expectedRevision?: unknown;
  };

  if (
    !Number.isSafeInteger(candidate.expectedRevision) ||
    Number(candidate.expectedRevision) < 0 ||
    !isWorkspacePayload(candidate.state)
  ) {
    return null;
  }

  return {
    state: candidate.state,
    expectedRevision: Number(candidate.expectedRevision),
  };
}

function isWorkspacePayload(value: unknown): value is WorkspacePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { version?: unknown; data?: unknown };

  if (candidate.version !== 1 || !candidate.data || typeof candidate.data !== "object") {
    return false;
  }

  return Object.entries(candidate.data).every(
    ([key, item]) =>
      key.length <= 160 && (typeof item === "string" || item === null),
  );
}
