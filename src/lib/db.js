import Dexie from 'dexie'

// Local IndexedDB database — mirrors Supabase tables
// Used for offline-first read/write with sync queue
export const db = new Dexie('stroykalc_v1')

db.version(1).stores({
  clients:    'id, user_id',
  projects:   'id, user_id, client_id, status',
  payments:   'id, project_id, user_id',
  expenses:   'id, project_id, user_id',
  tasks:      'id, project_id, user_id, status',
  profiles:   'id',
  sync_queue: '++id, table_name, created_at',
})

// v2: add photos table
db.version(2).stores({
  clients:    'id, user_id',
  projects:   'id, user_id, client_id, status',
  payments:   'id, project_id, user_id',
  expenses:   'id, project_id, user_id',
  tasks:      'id, project_id, user_id, status',
  profiles:   'id',
  photos:     'id, project_id, user_id',
  sync_queue: '++id, table_name, created_at',
})

// v3: add documents table (stores html content for offline access)
db.version(3).stores({
  clients:    'id, user_id',
  projects:   'id, user_id, client_id, status',
  payments:   'id, project_id, user_id',
  expenses:   'id, project_id, user_id',
  tasks:      'id, project_id, user_id, status',
  profiles:   'id',
  photos:     'id, project_id, user_id',
  documents:  'id, project_id, user_id',
  sync_queue: '++id, table_name, created_at',
})
