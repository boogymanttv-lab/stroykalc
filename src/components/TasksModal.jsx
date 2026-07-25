import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { offlineInsert, offlineUpdate, offlineDelete } from '../lib/syncService'

const STATUS = {
  todo:        { label: 'За правене', icon: '⬜', next: 'in_progress', color: 'text-slate-400' },
  in_progress: { label: 'В процес',  icon: '🔄', next: 'done',        color: 'text-amber-500' },
  done:        { label: 'Готово',    icon: '✅', next: 'todo',         color: 'text-emerald-500' },
}

export default function TasksModal({ project, onClose }) {
  const { user } = useAuth()
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newDate,  setNewDate]  = useState('')
  const inputRef = useRef()

  useEffect(() => { loadTasks() }, [])
  useEffect(() => { inputRef.current?.focus() }, [])

  async function loadTasks() {
    setLoading(true)
    if (navigator.onLine) {
      const { data } = await supabase
        .from('tasks').select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true })
      if (data) {
        await db.tasks.bulkPut(data)
        setTasks(data)
      }
    } else {
      const local = await db.tasks.where('project_id').equals(project.id).toArray()
      setTasks(local.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
    }
    setLoading(false)
  }

  async function addTask() {
    const title = newTitle.trim()
    if (!title) return
    const record = await offlineInsert('tasks', {
      project_id: project.id,
      user_id:    user.id,
      title,
      due_date:   newDate || null,
      status:     'todo',
      created_at: new Date().toISOString(),
    })
    setTasks(t => [...t, record])
    setNewTitle('')
    setNewDate('')
    inputRef.current?.focus()
  }

  async function toggleStatus(task) {
    const next = STATUS[task.status]?.next || 'todo'
    await offlineUpdate('tasks', task.id, { status: next })
    setTasks(t => t.map(x => x.id === task.id ? { ...x, status: next } : x))
  }

  async function deleteTask(id) {
    await offlineDelete('tasks', id)
    setTasks(t => t.filter(x => x.id !== id))
  }

  async function updateTitle(id, title) {
    await offlineUpdate('tasks', id, { title })
    setTasks(t => t.map(x => x.id === id ? { ...x, title } : x))
  }

  const todo    = tasks.filter(t => t.status !== 'done')
  const done    = tasks.filter(t => t.status === 'done')
  const overdue = todo.filter(t => t.due_date && new Date(t.due_date) < new Date())

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
      <div className="flex-1" onClick={onClose} />

      <div className="bg-white rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">✅ Задачи</h2>
            <p className="text-xs text-slate-400 truncate max-w-[220px]">{project.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {todo.length} активни · {done.length} готови
            </span>
            <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center">×</button>
          </div>
        </div>

        {/* Overdue alert */}
        {overdue.length > 0 && (
          <div className="mx-4 mt-3 flex-shrink-0 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 font-semibold">
            ⚠️ {overdue.length} задача{overdue.length > 1 ? 'и' : ''} с изтекъл срок!
          </div>
        )}

        {/* Quick add */}
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex gap-2 mb-2">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              placeholder="Нова задача... (Enter за добавяне)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
            <button
              onClick={addTask}
              className="px-4 py-2.5 rounded-xl font-semibold text-white text-sm
                         bg-gradient-to-r from-indigo-600 to-violet-700
                         hover:opacity-90 active:scale-[.98]"
            >
              + Добави
            </button>
          </div>
          <input
            type="date"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 text-slate-500"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            placeholder="Краен срок (по желание)"
          />
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto thin-scroll px-4 py-3">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Зареждане...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-slate-400 text-sm">Няма задачи — добави първата</p>
            </div>
          ) : (
            <>
              {/* Active tasks */}
              {todo.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => toggleStatus(task)}
                  onDelete={() => deleteTask(task.id)}
                  onTitleChange={t => updateTitle(task.id, t)}
                />
              ))}

              {/* Done tasks */}
              {done.length > 0 && (
                <>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mt-4 mb-2">
                    Завършени ({done.length})
                  </div>
                  {done.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggleStatus(task)}
                      onDelete={() => deleteTask(task.id)}
                      onTitleChange={t => updateTitle(task.id, t)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, onToggle, onDelete, onTitleChange }) {
  const [editing, setEditing] = useState(false)
  const [title,   setTitle]   = useState(task.title)
  const st      = STATUS[task.status] || STATUS.todo
  const isDone  = task.status === 'done'
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone

  function saveTitle() {
    if (title.trim() && title !== task.title) onTitleChange(title.trim())
    setEditing(false)
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl mb-2 border transition-all
      ${isDone ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 shadow-sm'}
      ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}
    >
      {/* Status toggle */}
      <button
        onClick={onToggle}
        className={`text-xl leading-none flex-shrink-0 mt-0.5 transition-transform hover:scale-110 ${st.color}`}
      >
        {st.icon}
      </button>

      {/* Title + date */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            className="w-full text-sm border-b border-indigo-400 outline-none bg-transparent py-0.5"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle() }}
          />
        ) : (
          <div
            className={`text-sm font-medium cursor-pointer ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}
            onClick={() => setEditing(true)}
          >
            {task.title}
          </div>
        )}
        {task.due_date && (
          <div className={`text-xs mt-0.5 font-semibold ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
            {isOverdue ? '⚠️ ' : '📅 '}
            {new Date(task.due_date).toLocaleDateString('bg-BG')}
            {isOverdue && ' — просрочена!'}
          </div>
        )}
      </div>

      <button
        onClick={onDelete}
        className="text-red-300 hover:text-red-500 text-xl leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  )
}
