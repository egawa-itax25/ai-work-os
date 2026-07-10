import TrashView from "./trash-view";

export const metadata = {
  title: "削除済み",
  description: "削除したプロジェクトとタスクを30日間保管します。",
};

export default function TrashPage() {
  return <TrashView />;
}
