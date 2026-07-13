import TeamAllocationView from "./team-allocation-view";

export const metadata = {
  title: "全体プロジェクト | AI仕事基盤",
  description: "従業員全体のプロジェクトとタスクを俯瞰し、担当割り振りを行います。",
};

export default function TeamPage() {
  return <TeamAllocationView />;
}
