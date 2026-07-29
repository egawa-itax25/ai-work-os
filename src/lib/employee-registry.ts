export type WorkspaceEmployee = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export const employeeStorageKey = "ai-work-os-employees:v1";
export const employeeRemoteStorageKey = "workspace-employees-v1";

const excludedPeople = new Set(["顧客", "AI", "なし", "未設定", "人事チーム"]);

export function normalizeEmployeeRegistry(value: unknown): WorkspaceEmployee[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<WorkspaceEmployee>;
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    if (!name || excludedPeople.has(name) || seen.has(name)) return [];
    seen.add(name);
    const now = new Date().toISOString();
    return [{
      id: typeof candidate.id === "string" && candidate.id
        ? candidate.id
        : `employee-${name}`,
      name,
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    }];
  });
}

export function mergeEmployeeRegistries(
  current: WorkspaceEmployee[],
  incoming: WorkspaceEmployee[],
): WorkspaceEmployee[] {
  const currentById = new Map(current.map((employee) => [employee.id, employee]));
  const incomingIds = new Set(incoming.map((employee) => employee.id));
  const merged = incoming.map((employee) => {
    const existing = currentById.get(employee.id);
    return existing && existing.updatedAt > employee.updatedAt ? existing : employee;
  });

  for (const employee of current) {
    if (!incomingIds.has(employee.id)) merged.push(employee);
  }

  return merged;
}

export function employeeNamesFromTasks(
  tasks: Array<{ owner?: string; currentBallHolder?: string }>,
): string[] {
  const names = new Set<string>();
  for (const task of tasks) {
    for (const candidate of [task.owner, task.currentBallHolder]) {
      const name = candidate?.trim();
      if (name && !excludedPeople.has(name)) names.add(name);
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, "ja"));
}

export function orderedEmployeeNames(
  employees: WorkspaceEmployee[],
  tasks: Array<{ owner?: string; currentBallHolder?: string }>,
): string[] {
  const registered = employees.map((employee) => employee.name);
  const registeredSet = new Set(registered);
  const taskOnly = employeeNamesFromTasks(tasks).filter((name) => !registeredSet.has(name));
  return [...registered, ...taskOnly];
}
