import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Customer Notification Hub",
  description: "顧客ごとに複数チャット通知を集約するMVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <header className="border-b border-orange-600 bg-orange-500 text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/notifications" className="text-lg font-semibold">
              Customer Notification Hub
            </Link>
            <nav className="flex items-center gap-4 text-sm text-orange-50">
              <Link href="/customers" className="hover:text-white">
                顧客一覧
              </Link>
              <Link href="/notifications" className="hover:text-white">
                通知一覧
              </Link>
              <Link href="/login" className="hover:text-white">
                ログイン
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
