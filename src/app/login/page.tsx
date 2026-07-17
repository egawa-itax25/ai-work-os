import { signIn, signOut, signUp } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

function getErrorMessage(error?: string) {
  if (!error) {
    return "";
  }

  const lower = error.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが違います。初めて使う場合は「新規登録」を押してください。";
  }

  if (lower.includes("already registered") || lower.includes("user already registered")) {
    return "このメールアドレスは登録済みです。「ログイン」を押してください。";
  }

  return error;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message } = await searchParams;
  const errorMessage = getErrorMessage(error);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-2xl items-center px-5 py-8">
      <section className="w-full rounded-2xl border border-white/12 bg-slate-950/88 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
        <div>
          <p className="text-sm font-semibold text-sky-200">同期アカウント</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">ログイン</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            同じメールアドレスでログインすると、PC・スマホ・別PCでプロジェクトとタスクを同期できます。
            初めて使う場合はメールアドレスとパスワードを入力して「新規登録」を押してください。
          </p>
        </div>

        {message ? (
          <div className="mt-5 rounded-xl border border-sky-200/25 bg-sky-200/10 px-4 py-3 text-sm font-semibold leading-6 text-sky-50">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-5 rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm font-semibold leading-6 text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <form className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-200">メールアドレス</span>
            <input
              className="mt-2 w-full rounded-xl border border-white/12 bg-slate-900 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-sky-200/70 focus:ring-2 focus:ring-sky-200/15"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-200">パスワード</span>
            <input
              className="mt-2 w-full rounded-xl border border-white/12 bg-slate-900 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-sky-200/70 focus:ring-2 focus:ring-sky-200/15"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              placeholder="6文字以上"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              formAction={signIn}
              className="rounded-xl border border-sky-200/40 bg-sky-200/12 px-5 py-3 text-sm font-semibold text-sky-50 transition hover:bg-sky-200/18"
            >
              ログイン
            </button>
            <button
              formAction={signUp}
              className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
            >
              新規登録
            </button>
          </div>

          <button
            formAction={signOut}
            className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200"
          >
            ログアウト
          </button>
        </form>
      </section>
    </main>
  );
}
