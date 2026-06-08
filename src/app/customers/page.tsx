import Link from "next/link";
import { redirect } from "next/navigation";
import { sourceLabels } from "@/lib/sources";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Customer = {
  id: string;
  name: string;
  chatwork_room_id: string | null;
  line_user_id: string | null;
  gmail_address: string | null;
  slack_channel_id: string | null;
  google_chat_space_id: string | null;
  discord_channel_id: string | null;
  created_at: string;
  notifications: Array<{ source: string; read_at: string | null }>;
};

const sourceOrder = [
  "chatwork",
  "line",
  "gmail",
  "slack",
  "google_chat",
  "discord",
];

export default async function CustomersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: customers, error } = await supabase
    .from("customers")
    .select(
      "id,name,chatwork_room_id,line_user_id,gmail_address,slack_channel_id,google_chat_space_id,discord_channel_id,created_at,notifications(source,read_at)",
    )
    .order("created_at", { ascending: false })
    .returns<Customer[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">顧客一覧</h1>
          <ViewSwitcher active="customers" />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          顧客ごとに、各サービスから届いた未読通知数を確認できます。
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">顧客名</th>
              <th className="px-4 py-3">未読通知数</th>
              <th className="px-4 py-3">主な連携ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(customers ?? []).map((customer) => {
              const counts = countNotificationsBySource(customer.notifications);

              return (
                <tr key={customer.id} className="hover:bg-orange-50/40">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      className="text-slate-950 underline-offset-2 hover:text-orange-600 hover:underline"
                      href={`/customers/${customer.id}`}
                    >
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {sourceOrder.map((source) => {
                        const count = counts[source] ?? 0;

                        return (
                          <span
                            key={source}
                            className={
                              count > 0
                                ? "rounded border border-orange-300 bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700"
                                : "rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500"
                            }
                          >
                            {sourceLabels[source]}: {count}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div className="grid gap-1">
                      <span>Chatwork: {customer.chatwork_room_id ?? "-"}</span>
                      <span>LINE: {customer.line_user_id ?? "-"}</span>
                      <span>Gmail: {customer.gmail_address ?? "-"}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {customers?.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            顧客がまだ登録されていません。Supabaseでcustomersにレコードを追加してください。
          </div>
        ) : null}
      </div>
    </div>
  );
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

function countNotificationsBySource(
  notifications: Array<{ source: string; read_at: string | null }>,
) {
  return notifications.reduce<Record<string, number>>((counts, notification) => {
    if (!notification.read_at) {
      counts[notification.source] = (counts[notification.source] ?? 0) + 1;
    }

    return counts;
  }, {});
}
