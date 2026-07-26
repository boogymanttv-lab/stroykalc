import { supabase } from './supabase'

/**
 * Upload an HTML document to Supabase Storage and save a record in the documents table.
 * @param {object} opts
 * @param {string} opts.html       - HTML string to upload
 * @param {string} opts.projectId  - project UUID
 * @param {string} opts.userId     - user UUID
 * @param {'offer'|'contract'} opts.type
 * @param {string} opts.name       - display name (e.g. "Оферта OF-240001")
 */
export async function saveDocument({ html, projectId, userId, type, name }) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename  = `${userId}/${projectId}/${type}-${timestamp}.html`
    const blob      = new Blob([html], { type: 'text/html;charset=utf-8' })

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filename, blob, { contentType: 'text/html', upsert: false })

    if (uploadError) {
      console.error('[saveDocument] upload failed:', uploadError)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filename)

    // Save record
    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({
        project_id:   projectId,
        user_id:      userId,
        type,
        name,
        storage_path: filename,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[saveDocument] db insert failed:', dbError)
      return null
    }

    return { ...data, url: publicUrl }
  } catch (e) {
    console.error('[saveDocument] error:', e)
    return null
  }
}

/**
 * Load all documents for a project
 */
export async function getProjectDocuments(projectId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return []

  // Attach public URLs
  return data.map(doc => {
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(doc.storage_path)
    return { ...doc, url: publicUrl }
  })
}

/**
 * Delete a document
 */
export async function deleteDocument(doc) {
  await supabase.storage.from('documents').remove([doc.storage_path])
  await supabase.from('documents').delete().eq('id', doc.id)
}
