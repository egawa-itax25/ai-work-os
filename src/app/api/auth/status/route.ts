import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error && error.name !== "AuthSessionMissingError") {
      return NextResponse.json(
        { configured: true, user: null, error: error.message },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        configured: true,
        user: user ? { id: user.id, email: user.email ?? null } : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        configured: false,
        user: null,
        error: error instanceof Error ? error.message : "Supabase is not configured.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
