import { signIn, signOut, signUp } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">ログイン</h1>
      <p className="mt-2 text-sm text-slate-600">
        Supabase Authのメール・パスワード認証でMVP画面に入ります。
      </p>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form className="mt-6 space-y-4 rounded-md border border-slate-200 bg-white p-5">
        <label className="block">
          <span className="text-sm font-medium">メールアドレス</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="email"
            type="email"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">パスワード</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="password"
            type="password"
            required
            minLength={6}
          />
        </label>
        <div className="flex gap-3">
          <button
            formAction={signIn}
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            ログイン
          </button>
          <button
            formAction={signUp}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium"
          >
            新規登録
          </button>
          <button
            formAction={signOut}
            className="ml-auto rounded-md px-4 py-2 text-sm text-slate-600"
          >
            ログアウト
          </button>
        </div>
      </form>
    </div>
  );
}
