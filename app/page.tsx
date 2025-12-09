"use client";

import React, { useEffect, useRef, useState } from "react";

type Priority = "Low" | "Medium" | "High";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO
  due?: string; // YYYY-MM-DD
  priority: Priority;
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const titleRef = useRef<HTMLInputElement | null>(null);
  const [due, setDue] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<Priority>("Medium");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Fetch todos from Supabase on mount
  useEffect(() => {
    async function loadTodos() {
      try {
        setError(null);
        const res = await fetch("/api/todos");
        if (!res.ok) throw new Error("failed to load todos");
        const data = await res.json();
        setTasks(data);
      } catch (err) {
        console.error("load todos error:", err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    loadTodos();
  }, []);

  async function addTask(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const title = titleRef.current?.value?.trim();
    if (!title) return;

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, due, priority }),
      });
      if (!res.ok) throw new Error("failed to create todo");
      const newTask = await res.json();
      setTasks((t) => [newTask, ...t]);
      if (titleRef.current) titleRef.current.value = "";
      setDue(undefined);
      setPriority("Medium");
      setError(null);
    } catch (err) {
      console.error("addTask error:", err);
      setError(String(err));
    }
  }

  async function toggleComplete(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (!res.ok) throw new Error("failed to update todo");
      const updated = await res.json();
      setTasks((ts) => ts.map((t) => (t.id === id ? updated : t)));
      setError(null);
    } catch (err) {
      console.error("toggleComplete error:", err);
      setError(String(err));
    }
  }

  async function removeTask(id: string) {
    try {
      const task = tasks.find((t) => t.id === id);
      console.log("removeTask - task to delete:", task);
      console.log("Attempting to delete todo with ID:", id);
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      console.log("DELETE response status:", res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("DELETE response body:", errorText);
        throw new Error(`failed to delete todo (${res.status})`);
      }
      setTasks((ts) => ts.filter((t) => t.id !== id));
      setError(null);
    } catch (err) {
      console.error("removeTask error:", err);
      setError(String(err));
    }
  }

  function startEdit(t: Task) {
    setEditingId(t.id);
    setEditingText(t.title);
  }

  async function saveEdit(id: string) {
    const text = editingText.trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: text }),
      });
      if (!res.ok) throw new Error("failed to update todo");
      const updated = await res.json();
      setTasks((ts) => ts.map((t) => (t.id === id ? updated : t)));
      setEditingId(null);
      setEditingText("");
      setError(null);
    } catch (err) {
      console.error("saveEdit error:", err);
      setError(String(err));
    }
  }

  async function clearCompleted() {
    const completed = tasks.filter((t) => t.completed);
    try {
      for (const t of completed) {
        const res = await fetch(`/api/todos/${t.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("failed to delete todo");
      }
      setTasks((ts) => ts.filter((t) => !t.completed));
      setError(null);
    } catch (err) {
      console.error("clearCompleted error:", err);
      setError(String(err));
    }
  }

  const filtered = tasks.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  }).filter((t) => (query ? t.title.toLowerCase().includes(query.toLowerCase()) : true));

  const remaining = tasks.filter((t) => !t.completed).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-6">
      <main className="w-full max-w-3xl rounded-2xl bg-white dark:bg-zinc-800 shadow-lg p-8">
        {loading && <p className="text-center text-zinc-500">Loading todos...</p>}
        {error && <p className="text-center text-red-600 mb-4">Error: {error}</p>}

        {!loading && (
          <>
            <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">To‑Do List</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">Organize tasks — local, fast, and private.</p>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">{remaining} remaining</div>
        </header>

        <form onSubmit={(e) => addTask(e)} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            ref={titleRef}
            aria-label="New task"
            className="col-span-1 sm:col-span-2 rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-transparent text-zinc-900 dark:text-zinc-50"
            placeholder="Add a task (press Enter to add)"
          />

          <div className="flex gap-2">
            <input
              type="date"
              value={due ?? ""}
              onChange={(e) => setDue(e.target.value || undefined)}
              className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-50"
              aria-label="Due date"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-50"
              aria-label="Priority"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
            <button
              type="submit"
              className="ml-2 rounded-md bg-black text-white px-3 py-1 text-sm hover:bg-zinc-800"
            >
              Add
            </button>
          </div>
        </form>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks"
                className="rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-50"
                aria-label="Search tasks"
              />
              <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-2 py-1 rounded ${filter === "all" ? "bg-zinc-100 dark:bg-zinc-700" : ""}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("active")}
                  className={`px-2 py-1 rounded ${filter === "active" ? "bg-zinc-100 dark:bg-zinc-700" : ""}`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilter("completed")}
                  className={`px-2 py-1 rounded ${filter === "completed" ? "bg-zinc-100 dark:bg-zinc-700" : ""}`}
                >
                  Completed
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTasks((t) => t.map((x) => ({ ...x, completed: true })))}
                className="text-sm text-zinc-600 dark:text-zinc-300 hover:underline"
              >
                Mark all done
              </button>
              <button
                onClick={clearCompleted}
                className="text-sm text-zinc-600 dark:text-zinc-300 hover:underline"
              >
                Clear completed
              </button>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-700">
            {filtered.length === 0 && (
              <li className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No tasks found.</li>
            )}

            {filtered.map((t) => (
              <li key={t.id} className="py-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => toggleComplete(t.id)}
                    className="mt-1 h-4 w-4"
                    aria-label={`Mark ${t.title} completed`}
                  />
                  <div>
                    {editingId === t.id ? (
                      <div className="flex gap-2">
                        <input
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-50"
                        />
                        <button
                          onClick={() => saveEdit(t.id)}
                          className="text-sm bg-black text-white px-2 rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-sm px-2 rounded border border-zinc-200 dark:border-zinc-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className={`text-sm font-medium ${t.completed ? "line-through text-zinc-500" : "text-zinc-900 dark:text-zinc-50"}`}>
                          {t.title}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          <span>Priority: {t.priority}</span>
                          {t.due ? <span className="ml-3">Due: {t.due}</span> : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(t)}
                    className="text-sm text-zinc-600 dark:text-zinc-300 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeTask(t.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
          </>
        )}
      </main>
    </div>
  );
}
