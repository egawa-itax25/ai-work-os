import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI仕事基盤",
  description: "知識庫を基盤にした、仕事の流れを動かすAI仕事基盤。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <WorkspaceShell>{children}</WorkspaceShell>
    </html>
  );
}
