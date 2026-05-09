import type { AuthUser, CollectionRow, PetRow } from "./types";

export async function first<T>(statement: D1PreparedStatement) {
  return statement.first<T>();
}

export async function all<T>(statement: D1PreparedStatement) {
  return (await statement.all<T>()).results || [];
}

export function nowIso() {
  return new Date().toISOString();
}

export function petSelect(db: D1Database) {
  return db.prepare(`
    select
      p.*,
      u.handle as owner_handle,
      u.display_name as owner_display_name,
      u.shadowbanned_at as owner_shadowbanned_at
    from pets p
    left join users u on u.id = p.owner_id
  `);
}

export function tags(row: Pick<PetRow, "tags_json">) {
  return parseJsonArray(row.tags_json);
}

export function validationReport(row: Pick<PetRow, "validation_report_json">) {
  return row.validation_report_json ? JSON.parse(row.validation_report_json) : null;
}

export function parseJsonArray(value: string | null | undefined) {
  if (!value) return [];
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed.map(String) : [];
}

export function serializeUser(row: {
  id: string;
  email: string;
  display_name: string;
  handle: string;
  is_admin: number;
  shadowbanned_at: string | null;
  email_verified_at?: string | null;
}): AuthUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    handle: row.handle,
    isAdmin: Boolean(row.is_admin),
    isShadowbanned: Boolean(row.shadowbanned_at),
    emailVerified: Boolean(row.email_verified_at)
  };
}

export function serializeCollection(row: CollectionRow) {
  return {
    slug: row.slug,
    displayName: row.display_name
  };
}
