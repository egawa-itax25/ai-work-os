import Link from "next/link";
import { redirect } from "next/navigation";
import { sourceLabel } from "@/lib/sources";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type NotificationRow = {
  id: string;
  customer_id: string | null;
  source: string;
  message: string;
  received_at: string;
  read_at: string | null;
  customers: {
    id: string;
    name: string;
    chatwork_room_id: string | null;
    line_user_id: string | null;
    gmail_address: string | null;
    slack_channel_id: string | null;
    google_chat_space_id: string | null;
    discord_channel_id: string | null;
  } | null;
};

type NotificationGroup = {
  key: string;
  customerId: string | null;
  customerName: string;
  source: string;
  sourceUrl: string;
  count: number;
  latestMessage: string;
  latestReceivedAt: string;
};

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select(
      "id,customer_id,source,message,received_at,read_at,customers(id,name,chatwork_room_id,line_user_id,gmail_address,slack_channel_id,google_chat_space_id,discord_channel_id)",
    )
    .is("read_at", null)
    .order("received_at", { ascending: false })
    .returns<NotificationRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const groups = groupNotifications(notifications ?? []);

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">通知一覧</h1>
          <ViewSwitcher active="notifications" />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          顧客をまたいで、未読通知をサービス別に確認できます。
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">顧客名</th>
              <th className="px-4 py-3">通知数</th>
              <th className="px-4 py-3">通知の内容</th>
              <th className="px-4 py-3">通知元</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map((group) => (
              <tr key={group.key} className="hover:bg-orange-50/40">
                <td className="px-4 py-3 font-medium">
                  {group.customerId ? (
                    <Link
                      className="text-slate-950 underline-offset-2 hover:text-orange-600 hover:underline"
                      href={`/customers/${group.customerId}`}
                    >
                      {group.customerName}
                    </Link>
                  ) : (
                    <span className="text-slate-500">{group.customerName}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded border border-orange-300 bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                    {group.count}件
                  </span>
                </td>
                <td className="max-w-xl px-4 py-3">
                  <div className="line-clamp-2 text-slate-800">
                    {group.latestMessage}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    最新: {formatDate(group.latestReceivedAt)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <a
                    className="rounded bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600"
                    href={group.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {sourceLabel(group.source)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {groups.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            未読通知はありません。
          </div>
        ) : null}
      </div>
    </div>
  );
}

function groupNotifications(rows: NotificationRow[]) {
  const groups = new Map<string, NotificationGroup>();

  for (const row of rows) {
    const customerKey = row.customer_id ?? "unmatched";
    const key = `${customerKey}:${row.source}`;
    const current = groups.get(key);

    if (current) {
      current.count += 1;
      continue;
    }

    groups.set(key, {
      key,
      customerId: row.customer_id,
      customerName: row.customers?.name ?? "未紐づけ",
      source: row.source,
      sourceUrl: sourceUrl(row),
      count: 1,
      latestMessage: row.message,
      latestReceivedAt: row.received_at,
    });
  }

  return [...groups.values()];
}

function sourceUrl(row: NotificationRow) {
  const customer = row.customers;

  if (row.source === "chatwork" && customer?.chatwork_room_id) {
    return `https://www.chatwork.com/#!rid${customer.chatwork_room_id}`;
  }

  if (row.source === "gmail" && customer?.gmail_address) {
    return `https://mail.google.com/mail/u/0/#search/from%3A${encodeURIComponent(
      customer.gmail_address,
    )}`;
  }

  if (row.source === "line") {
    return "https://manager.line.biz/";
  }

  if (row.source === "slack") {
    return "https://app.slack.com/client";
  }

  if (row.source === "google_chat") {
    return "https://mail.google.com/chat/u/0/";
  }

  if (row.source === "discord") {
    return "https://discord.com/channels/@me";
  }

  return "#";
}

function ViewSwitcher({ active }: { active: "customers" | "notifications" }) {
  return (
    <div className="flex rounded-md border border-orange-300 bg-white p-1 text-sm">
      <Link
        href="/notifications"
        className={
          active === "notifications"
            ? "rounded bg-orange-500 px-3 py-1 text-white"
            : "rounded px-3 py-1 text-orange-700 hover:bg-orange-50"
        }
      >
        通知一覧
      </Link>
      <Link
        href="/customers"
        className={
          active === "customers"
            ? "rounded bg-orange-500 px-3 py-1 text-white"
            : "rounded px-3 py-1 text-orange-700 hover:bg-orange-50"
        }
      >
        顧客一覧
      </Link>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
