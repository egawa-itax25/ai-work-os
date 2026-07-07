"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Task,
  TaskStatus,
  formatDate,
  initialTasks,
  isOverdue,
  normalizeTasks,
  priorityMeta,
  statusMeta,
  storageKey,
} from "../task-data";

export default function TaskProjects() {
  const searchParams = useSearchParams();
  const projectFilter = searchParams.get("project") ?? "";
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);

    if (saved) {
      setTasks(normalizeTasks(JSON.parse(saved)));
    }
  }, []);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tasks
      .filter((task) => {
        const matchesQuery =
          !normalizedQuery ||
          [task.title, task.description, task.owner, task.project]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesStatus =
          statusFilter === "all" || task.status === statusFilter;
        const matchesProject = !projectFilter || task.project === projectFilter;

        return matchesQuery && matchesStatus && matchesProject;
      })
      .sort((a, b) => {
        const projectDiff = a.project.localeCompare(b.project, "ja-JP");

        if (projectDiff !== 0) {
          return projectDiff;
        }

        const priorityDiff =
          priorityMeta[a.priority].rank - priorityMeta[b.priority].rank;

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [projectFilter, query, statusFilter, tasks]);

  const projectGroups = useMemo(() => {
    const groups = new Map<string, Task[]>();

    for (const task of filteredTasks) {
      const list = groups.get(task.project) ?? [];
      list.push(task);
      groups.set(task.project, list);
    }

    return Array.from(groups.entries()).map(([project, projectTasks]) => ({
      project,
      tasks: projectTasks,
      todo: projectTasks.filter((task) => task.status === "todo").length,
      doing: projectTasks.filter((task) => task.status === "doing").length,
      done: projectTasks.filter((task) => task.status === "done").length,
      overdue: projectTasks.filter(
        (task) => task.status !== "done" && isOverdue(task.dueDate),
      ).length,
    }));
  }, [filteredTasks]);

  return (
    <div className="neo-shell space-y-5 text-zinc-100">
      <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="neo-accent text-sm font-medium">プロジェクト別の仕事</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-white">
            {projectFilter ? `${projectFilter} のタスク` : "プロジェクトごとにタスクを見る"}
          </h1>
          {projectFilter ? (
            <p className="mt-2 text-sm text-zinc-500">
              ポートフォリオで選んだプロジェクトだけを表示しています。
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-3 sm:min-w-96">
          <SummaryTile label="プロジェクト" value={projectGroups.length} />
          <SummaryTile label="タスク" value={filteredTasks.length} />
          <SummaryTile
            label="期限超過"
            value={
              filteredTasks.filter(
                (task) => task.status !== "done" && isOverdue(task.dueDate),
              ).length
            }
            urgent
          />
        </div>
      </section>

      <TaskTabs active="projects" />

      <section className="neo-surface rounded-md border p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="neo-input min-w-0 rounded-md border border-zinc-700 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
            placeholder="プロジェクト、タスク、担当で検索"
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | TaskStatus)
            }
            className="neo-input rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
          >
            <option value="all">すべての状態</option>
            <option value="todo">未着手</option>
            <option value="doing">進行中</option>
            <option value="done">完了</option>
          </select>
          <Link
            href="/tasks"
            className="rounded-md border border-violet-400/40 bg-violet-400/10 px-3 py-2 text-center text-sm font-semibold text-violet-100 hover:bg-violet-400/20"
          >
            マップで見る
          </Link>
        </div>
        {projectFilter ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/tasks/projects"
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              すべてのプロジェクトを表示
            </Link>
            <Link
              href={`/tasks/projects/${encodeURIComponent(projectFilter)}/map`}
              className="rounded-md border border-violet-400/40 bg-violet-400/10 px-3 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-400/20"
            >
              このプロジェクトをマップで見る
            </Link>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        {projectGroups.map((group) => (
          <article
            key={group.project}
            className="neo-surface rounded-md border"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {group.project}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  未着手 {group.todo} / 進行中 {group.doing} / 完了 {group.done}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {group.overdue > 0 ? (
                  <span className="rounded-md border border-red-400/40 bg-red-400/10 px-2 py-1 text-xs font-semibold text-red-200">
                    期限超過 {group.overdue}
                  </span>
                ) : null}
                <span className="rounded-md border border-zinc-700 px-2 py-1 text-xs font-semibold text-zinc-300">
                  {group.tasks.length}件
                </span>
                <Link
                  href={`/tasks/projects/${encodeURIComponent(group.project)}/map`}
                  className="rounded-md border border-violet-400/40 bg-violet-400/10 px-2 py-1 text-xs font-semibold text-violet-100 hover:bg-violet-400/20"
                >
                  マップ
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">タスク</th>
                    <th className="px-4 py-3">状態</th>
                    <th className="px-4 py-3">優先度</th>
                    <th className="px-4 py-3">担当</th>
                    <th className="px-4 py-3">期限</th>
                    <th className="px-4 py-3">関連</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {group.tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-zinc-900/60">
                      <td className="max-w-sm px-4 py-3">
                        <div className="font-medium text-white">{task.title}</div>
                        <div className="mt-1 line-clamp-1 text-xs text-zinc-500">
                          {task.description || "メモなし"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusMeta[task.status].tone}`}
                        >
                          {statusMeta[task.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md border px-2 py-1 text-xs font-semibold ${priorityMeta[task.priority].badge}`}
                        >
                          {priorityMeta[task.priority].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{task.owner}</td>
                      <td
                        className={
                          task.status !== "done" && isOverdue(task.dueDate)
                            ? "px-4 py-3 font-semibold text-red-200"
                            : "px-4 py-3 text-zinc-300"
                        }
                      >
                        {formatDate(task.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {task.links.length}件
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}

        {projectGroups.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-700 px-4 py-10 text-center text-sm text-zinc-500">
            条件に一致するタスクはありません。
          </div>
        ) : null}
      </section>
    </div>
  );
}

function TaskTabs({ active }: { active: "map" | "projects" }) {
  return (
    <div className="neo-surface grid gap-3 rounded-md border p-3 sm:grid-cols-2">
      <Link
        href="/tasks"
        className={`rounded-md border px-5 py-4 text-center text-base font-semibold ${
          active === "map"
            ? "border-violet-400 bg-violet-500/20 text-violet-50 shadow-lg shadow-violet-950/30"
            : "border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white"
        }`}
      >
        全体マップ
      </Link>
      <Link
        href="/tasks/projects"
        className={`rounded-md border px-5 py-4 text-center text-base font-semibold ${
          active === "projects"
            ? "border-violet-400 bg-violet-500/20 text-violet-50 shadow-lg shadow-violet-950/30"
            : "border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white"
        }`}
      >
        プロジェクト一覧
      </Link>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  urgent = false,
}: {
  label: string;
  value: number;
  urgent?: boolean;
}) {
  return (
    <div className="neo-surface rounded-md border p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p
        className={
          urgent
            ? "mt-1 text-2xl font-semibold text-red-300"
            : "mt-1 text-2xl font-semibold text-white"
        }
      >
        {value}
      </p>
    </div>
  );
}


