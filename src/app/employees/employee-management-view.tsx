"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  employeeNamesFromTasks,
  employeeRemoteStorageKey,
  employeeStorageKey,
  normalizeEmployeeRegistry,
  type WorkspaceEmployee,
} from "@/lib/employee-registry";
import { loadSyncedState, saveSyncedState } from "@/lib/synced-storage";
import {
  normalizeTaskList,
  remoteStorageKey as taskRemoteStorageKey,
  storageKey as taskStorageKey,
  type Task,
} from "../tasks/task-data";

export default function EmployeeManagementView() {
  const [employees, setEmployees] = useState<WorkspaceEmployee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [message, setMessage] = useState("従業員の並び順は全体プロジェクトにも反映されます。");
  useEffect(() => {
    let cancelled = false;

    async function loadRegistry() {
      let loadedEmployees: WorkspaceEmployee[] = [];
      let loadedTasks: Task[] = [];

      await Promise.all([
        loadSyncedState({
          localKey: employeeStorageKey,
          remoteKey: employeeRemoteStorageKey,
          fallback: [],
          normalize: normalizeEmployeeRegistry,
          onValue: (value) => {
            loadedEmployees = value;
            if (!cancelled) setEmployees(value);
          },
        }),
        loadSyncedState({
          localKey: taskStorageKey,
          remoteKey: taskRemoteStorageKey,
          fallback: [],
          normalize: normalizeTaskList,
          onValue: (value) => {
            loadedTasks = value;
            if (!cancelled) setTasks(value);
          },
        }),
      ]);

      if (cancelled || loadedEmployees.length > 0) return;
      const detected = employeeNamesFromTasks(loadedTasks);
      if (detected.length === 0) return;
      const now = new Date().toISOString();
      const migrated = detected.map((employeeName, index) => ({
        id: `employee-migrated-${index}-${employeeName}`,
        name: employeeName,
        createdAt: now,
        updatedAt: now,
      }));
      setEmployees(migrated);
      await saveSyncedState(employeeStorageKey, employeeRemoteStorageKey, migrated);
      if (!cancelled) {
        setMessage("既存タスクの担当者を従業員リストへ引き継ぎました。");
      }
    }

    void loadRegistry();
    return () => {
      cancelled = true;
    };
  }, []);

  const taskCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      for (const employeeName of new Set([task.owner, task.currentBallHolder])) {
        if (employeeName) counts.set(employeeName, (counts.get(employeeName) ?? 0) + 1);
      }
    }
    return counts;
  }, [tasks]);

  function commitEmployees(nextEmployees: WorkspaceEmployee[]) {
    setEmployees(nextEmployees);
    void saveSyncedState(employeeStorageKey, employeeRemoteStorageKey, nextEmployees);
  }

  function addEmployee() {
    const nextName = name.trim();
    if (!nextName) {
      setMessage("名前を入力してください。");
      return;
    }
    if (employees.some((employee) => employee.name === nextName)) {
      setMessage("同じ名前の従業員が既に登録されています。");
      return;
    }
    const now = new Date().toISOString();
    commitEmployees([
      ...employees,
      {
        id: `employee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: nextName,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setName("");
    setMessage(`${nextName}さんを登録しました。`);
  }

  function beginEdit(employee: WorkspaceEmployee) {
    setEditingId(employee.id);
    setEditingName(employee.name);
  }

  function saveEdit(employee: WorkspaceEmployee) {
    const nextName = editingName.trim();
    if (!nextName || nextName === employee.name) {
      setEditingId(null);
      return;
    }
    if (employees.some((item) => item.id !== employee.id && item.name === nextName)) {
      setMessage("同じ名前の従業員が既に登録されています。");
      return;
    }
    const nextEmployees = employees.map((item) => item.id === employee.id
      ? { ...item, name: nextName, updatedAt: new Date().toISOString() }
      : item);
    const nextTasks = tasks.map((task) => ({
      ...task,
      owner: task.owner === employee.name ? nextName : task.owner,
      currentBallHolder: task.currentBallHolder === employee.name ? nextName : task.currentBallHolder,
    }));
    commitEmployees(nextEmployees);
    setTasks(nextTasks);
    void saveSyncedState(taskStorageKey, taskRemoteStorageKey, nextTasks);
    setEditingId(null);
    setMessage(`${employee.name}さんの名前を変更し、担当タスクにも反映しました。`);
  }

  function removeEmployee(employee: WorkspaceEmployee) {
    const count = taskCounts.get(employee.name) ?? 0;
    if (count > 0) {
      setMessage(`${employee.name}さんには${count}件のタスクがあります。先に担当を変更してください。`);
      return;
    }
    if (!window.confirm(`${employee.name}さんを従業員リストから削除しますか？`)) return;
    commitEmployees(employees.filter((item) => item.id !== employee.id));
    setMessage(`${employee.name}さんを削除しました。`);
  }

  function moveEmployee(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const sourceIndex = employees.findIndex((employee) => employee.id === sourceId);
    const targetIndex = employees.findIndex((employee) => employee.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...employees];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    commitEmployees(next);
    setMessage("並び順を更新しました。");
  }

  function onDrop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    if (draggedId) moveEmployee(draggedId, targetId);
    setDraggedId(null);
  }

  return (
    <main className="employee-page">
      <header className="employee-header">
        <div>
          <p className="employee-eyebrow">従業員管理</p>
          <h1>従業員リスト</h1>
          <p>タスクがない従業員も登録しておくと、全体プロジェクトに常に表示されます。</p>
        </div>
        <div className="employee-count"><span>登録人数</span><strong>{employees.length}人</strong></div>
      </header>

      <section className="employee-panel">
        <div className="employee-add">
          <label htmlFor="employee-name">従業員名</label>
          <div>
            <input
              id="employee-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addEmployee();
              }}
              placeholder="例：山田 太郎"
            />
            <button type="button" onClick={addEmployee}>追加</button>
          </div>
        </div>
        <p className="employee-message" aria-live="polite">{message}</p>

        <div className="employee-list">
          {employees.map((employee, index) => {
            const count = taskCounts.get(employee.name) ?? 0;
            return (
              <div
                className={`employee-row${draggedId === employee.id ? " is-dragging" : ""}`}
                key={employee.id}
                draggable
                onDragStart={() => setDraggedId(employee.id)}
                onDragEnd={() => setDraggedId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDrop(event, employee.id)}
              >
                <span className="employee-grip" title="ドラッグして並び替え">⠿</span>
                <span className="employee-order">{String(index + 1).padStart(2, "0")}</span>
                <div className="employee-name">
                  {editingId === employee.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onBlur={() => saveEdit(employee)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") saveEdit(employee);
                        if (event.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <button type="button" onDoubleClick={() => beginEdit(employee)} onClick={() => beginEdit(employee)}>
                      {employee.name}
                    </button>
                  )}
                </div>
                <span className="employee-task-count">{count}件のタスク</span>
                <div className="employee-actions">
                  <button type="button" onClick={() => beginEdit(employee)}>編集</button>
                  <button type="button" className="danger" onClick={() => removeEmployee(employee)}>削除</button>
                </div>
              </div>
            );
          })}
          {employees.length === 0 && (
            <div className="employee-empty">従業員はまだ登録されていません。</div>
          )}
        </div>
      </section>

      <style jsx>{`
        .employee-page { min-height: 100vh; padding: 28px; color: #edf5ff; background: #0b1320; }
        .employee-header { display: flex; justify-content: space-between; gap: 24px; align-items: end; max-width: 1100px; margin: 0 auto 20px; }
        .employee-eyebrow { margin: 0 0 6px; color: #8fdaf0; font-size: 12px; }
        h1 { margin: 0; font-size: 30px; letter-spacing: 0; }
        .employee-header p:last-child { margin: 8px 0 0; color: #9aaabd; line-height: 1.7; }
        .employee-count { min-width: 140px; padding: 16px; border: 1px solid #2a3a4e; background: #111b2a; }
        .employee-count span { display: block; color: #8191a6; font-size: 12px; }
        .employee-count strong { display: block; margin-top: 5px; font-size: 22px; }
        .employee-panel { max-width: 1100px; margin: 0 auto; border: 1px solid #2a3a4e; background: #0e1725; }
        .employee-add { padding: 20px; border-bottom: 1px solid #233246; }
        .employee-add label { display: block; margin-bottom: 8px; color: #aebcce; font-size: 13px; }
        .employee-add > div { display: grid; grid-template-columns: 1fr 100px; gap: 10px; }
        input { min-width: 0; padding: 12px 14px; border: 1px solid #344961; background: #09111e; color: #f5f8fc; font: inherit; outline: none; }
        input:focus { border-color: #8ac9e5; box-shadow: 0 0 0 2px #8ac9e522; }
        button { border: 1px solid #344961; background: #142136; color: #edf5ff; padding: 10px 14px; font: inherit; cursor: pointer; }
        button:hover { border-color: #79b9d8; background: #192a42; }
        .employee-message { margin: 0; padding: 12px 20px; color: #9fb4c9; background: #101b2a; font-size: 13px; }
        .employee-list { padding: 8px; }
        .employee-row { display: grid; grid-template-columns: 34px 46px minmax(180px, 1fr) 130px auto; gap: 10px; align-items: center; min-height: 64px; padding: 8px 10px; border-bottom: 1px solid #202e40; transition: background 180ms, opacity 180ms; }
        .employee-row:hover { background: #142033; }
        .employee-row.is-dragging { opacity: .45; }
        .employee-grip { color: #6f8196; cursor: grab; text-align: center; font-size: 20px; }
        .employee-order { color: #718198; font-variant-numeric: tabular-nums; }
        .employee-name button { width: 100%; border: 0; background: transparent; padding: 10px 0; text-align: left; font-weight: 700; }
        .employee-name input { width: 100%; }
        .employee-task-count { color: #91a3b8; font-size: 13px; }
        .employee-actions { display: flex; gap: 8px; }
        .employee-actions .danger { border-color: #693747; color: #ffabb5; background: #281724; }
        .employee-empty { padding: 56px 20px; text-align: center; color: #8191a6; }
        @media (max-width: 720px) {
          .employee-page { padding: 16px; }
          .employee-header { align-items: stretch; flex-direction: column; }
          .employee-count { min-width: 0; }
          .employee-row { grid-template-columns: 30px 36px 1fr auto; }
          .employee-task-count { grid-column: 3; }
          .employee-actions { grid-column: 4; grid-row: 1 / span 2; flex-direction: column; }
        }
      `}</style>
    </main>
  );
}
