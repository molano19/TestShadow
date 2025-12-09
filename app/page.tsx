"use client";

import React, { useEffect, useRef, useState } from "react";

type Priority = "Low" | "Medium" | "High";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  due?: string;
  priority: Priority;
  step?: string;
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
  const [step, setStep] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingDue, setEditingDue] = useState<string | undefined>(undefined);
  const [editingPriority, setEditingPriority] = useState<Priority>("Medium");
  const [editingStep, setEditingStep] = useState<string | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

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
        body: JSON.stringify({ title, due, priority, step }),
      });
      if (!res.ok) throw new Error("failed to create todo");
      const newTask = await res.json();
      setTasks((t) => [newTask, ...t]);
      if (titleRef.current) titleRef.current.value = "";
      setDue(undefined);
      setPriority("Medium");
      setStep(undefined);
      setShowAddForm(false);
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
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`failed to delete todo`);
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
    setEditingDue(t.due);
    setEditingPriority(t.priority);
    setEditingStep(t.step);
    setExpandedId(t.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText("");
    setEditingDue(undefined);
    setEditingPriority("Medium");
    setEditingStep(undefined);
    setExpandedId(null);
  }

  async function saveEdit(id: string) {
    const text = editingText.trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: text, due: editingDue, priority: editingPriority, step: editingStep }),
      });
      if (!res.ok) throw new Error("failed to update todo");
      const updated = await res.json();
      setTasks((ts) => ts.map((t) => (t.id === id ? updated : t)));
      setEditingId(null);
      setEditingText("");
      setEditingDue(undefined);
      setEditingPriority("Medium");
      setEditingStep(undefined);
      setExpandedId(null);
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

  const priorityColor = (p: Priority) => {
    if (p === "High") return "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-800";
    if (p === "Medium") return "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const SHORT_STEP_LEN = 120;
  const stepPreview = (s?: string) => {
    if (!s) return "";
    if (s.length <= SHORT_STEP_LEN) return s;
    return s.slice(0, SHORT_STEP_LEN).trim() + "…";
  };

  function toggleExpand(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4 sm:p-8">
      <main className="w-full max-w-5xl mx-auto">
        {/* Modern Header */}
        <div className="mb-8 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                My Tasks
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Stay organized and productive</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg">
            <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{remaining}</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">tasks remaining</span>
          </div>
        </div>

        {/* Quick Add Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full mb-6 group relative overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-slate-200/50 dark:border-slate-700/50"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">Add new task</span>
            </div>
          </button>
        )}

        {/* Add Task Form */}
        {showAddForm && (
          <form onSubmit={(e) => addTask(e)} className="mb-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-slate-200/50 dark:border-slate-700/50">
            <div className="space-y-4">
              <div>
                <input
                  ref={titleRef}
                  type="text"
                  className="w-full px-4 py-4 text-lg rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition"
                  placeholder="What needs to be done?"
                  autoFocus
                />
              </div>

              <textarea
                value={step ?? ""}
                onChange={(e) => setStep(e.target.value || undefined)}
                placeholder="Add details, notes, or subtasks..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition resize-none"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={due ?? ""}
                  onChange={(e) => setDue(e.target.value || undefined)}
                  className="px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition"
                />
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-300"
                >
                  Add Task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    if (titleRef.current) titleRef.current.value = "";
                    setDue(undefined);
                    setPriority("Medium");
                    setStep(undefined);
                  }}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50/90 dark:bg-red-900/20 backdrop-blur-sm border-l-4 border-red-500 rounded-xl p-4 shadow-lg">
            <p className="text-red-700 dark:text-red-300 font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Error
            </p>
            <p className="text-red-600 dark:text-red-200 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center border border-slate-200/50 dark:border-slate-700/50">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-600 mb-4"></div>
            <p className="text-slate-600 dark:text-slate-300 font-medium">Loading your tasks...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Search & Filters */}
            <div className="mb-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                
                <div className="flex gap-2">
                  {["all", "active", "completed"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f as typeof filter)}
                      className={`px-5 py-3 rounded-xl font-semibold transition-all ${
                        filter === f
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Task List */}
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-16 text-center border border-slate-200/50 dark:border-slate-700/50">
                  <div className="text-6xl mb-4">✨</div>
                  <p className="text-slate-600 dark:text-slate-300 font-semibold text-xl mb-2">All clear!</p>
                  <p className="text-slate-500 dark:text-slate-400">No tasks found. Time to add a new one or adjust your filters.</p>
                </div>
              ) : (
                filtered.map((t) => (
                  <div
                    key={t.id}
                    className={`group bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border-l-4 ${
                      t.completed
                        ? "border-emerald-500 opacity-60"
                        : t.priority === "High"
                        ? "border-rose-500"
                        : t.priority === "Medium"
                        ? "border-amber-500"
                        : "border-blue-500"
                    } border border-slate-200/50 dark:border-slate-700/50`}
                  >
                    {editingId === t.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(t.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-full px-4 py-3 text-lg rounded-xl border-2 border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                          autoFocus
                        />
                        <textarea
                          value={editingStep ?? ""}
                          onChange={(e) => setEditingStep(e.target.value || undefined)}
                          placeholder="Details..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="date"
                            value={editingDue ?? ""}
                            onChange={(e) => setEditingDue(e.target.value || undefined)}
                            className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                          />
                          <select
                            value={editingPriority}
                            onChange={(e) => setEditingPriority(e.target.value as Priority)}
                            className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                          >
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                          </select>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => saveEdit(t.id)}
                            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => cancelEdit()}
                            className="px-4 py-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4">
                        <label className="flex items-center cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={() => toggleComplete(t.id)}
                            className="sr-only peer"
                          />
                          <div className="w-6 h-6 rounded-lg border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-gradient-to-br peer-checked:from-indigo-600 peer-checked:to-purple-600 peer-checked:border-transparent transition-all flex items-center justify-center">
                            {t.completed && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </label>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-xl font-bold mb-1 ${
                            t.completed
                              ? "line-through text-slate-400 dark:text-slate-500"
                              : "text-slate-900 dark:text-white"
                          }`}>
                            {t.title}
                          </h3>
                          
                          {t.step && (
                            <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                              {expandedId === t.id ? (
                                <>
                                  <p className="whitespace-pre-wrap">{t.step}</p>
                                  {t.step.length > SHORT_STEP_LEN && (
                                    <button onClick={() => toggleExpand(t.id)} className="text-indigo-600 dark:text-indigo-400 font-medium mt-1 hover:underline">
                                      Show less
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <p>{stepPreview(t.step)}</p>
                                  {t.step.length > SHORT_STEP_LEN && (
                                    <button onClick={() => toggleExpand(t.id)} className="text-indigo-600 dark:text-indigo-400 font-medium mt-1 hover:underline">
                                      Show more
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${priorityColor(t.priority)}`}>
                              {t.priority}
                            </span>
                            {t.due && (
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                                isOverdue(t.due) && !t.completed
                                  ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                  : "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                              }`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                {t.due}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(t)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeTask(t.id)}
                            className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-600 dark:text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-20V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
</svg>
</button>
</div>
</div>
)}
</div>
))
)}
</div>
 {/* Actions Footer */}
        {filtered.length > 0 && (
          <div className="mt-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 flex flex-col sm:flex-row justify-between gap-3 border border-slate-200/50 dark:border-slate-700/50">
            <button
              onClick={() => setTasks((t) => t.map((x) => ({ ...x, completed: true })))}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
            >
              Mark all done
            </button>
            <button
              onClick={clearCompleted}
              className="px-5 py-2.5 text-sm font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50 rounded-xl transition"
            >
              Clear completed ({tasks.filter((t) => t.completed).length})
            </button>
          </div>
        )}
      </>
    )}
  </main>
</div>
);
}