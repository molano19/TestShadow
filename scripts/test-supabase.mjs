#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env.local");

// Read .env.local manually
let url, key;
try {
  const content = fs.readFileSync(envPath, "utf-8");
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.startsWith("SUPABASE_URL=")) {
      url = line.split("=")[1].replace(/"/g, "").trim();
    }
    if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
      key = line.split("=")[1].replace(/"/g, "").trim();
    }
  }
} catch (err) {
  console.error("❌ Cannot read .env.local:", err.message);
  process.exit(1);
}

if (!url || !key) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

console.log("✓ URL:", url);
console.log("✓ Key:", key.substring(0, 20) + "...");

const client = createClient(url, key, { auth: { persistSession: false } });

async function test() {
  try {
    console.log("\n📋 Fetching all todos from Supabase...");
    const { data, error } = await client.from("todos").select("*");
    
    if (error) {
      console.error("❌ Error fetching todos:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log("⚠️  No todos found in Supabase table");
      return;
    }

    console.log(`✓ Found ${data.length} todo(s):`);
    data.forEach((todo) => {
      console.log(`  - ID: ${todo.id}`);
      console.log(`    Title: ${todo.title}`);
      console.log(`    Completed: ${todo.completed}`);
      console.log(`    Priority: ${todo.priority}`);
      console.log(`    Created: ${todo.created_at}`);
      console.log("");
    });

    // Try to delete the first one as a test
    if (data.length > 0) {
      const testId = data[0].id;
      console.log(`\n🧪 Testing DELETE on ID: ${testId}`);
      const { error: delError, count } = await client
        .from("todos")
        .delete()
        .eq("id", testId);

      if (delError) {
        console.error("❌ DELETE failed:", delError);
      } else {
        console.log(`✓ DELETE succeeded, deleted ${count} row(s)`);
        console.log("⚠️  (This was a test - the row was actually deleted!)");
      }
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    process.exit(1);
  }
}

test();


