import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sourceLabel } from "@/lib/sources";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { markNotificationAsRead } from "./actions";

type Customer = {
  id: string;
  name: string;
  chatwork_room_id: string | null;
  line_user_id: string | null;
  gmail_address: string | null;
  slack_channel_id: string | null;
  google_chat_space_id: string | null;
  discord_channel_id: string | null;
};

type Notification = {
  id: string;
  source: string;
  sender_name: string | null;
  sender_identifier: string | null;
  message: string;
  received_at: string;
  created_at: string;
  read_at: string | null;
};

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ order?: string }>;
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: CustomerDetailPageProps) {
  const { id } = await params;
  const { order } = await searchParams;
  const isOldestFirst = order === "oldest";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select(
      "id,name,chatwork_room_id,line_user_id,gmail_address,slack_channel_id,google_chat_space_id,discord_channel_id",
    )
    .eq("id", id)
    .single<Customer>();

  if (customerError || !customer) {
    notFound();
  }

  const { data: notifications, error: notificationsError } = await supabase
    .from("notifications")
    .select(
      "id,source,sender_name,sender_identifier,message,received_at,created_at,read_at",
    )
    .eq("customer_id", id)
    .is("read_at", null)
    .order("received_at", { ascending: isOldestFirst })
    .returns<Notification[]>();

  if (notificationsError) {
    throw new Error(notificationsError.message);
  }

  return (
    <div>
      <Link className="text-sm text-slate-600 hover:text-orange-600" href="/customers">
        顧客一覧へ戻る
      </Link>

      <div className="mt-4 flex flex-col gap-2 border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold">{customer.name}</h1>
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          <Badge label="Chatwork" value={customer.chatwork_room_id} />
          <Badge label="LINE" value={customer.line_user_id} />
          <Badge label="Gmail" value={customer.gmail_address} />
          <Badge label="Slack" value={customer.slack_channel_id} />
          <Badge label="Google Chat" value={customer.google_chat_space_id} />
          <Badge label="Discord" value={customer.discord_channel_id} />
        </div>
      </div>

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">未読通知</h2>
            <p className="mt-1 text-sm text-slate-600">
              既読にすると、この一覧と顧客一覧の件数から消えます。
            </p>
          </div>
          <div className="flex rounded-md border border-slate-300 bg-white p-1 text-sm">
            <Link
              href={`/customers/${customer.id}`}
              className={
                isOldestFirst
                  ? "rounded px-3 py-1 text-slate-600 hover:text-orange-600"
                  : "rounded bg-orange-500 px-3 py-1 text-white"
              }
            >
              新しい順
            </Link>
            <Link
              href={`/customers/${customer.id}?order=oldest`}
              className={
                isOldestFirst
                  ? "rounded bg-orange-500 px-3 py-1 text-white"
                  : "rounded px-3 py-1 text-slate-600 hover:text-orange-600"
              }
            >
              古い順
            </Link>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {(notifications ?? []).map((notification) => (
            <article
              key={notification.id}
              className="rounded-md border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded bg-orange-500 px-2 py-1 font-medium text-white">
                  {sourceLabel(notification.source)}
                </span>
                <span>{formatDate(notification.received_at)}</span>
                <span>
                  {notification.sender_name ??
                    notification.sender_identifier ??
                    "送信者不明"}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                {notification.message}
              </p>
              <form action={markNotificationAsRead} className="mt-4">
                <input
                  type="hidden"
                  name="notification_id"
                  value={notification.id}
                />
                <input type="hidden" name="customer_id" value={customer.id} />
                <button className="rounded-md border border-orange-300 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50">
                  既読にする
                </button>
              </form>
            </article>
          ))}
        </div>

        {notifications?.length === 0 ? (
          <div className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            未読通知はありません。
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string | null }) {
  return (
    <span className="rounded border border-slate-200 bg-white px-2 py-1">
      {label}: {value ?? "-"}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
