import { redirect } from "next/navigation";
import ProjectTaskMap from "./project-task-map";

export const metadata = {
  title: "プロジェクトの仕事マップ",
  description: "プロジェクト単位で仕事の関係を確認します。",
};

type ProjectTaskMapPageProps = {
  params: Promise<{ project: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
};

function safeDecodeProject(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function ProjectTaskMapPage({
  params,
  searchParams,
}: ProjectTaskMapPageProps) {
  const { project } = await params;
  const resolvedSearchParams = await searchParams;
  const view = Array.isArray(resolvedSearchParams.view)
    ? resolvedSearchParams.view[0]
    : resolvedSearchParams.view;

  if (view !== "map") {
    const projectName = safeDecodeProject(project);
    redirect(`/tasks/projects?project=${encodeURIComponent(projectName)}`);
  }

  return <ProjectTaskMap />;
}
