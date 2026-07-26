import { supabase } from './supabase'
import { db } from './db'

/**
 * Upload an HTML document to Supabase Storage, save a DB record, and cache locally for offline.
 */
export async function saveDocument({ html, projectId, userId, type, name }) {
  // Always cache locally first (works offline too)
  const localId = crypto.randomUUID()
  const localDoc = {
    id: localId,
    project_id: projectId,
    user_id: userId,
    type,
    name,
    storage_path: null,
    html,
    created_at: new Date().toISOString(),
  }
  await db.documents.put(localDoc)

  // If offline, return local record
  if (!navigator.onLine) return localDoc

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename  = `${userId}/${projectId}/${type}-${timestamp}.html`
    const blob      = new Blob([html], { type: 'text/html;charset=utf-8' })

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filename, blob, { contentType: 'text/html;charset=utf-8', upsert: false })

    if (uploadError) {
      console.error('[saveDocument] upload failed:', uploadError)
      return localDoc
    }

    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({ project_id: projectId, user_id: userId, type, name, storage_path: filename })
      .select()
      .single()

    if (dbError) {
      console.error('[saveDocument] db insert failed:', dbError)
      return localDoc
    }

    // Replace temp local record with real server record (keep html for offline)
    await db.documents.delete(localId)
    await db.documents.put({ ...data, html })

    return data
  } catch (e) {
    console.error('[saveDocument] error:', e)
    return localDoc
  }
}

/**
 * Load all documents for a project.
 * Online: fetch from Supabase and sync cache.
 * Offline: read from IndexedDB.
 */
export async function getProjectDocuments(projectId) {
  if (!navigator.onLine) {
    const local = await db.documents
      .where('project_id').equals(projectId)
      .toArray()
    return local.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    const local = await db.documents.where('project_id').equals(projectId).toArray()
    return local.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  // Sync cache — preserve cached html content
  for (const doc of data) {
    const existing = await db.documents.get(doc.id)
    await db.documents.put({ ...doc, html: existing?.html || null })
  }

  return data
}

/**
 * Delete a document.
 */
export async function deleteDocument(doc) {
  await db.documents.delete(doc.id)
  if (navigator.onLine && doc.storage_path) {
    await supabase.storage.from('documents').remove([doc.storage_path])
    await supabase.from('documents').delete().eq('id', doc.id)
  }
}
