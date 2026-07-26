import { db } from './db'
import { supabase } from './supabase'

const TABLES = ['clients', 'projects', 'payments', 'expenses', 'tasks', 'photos']

/* ─────────────────────────────────────────────
   SYNC DOWN  — Supabase → IndexedDB
   Called on login and when coming back online
───────────────────────────────────────────── */
export async function syncDown(userId) {
  if (!navigator.onLine) return false
  try {
    const results = await Promise.all(
      TABLES.map(t => supabase.from(t).select('*').eq('user_id', userId))
    )
    await Promise.all(
      results.map((r, i) => r.data?.length && db[TABLES[i]].bulkPut(r.data))
    )
    // Cache profile too
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', userId).single()
    if (profile) await db.profiles.put(profile)

    return true
  } catch (e) {
    console.warn('[syncDown] failed', e)
    return false
  }
}

/* ─────────────────────────────────────────────
   SYNC UP  — flush pending queue → Supabase
   Called when coming back online
───────────────────────────────────────────── */
export async function flushQueue() {
  if (!navigator.onLine) return 0
  const pending = await db.sync_queue.toArray()
  let synced = 0
  for (const item of pending) {
    try {
      const { table_name, operation, data } = item
      if (operation === 'upsert') {
        await supabase.from(table_name).upsert(data)
      } else if (operation === 'update') {
        const { id, ...rest } = data
        await supabase.from(table_name).update(rest).eq('id', id)
      } else if (operation === 'delete') {
        await supabase.from(table_name).delete().eq('id', data.id)
      }
      await db.sync_queue.delete(item.id)
      synced++
    } catch (e) {
      console.warn('[flushQueue] item failed', item, e)
    }
  }
  return synced
}

/* ─────────────────────────────────────────────
   OFFLINE WRITE HELPERS
   Write to IndexedDB always; write to Supabase
   if online, otherwise queue for later.
───────────────────────────────────────────── */
export async function offlineUpsert(tableName, data) {
  // 1. Write locally immediately (optimistic)
  await db[tableName].put(data)

  if (navigator.onLine) {
    const { error } = await supabase.from(tableName).upsert(data)
    if (error) {
      // Failed — queue it
      await _queue('upsert', tableName, data)
      throw error
    }
  } else {
    await _queue('upsert', tableName, data)
  }
}

export async function offlineUpdate(tableName, id, updates) {
  // 1. Patch local record
  const existing = await db[tableName].get(id)
  if (existing) await db[tableName].put({ ...existing, ...updates, id })

  if (navigator.onLine) {
    const { error } = await supabase.from(tableName).update(updates).eq('id', id)
    if (error) {
      await _queue('update', tableName, { id, ...updates })
      throw error
    }
  } else {
    await _queue('update', tableName, { id, ...updates })
  }
}

export async function offlineDelete(tableName, id) {
  // 1. Remove locally
  await db[tableName].delete(id)

  if (navigator.onLine) {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) {
      await _queue('delete', tableName, { id })
      throw error
    }
  } else {
    await _queue('delete', tableName, { id })
  }
}

export async function offlineInsert(tableName, data) {
  // Ensure a UUID so we can reference it in the queue
  const record = { ...data, id: data.id || crypto.randomUUID() }
  await db[tableName].put(record)

  if (navigator.onLine) {
    const { data: inserted, error } = await supabase.from(tableName).insert(record).select().single()
    if (error) {
      await _queue('upsert', tableName, record)
      return record // return local version
    }
    // Update local with server response (timestamps etc.)
    await db[tableName].put(inserted)
    return inserted
  } else {
    await _queue('upsert', tableName, record)
    return record
  }
}

/* ─────────────────────────────────────────────
   READ WITH CACHE FALLBACK
   Runs the supabaseQuery if online + caches.
   Falls back to IndexedDB query if offline.
───────────────────────────────────────────── */
export async function readOrCache(tableName, supabaseFn, localFn) {
  if (navigator.onLine) {
    try {
      const { data, error } = await supabaseFn()
      if (!error && data) {
        const records = Array.isArray(data) ? data : [data]
        if (records.length) await db[tableName].bulkPut(records)
        return data
      }
    } catch (e) { /* fall through to local */ }
  }
  return localFn()
}

/* ─────────────────────────────────────────────
   PENDING COUNT
───────────────────────────────────────────── */
export async function getPendingCount() {
  return db.sync_queue.count()
}

/* internal */
async function _queue(operation, table_name, data) {
  await db.sync_queue.add({
    table_name,
    operation,
    data,
    created_at: new Date().toISOString(),
  })
}
