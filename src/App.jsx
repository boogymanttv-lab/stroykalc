import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import SettingsPage from './pages/SettingsPage'
import ClientsPage from './pages/ClientsPage'
import ProjectsPage from './pages/ProjectsPage'
import ReportsPage from './pages/ReportsPage'
import SharePage from './pages/SharePage'
import Calculator from './components/Calculator'
import OverdueAlert from './components/OverdueAlert'
import SyncStatus from './components/SyncStatus'
import UpgradePage from './pages/UpgradePage'
import { syncDown } from './lib/syncService'

const TABS = [
  { id: 'calc',     icon: '🧮', label: 'Калкулатор' },
  { id: 'projects', icon: '📁', label: 'Проекти'    },
  { id: 'clients',  icon: '👥', label: 'Клиенти'    },
  { id: 'reports',  icon: '📊', label: 'Отчети'     },
  { id: 'upgrade',  icon: '⚡', label: 'PRO'        },
]

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

function AppInner() {
  const { user, profile, loading, signOut } = useAuth()
  const [tab, setTab] = useState('calc')

  // ── Share / Client portal route ──
  const hash = typeof window !== 'undefined' ? window.location.hash : ''
  if (hash.startsWith('#share/')) {
    return <SharePage token={hash.slice('#share/'.length)} />
  }

  // calcKey forces Calculator to remount when switching projects
  const [calcKey,       setCalcKey]       = useState(0)
  const [editProjectId, setEditProjectId] = useState(null)

  // Sync on login and when coming back online
  useEffect(() => {
    if (user) syncDown(user.id)
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-5xl mb-3">🏗️</div>
          <p className="text-slate-400 text-sm animate-pulse">Зареждане...</p>
        </div>
      </div>
    )
  }

  if (!user) return <AuthPage />

  const displayName = profile?.full_name || profile?.company_name || user.email

  /** Open an existing project in Calculator */
  function openProject(id) {
    setEditProjectId(id)
    setCalcKey(k => k + 1)
    setTab('calc')
  }

  /** Start a brand-new blank Calculator */
  function newProject() {
    setEditProjectId(null)
    setCalcKey(k => k + 1)
    setTab('calc')
  }

  const tabLabel = tab === 'settings' ? 'Фирмен профил'
    : TABS.find(t => t.id === tab)?.label || ''
  const tabIcon  = tab === 'settings' ? '⚙️'
    : TABS.find(t => t.id === tab)?.icon || ''

  return (
    <div className="flex flex-col h-screen max-w-screen-sm mx-auto bg-white shadow-xl
                    md:max-w-none md:flex-row">

      {/* ── Sidebar (desktop only) ── */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0
                        bg-gradient-to-b from-indigo-600 to-violet-700 text-white">
        <div className="px-5 pt-6 pb-5 border-b border-white/20">
          <h1 className="text-xl font-black tracking-tight">🏗️ СтройКалк</h1>
          <p className="text-xs text-white/60 mt-1 truncate">{displayName}</p>
        </div>

        <nav className="flex-1 pt-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-3 w-full px-5 py-3 text-sm font-medium
                          border-l-4 transition-all
                          ${t.id === 'upgrade'
                            ? tab === 'upgrade'
                              ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                              : 'border-transparent text-amber-300/80 hover:bg-amber-400/10 hover:text-amber-300'
                            : tab === t.id
                              ? 'border-white bg-white/15 text-white'
                              : 'border-transparent text-white/60 hover:bg-white/8 hover:text-white'}`}
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
              {t.id === 'upgrade' && profile?.plan !== 'pro' && (
                <span className="ml-auto text-[9px] bg-amber-400 text-amber-900 font-black px-1.5 py-0.5 rounded-full">NEW</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/20 space-y-2">
          <button
            onClick={() => setTab('settings')}
            className={`flex items-center gap-2 w-full text-xs font-medium transition-colors
                        ${tab === 'settings' ? 'text-white' : 'text-white/50 hover:text-white'}`}
          >
            ⚙️ Фирмен профил
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full text-xs text-white/50 hover:text-white transition-colors"
          >
            🚪 Изход
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-h-0">

        {/* Mobile header */}
        <header className="md:hidden bg-gradient-to-r from-indigo-600 to-violet-700
                           text-white px-4 py-3 flex-shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black">🏗️ СтройКалк</h1>
            <p className="text-xs text-white/70 truncate max-w-[175px]">{displayName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTab('settings')}
              className={`text-base transition-opacity ${tab === 'settings' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
              title="Фирмен профил"
            >
              ⚙️
            </button>
            <button onClick={signOut} className="text-white/60 text-xs hover:text-white">
              Изход
            </button>
          </div>
        </header>

        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-between px-6 py-4 bg-white
                        border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tabIcon}</span>
            <h2 className="text-lg font-bold text-slate-800">{tabLabel}</h2>
          </div>
          {tab === 'calc' && (
            <button
              onClick={newProject}
              className="text-sm px-4 py-2 rounded-xl bg-slate-100 text-slate-600
                         font-semibold hover:bg-slate-200 transition-colors"
            >
              + Нов проект
            </button>
          )}
        </div>

        {/* Views */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <SyncStatus onOnline={() => syncDown(user.id)} />
          <OverdueAlert onGoToProject={id => { openProject(id) }} />
          {tab === 'calc'     && <Calculator key={calcKey} editProjectId={editProjectId} />}
          {tab === 'projects' && <ProjectsPage onEdit={openProject} onNew={newProject} onGoUpgrade={() => setTab('upgrade')} />}
          {tab === 'clients'  && <ClientsPage />}
          {tab === 'reports'  && <ReportsGate profile={profile} onGoUpgrade={() => setTab('upgrade')} />}
          {tab === 'upgrade'  && <UpgradePage onUpgrade={() => alert('Stripe интеграцията идва скоро!')} />}
          {tab === 'settings' && <SettingsPage />}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-slate-100 bg-white flex-shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold
                          border-t-2 transition-colors
                          ${t.id === 'upgrade'
                            ? tab === 'upgrade'
                              ? 'border-amber-400 text-amber-500'
                              : 'border-transparent text-amber-400'
                            : tab === t.id
                              ? 'border-indigo-600 text-indigo-600'
                              : 'border-transparent text-slate-400'}`}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

function ReportsGate({ profile, onGoUpgrade }) {
  if (profile?.plan === 'pro') return <ReportsPage />
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="text-6xl mb-4">📊</div>
      <h2 className="text-xl font-bold text-slate-700 mb-2">Отчети — PRO функция</h2>
      <p className="text-slate-400 text-sm max-w-xs mb-6">
        Пълни отчети, приходи по месеци, CSV/Excel експорт — достъпни с PRO план.
      </p>
      <button
        onClick={onGoUpgrade}
        className="px-6 py-3 rounded-xl font-bold text-white text-sm
                   bg-gradient-to-r from-indigo-600 to-violet-700
                   hover:opacity-90 active:scale-[.98] transition-all shadow-sm"
      >
        ⚡ Надградете за €2.99/месец
      </button>
    </div>
  )
}

function Placeholder({ icon, title, text }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="text-6xl mb-4">{icon}</div>
      <h2 className="text-xl font-bold text-slate-700 mb-2">{title}</h2>
      <p className="text-slate-400 text-sm max-w-xs">{text}</p>
      <div className="mt-6 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold">
        🚧 Скоро
      </div>
    </div>
  )
}
