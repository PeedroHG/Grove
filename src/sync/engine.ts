import { gt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { toCamelCaseKeys, toSnakeCaseKeys } from '@/lib/caseConvert';
import { getSupabaseClient } from '@/lib/supabaseClient';

import { getLastSyncAt, getTableCursor, setLastSyncAt, setTableCursor } from './cursor';
import { SYNCABLE_TABLES } from './tables';

export interface SyncResult {
  pushed: number;
  pulled: number;
  skipped: boolean;
  error?: string;
}

/**
 * Last-write-wins by `updatedAt`, per table, in dependency order (see
 * tables.ts). This is deliberately simple: a single user across a couple of
 * devices rarely produces a genuine conflict, so we don't build CRDT
 * machinery for a case that essentially doesn't happen — see the plan's
 * "Arquitetura geral" section.
 */
export async function runSync(): Promise<SyncResult> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return { pushed: 0, pulled: 0, skipped: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { pushed: 0, pulled: 0, skipped: true, error: 'not_authenticated' };
  }

  let pushed = 0;
  let pulled = 0;

  try {
    for (const { name, table } of SYNCABLE_TABLES) {
      pushed += await pushTable(supabase, name, table, user.id);
    }
    for (const { name, table } of SYNCABLE_TABLES) {
      pulled += await pullTable(supabase, name, table);
    }
    await setLastSyncAt(new Date().toISOString());
    return { pushed, pulled, skipped: false };
  } catch (err) {
    return { pushed, pulled, skipped: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function pushTable(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>>,
  name: string,
  table: (typeof SYNCABLE_TABLES)[number]['table'],
  userId: string,
): Promise<number> {
  const cursor = await getTableCursor(`push:${name}`);
  const rows = cursor
    ? await db.select().from(table).where(gt(table.updatedAt, new Date(cursor)))
    : await db.select().from(table);

  if (rows.length === 0) return 0;

  const payload = rows.map((row) => ({ ...toSnakeCaseKeys(row), user_id: userId }));
  const { error } = await supabase.from(name).upsert(payload, { onConflict: 'id' });
  if (error) throw new Error(`push ${name}: ${error.message}`);

  const latest = rows.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), new Date(0));
  await setTableCursor(`push:${name}`, latest.toISOString());
  return rows.length;
}

async function pullTable(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>>,
  name: string,
  table: (typeof SYNCABLE_TABLES)[number]['table'],
): Promise<number> {
  const cursor = await getTableCursor(`pull:${name}`);
  let query = supabase.from(name).select('*').order('updated_at', { ascending: true });
  if (cursor) query = query.gt('updated_at', cursor);

  const { data, error } = await query;
  if (error) throw new Error(`pull ${name}: ${error.message}`);
  if (!data || data.length === 0) return 0;

  for (const remoteRow of data) {
    const { user_id: _userId, ...rest } = remoteRow as Record<string, unknown> & { user_id?: unknown };
    const localRow = toCamelCaseKeys(rest) as Record<string, unknown>;
    if (typeof localRow.occurredAt === 'string') localRow.occurredAt = new Date(localRow.occurredAt);
    if (typeof localRow.createdAt === 'string') localRow.createdAt = new Date(localRow.createdAt);
    if (typeof localRow.updatedAt === 'string') localRow.updatedAt = new Date(localRow.updatedAt);
    if (typeof localRow.deletedAt === 'string') localRow.deletedAt = new Date(localRow.deletedAt);
    if (typeof localRow.archivedAt === 'string') localRow.archivedAt = new Date(localRow.archivedAt);

    // eslint-disable-next-line no-await-in-loop
    await db
      .insert(table)
      .values(localRow as never)
      .onConflictDoUpdate({
        target: table.id,
        set: localRow as never,
        where: sql`excluded.updated_at > ${table.updatedAt}`,
      });
  }

  const latest = (data[data.length - 1] as { updated_at: string }).updated_at;
  await setTableCursor(`pull:${name}`, latest);
  return data.length;
}

export async function getLastSyncLabel(): Promise<string | null> {
  return getLastSyncAt();
}
