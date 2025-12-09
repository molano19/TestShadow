import { supabaseAdmin } from "./supabase";
import type { Task as FsTask, Priority } from "./todos";

// Cache whether the optional 'step' column exists in the todos table.
let stepAvailable: boolean | null = null;

async function detectStepColumn() {
  if (stepAvailable !== null) return stepAvailable;
  try {
    const { error } = await supabaseAdmin.from("todos").select("step").limit(1);
    stepAvailable = !error;
  } catch (e) {
    stepAvailable = false;
  }
  return stepAvailable;
}

type Row = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  due?: string | null;
  priority: Priority;
  step?: string | null;
};

function mapRowToTask(r: Row): FsTask {
  return {
    id: r.id,
    title: r.title,
    completed: r.completed,
    createdAt: r.created_at,
    due: r.due ?? undefined,
    priority: r.priority,
    step: r.step ?? undefined,
  };
}

export async function getAll() {
  const hasStep = await detectStepColumn();
  const selectCols = hasStep
    ? "id,title,completed,created_at,due,priority,step"
    : "id,title,completed,created_at,due,priority";

  const { data, error } = await supabaseAdmin
    .from("todos")
    .select(selectCols)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRowToTask as any);
}

export async function getById(id: string) {
  const hasStep = await detectStepColumn();
  const selectCols = hasStep
    ? "id,title,completed,created_at,due,priority,step"
    : "id,title,completed,created_at,due,priority";

  const { data, error } = await supabaseAdmin.from("todos").select(selectCols).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    return mapRowToTask(data as unknown as Row);
}

export async function createTodo({ title, due, priority = "Medium", step }: { title: string; due?: string; priority?: Priority; step?: string; }) {
  const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
  const hasStep = await detectStepColumn();
  const payload: any = {
    id,
    title,
    completed: false,
    created_at: new Date().toISOString(),
    due: due ?? null,
    priority: priority ?? "Medium",
  };

  if (hasStep && step) payload.step = step;

  const selectCols = hasStep
    ? "id,title,completed,created_at,due,priority,step"
    : "id,title,completed,created_at,due,priority";

  const { data, error } = await supabaseAdmin
    .from("todos")
    .insert(payload)
    .select(selectCols)
    .single();
    if (error) throw error;
    return mapRowToTask(data as unknown as Row);
}

export async function updateTodo(id: string, patch: Partial<Pick<FsTask, "title" | "completed" | "due" | "priority" | "step">>) {
  // Map createdAt -> created_at is not needed; we only update provided fields
  const hasStep = await detectStepColumn();
  const dbPatch: any = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.completed !== undefined) dbPatch.completed = patch.completed;
  if (patch.due !== undefined) dbPatch.due = patch.due ?? null;
  if (patch.priority !== undefined) dbPatch.priority = patch.priority;
  if (hasStep && patch.step !== undefined) dbPatch.step = patch.step ?? null;

  console.log("updateTodo - id:", id, "dbPatch:", dbPatch);
  const selectCols = hasStep
    ? "id,title,completed,created_at,due,priority,step"
    : "id,title,completed,created_at,due,priority";
  const { data, error } = await supabaseAdmin
    .from("todos")
    .update(dbPatch)
    .eq("id", id)
    .select(selectCols)
    .maybeSingle();
  console.log("updateTodo - response data:", data, "error:", error);
  if (error) throw error;
    if (!data) return undefined;
    return mapRowToTask(data as unknown as Row);
}

export async function deleteTodo(id: string) {
  console.log("deleteTodo - id:", id);
  const { error, count } = await supabaseAdmin.from("todos").delete().eq("id", id);
  console.log("deleteTodo - response count:", count, "error:", error);
  if (error) throw error;
  // If count is null, Supabase didn't return a count but delete succeeded
  // If count is a number, check if > 0
  // Return true if no error (which means delete succeeded even if count is null)
  return true;
}
