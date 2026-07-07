import TaskProjects from "./task-projects";
import { Suspense } from "react";

export const metadata = {
  title: "プロジェクト別の仕事",
  description: "プロジェクトごとに仕事を確認します。",
};

export default function TaskProjectsPage() {
  return (
    <Suspense fallback={null}>
      <TaskProjects />
    </Suspense>
  );
}
