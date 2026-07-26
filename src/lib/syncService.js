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
  // Postgres error codes that will NEVER succeed on retry — remove from queue
  const FATAL_CODES = ['23503', '23505', '23502', '42501', '42P01']

  for (const item of pending) {
    try {
      const { table_name, operation, data } = item
      let error = null
      if (operation === 'upsert') {
        ;({ error } = await supabase.from(table_name).upsert(data))
      } else if (operation === 'update') {
        const { id, ...rest } = data
        ;({ error } = await supabase.from(table_name).update(rest).eq('id', id))
      } else if (operation === 'delete') {
        ;({ error } = await supabase.from(table_name).delete().eq('id', data.id))
      }
      if (error) {
        // Non-retryable error — drop from queue so it doesn't block forever
        if (FATAL_CODES.includes(error.code)) {
          console.warn('[flushQueue] fatal error, dropping item', error.code, item)
          await db.sync_queue.delete(item.id)
        } else {
          console.warn('[flushQueue] retryable error, keeping item', error.code, item)
        }
      } else {
        await db.sync_queue.delete(item.id)
        synced++
      }
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

/* ─────────────────────────────────────────────
   FLUSH OFFLINE DOCUMENTS
   Uploads any locally-created documents (storage_path = null)
   to Supabase Storage when back online.
───────────────────────────────────────────── */
export async function flushDocuments(userId) {
  if (!navigator.onLine || !userId) return 0
  let synced = 0
  try {
    const pending = await db.documents
      .where('user_id').equals(userId)
      .filter(d => !d.storage_path)
      .toArray()

    for (const doc of pending) {
      if (!doc.html) continue
      try {
        const timestamp = new Date(doc.created_at).toISOString().replace(/[:.]/g, '-')
        const filename  = `${doc.user_id}/${doc.project_id}/${doc.type}-${timestamp}.html`
        const blob      = new Blob([doc.html], { type: 'text/html;charset=utf-8' })

        const { error: upErr } = await supabase.storage
          .from('documents')
          .upload(filename, blob, { contentType: 'text/html;charset=utf-8', upsert: true })
        if (upErr) { console.warn('[flushDocuments] upload failed', upErr); continue }

        const { data: inserted, error: dbErr } = await supabase
          .from('documents')
          .insert({
            project_id:   doc.project_id,
            user_id:      doc.user_id,
            type:         doc.type,
            name:         doc.name,
            storage_path: filename,
          })
          .select()
          .single()
        if (dbErr) { console.warn('[flushDocuments] db insert failed', dbErr); continue }

        // Replace temp local record with real server record (keep html)
        await db.documents.delete(doc.id)
        await db.documents.put({ ...inserted, html: doc.html })
        synced++
      } catch (e) {
        console.warn('[flushDocuments] item failed', e)
      }
    }
  } catch (e) {
    console.warn('[flushDocuments] failed', e)
  }
  return synced
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
