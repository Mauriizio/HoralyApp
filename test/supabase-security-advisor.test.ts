import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"

const migrationPath = "supabase/migrations/202607200002_security_advisor_hardening.sql"

test("migración endurece funciones con search_path seguro y permisos mínimos", async () => {
  const sql = await readFile(migrationPath, "utf8")
  assert.match(sql, /create or replace function public\.set_updated_at\(\)[\s\S]*set search_path = ''/i)
  assert.match(sql, /new\.updated_at = pg_catalog\.now\(\)/i)
  assert.doesNotMatch(sql.match(/create or replace function public\.set_updated_at\(\)[\s\S]*?\$\$;/i)?.[0] ?? "", /security definer/i)
  assert.match(sql, /create or replace function public\.handle_new_user_profile\(\)[\s\S]*security definer[\s\S]*set search_path = ''/i)
  assert.match(sql, /public\.profiles/i)
  assert.match(sql, /pg_catalog\.coalesce/i)
  assert.match(sql, /pg_catalog\.now\(\)/i)
  assert.match(sql, /revoke execute on function public\.handle_new_user_profile\(\) from public;/i)
  assert.match(sql, /revoke execute on function public\.handle_new_user_profile\(\) from anon;/i)
  assert.match(sql, /revoke execute on function public\.handle_new_user_profile\(\) from authenticated;/i)
  assert.match(sql, /grant execute on function public\.handle_new_user_profile\(\) to supabase_auth_admin;/i)
})

test("migración restringe avatars sin listing amplio y conserva bucket público", async () => {
  const sql = await readFile(migrationPath, "utf8")
  assert.match(sql, /drop policy if exists avatars_select_public on storage\.objects;/i)
  assert.match(sql, /create policy avatars_select_own_authenticated[\s\S]*for select[\s\S]*to authenticated/i)
  assert.match(sql, /auth\.uid\(\)::text = \(storage\.foldername\(name\)\)\[1\]/i)
  assert.match(sql, /storage\.allow_any_operation/i)
  assert.doesNotMatch(sql, /create policy avatars_select_public/i)
  assert.match(sql, /values \('avatars', 'avatars', true, 2097152, array\['image\/png','image\/jpeg','image\/webp'\]\)/i)
})

test("migración es idempotente", async () => {
  const sql = await readFile(migrationPath, "utf8")
  assert.match(sql, /create or replace function public\.set_updated_at/i)
  assert.match(sql, /create or replace function public\.handle_new_user_profile/i)
  assert.equal((sql.match(/drop policy if exists avatars_/gi) ?? []).length >= 4, true)
  assert.match(sql, /on conflict \(id\) do update/i)
})

test("documenta leaked password como riesgo aceptado del plan Free", async () => {
  const doc = await readFile("docs/15-supabase-security-advisor.md", "utf8")
  assert.match(doc, /requiere plan Supabase Pro/i)
  assert.match(doc, /plan Free/i)
  assert.match(doc, /riesgo queda aceptado/i)
  assert.match(doc, /activar inmediatamente/i)
})

test("no existen secretos versionados", () => {
  const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  assert.equal(/SERVICE_ROLE|SUPABASE_DB_PASSWORD|postgres:\/\//.test(tracked), false)
})
