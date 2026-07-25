import Dexie from 'dexie'

// Local IndexedDB database — mirrors Supabase tables
// Used for offline-first read/write with sync queue
export const db = new Dexie('stroykalc_v1')

db.version(1).stores({
  // Main tables (id = primary key, other fields = indexed for fast lookup)
  clients:    'id, user_id',
  projects:   'id, user_id, client_id, status',
  payments:   'id, project_id, user_id',
  expenses:   'id, project_id, user_id',
  tasks:      'id, project_id, user_id, status',
  profiles:   'id',

  // Pending writes to push to Supabase when back online
  // ++id = auto-increment local id
  sync_queue: '++id, table_name, created_at',
})
