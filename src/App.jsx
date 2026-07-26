import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider, useLang } from './contexts/LanguageContext'
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
import AdminPage from './pages/AdminPage'
import OnboardingTour from './components/OnboardingTour'
import { syncDown } from './lib/syncService'

const ADMIN_EMAIL = 'wellecfx@gmail.com'

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppInner />
      </LanguageProvider>
    </AuthProvider>
  )
}

function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <button
      onClick={() => setLang(lang === 'bg' ? 'en' : 'bg')}
      className="text-xs font-bold px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
      title="Switch language / Смени езика"
    >
      {lang === 'bg' ? '🇬🇧 EN' : '🇧🇬 BG'}
    </button>
  )
}

function CookieBanner() {
  const { t } = useLang()
  const [visible, setVisible] = useState(() => !localStorage.getItem('cookie_ok'))
  if (!visible) return null
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white px-4 py-3
                    flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-2xl">
      <p className="text-xs text-slate-300 flex-1">
        {t('cookieText')}{' '}
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
           className="underline text-indigo-300">{t('cookieLearnMore')}</a>
      </p>
      <button
        onClick={() => { localStorage.setItem('cookie_ok', '1'); setVisible(false) }}
        className="flex-shrink-0 px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600
                   text-white text-xs font-semibold transition-colors"
      >
        {t('cookieOk')}
      </button>
    </div>
  )
}

function AppInner() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth()
  const { t, lang } = useLang()
  const urlParams = new URLSearchParams(window.location.search)
  const shortcut  = urlParams.get('shortcut')
  const [tab, setTab] = useState(shortcut || 'calc')

  // ── Share / Client portal route ──
  const hash = typeof window !== 'undefined' ? window.location.hash : ''
  if (hash.startsWith('#share/')) {
    return <SharePage token={hash.slice('#share/'.length)} />
  }

  const [calcKey,       setCalcKey]       = useState(0)
  const [editProjectId, setEditProjectId] = useState(null)

  useEffect(() => {
    if (user) syncDown(user.id)
  }, [user])

  const [upgradeSuccess, setUpgradeSuccess] = useState(false)
  useEffect(() => {
    if (window.location.search.includes('upgraded=true')) {
      refreshProfile()
      setTab('upgrade')
      setUpgradeSuccess(true)
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => setUpgradeSuccess(false), 6000)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <img src="/pwa-192.png" alt="Maistorix" className="w-16 h-16 rounded-2xl mb-3 mx-auto shadow-md" />
          <p className="text-slate-400 text-sm animate-pulse">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) return <AuthPage />

  const displayName = profile?.full_name || profile?.company_name || user.email

  function openProject(id) {
    setEditProjectId(id)
    setCalcKey(k => k + 1)
    setTab('calc')
  }

  function newProject() {
    setEditProjectId(null)
    setCalcKey(k => k + 1)
    setTab('calc')
  }

  const TABS = [
    { id: 'calc',     icon: '🧮', label: t('navCalc') },
    { id: 'projects', icon: '📁', label: t('navProjects') },
    { id: 'clients',  icon: '👥', label: t('navClients') },
    { id: 'reports',  icon: '📊', label: t('navReports') },
    { id: 'upgrade',  icon: '⚡', label: 'PRO' },
  ]

  const tabLabel = tab === 'settings' ? t('navSettings')
    : TABS.find(t => t.id === tab)?.label || ''
  const tabIcon  = tab === 'settings' ? '⚙️'
    : TABS.find(t => t.id === tab)?.icon || ''

  return (
    <>
    <div className="flex flex-col h-[100dvh] max-w-screen-sm mx-auto bg-white shadow-xl
                    md:max-w-none md:flex-row">

      {/* ── Sidebar (desktop only) ── */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0
                        bg-gradient-to-b from-indigo-600 to-violet-700 text-white">
        <div className="px-5 pt-6 pb-5 border-b border-white/20">
          <div className="flex items-center gap-2.5">
            <img src="/pwa-192.png" alt="Maistorix" className="w-8 h-8 rounded-lg shadow" />
            <h1 className="text-xl font-black tracking-tight">Maistorix</h1>
          </div>
          <p className="text-xs text-white/60 mt-1 truncate">{displayName}</p>
        </div>

        <nav className="flex-1 pt-2">
          {TABS.map(tb => (
            <button
              key={tb.id}
              data-tour={`${tb.id}-tab`}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-3 w-full px-5 py-3 text-sm font-medium
                          border-l-4 transition-all
                          ${tb.id === 'upgrade'
                            ? tab === 'upgrade'
                              ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                              : 'border-transparent text-amber-300/80 hover:bg-amber-400/10 hover:text-amber-300'
                            : tab === tb.id
                              ? 'border-white bg-white/15 text-white'
                              : 'border-transparent text-white/60 hover:bg-white/8 hover:text-white'}`}
            >
              <span className="text-lg">{tb.icon}</span>
              {tb.label}
              {tb.id === 'upgrade' && profile?.plan !== 'pro' && (
                <span className="ml-auto text-[9px] bg-amber-400 text-amber-900 font-black px-1.5 py-0.5 rounded-full">NEW</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/20 space-y-2">
          {user?.email === ADMIN_EMAIL && (
            <button
              onClick={() => setTab('admin')}
              className={`flex items-center gap-2 w-full text-xs font-medium transition-colors
                          ${tab === 'admin' ? 'text-white' : 'text-white/50 hover:text-white'}`}
            >
              🛡️ {lang === 'en' ? 'Admin panel' : 'Админ панел'}
            </button>
          )}
          <button
            data-tour="settings-btn"
            onClick={() => setTab('settings')}
            className={`flex items-center gap-2 w-full text-xs font-medium transition-colors
                        ${tab === 'settings' ? 'text-white' : 'text-white/50 hover:text-white'}`}
          >
            ⚙️ {lang === 'en' ? 'Company profile' : 'Фирмен профил'}
          </button>
          <div className="flex items-center justify-between">
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
            >
              🚪 {t('signOut').replace('🚪 ', '')}
            </button>
            <LangToggle />
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-h-0">

        {/* Mobile header */}
        <header className="md:hidden bg-gradient-to-r from-indigo-600 to-violet-700
                           text-white px-4 py-3 flex-shrink-0 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <img src="/pwa-192.png" alt="Maistorix" className="w-7 h-7 rounded-lg shadow" />
              <h1 className="text-lg font-black">Maistorix</h1>
            </div>
            <p className="text-xs text-white/70 truncate max-w-[140px]">{displayName}</p>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            {user?.email === ADMIN_EMAIL && (
              <button
                onClick={() => setTab('admin')}
                className={`text-base transition-opacity ${tab === 'admin' ? 'opacity-100' : 'opacity-60'}`}
                title="Admin"
              >
                🛡️
              </button>
            )}
            <button
              data-tour="settings-btn"
              onClick={() => setTab('settings')}
              className={`text-base transition-opacity ${tab === 'settings' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
              title={t('navSettings')}
            >
              ⚙️
            </button>
            <button onClick={signOut} className="text-white/60 text-xs hover:text-white">
              {lang === 'en' ? 'Out' : 'Изход'}
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
              + {lang === 'en' ? 'New project' : 'Нов проект'}
            </button>
          )}
        </div>

        {/* Views */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <OnboardingTour />
          <SyncStatus onOnline={() => syncDown(user.id)} userId={user.id} />
          {upgradeSuccess && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold animate-pulse">
              🎉 {lang === 'en' ? 'Welcome to PRO! All features unlocked.' : 'Добре дошли в PRO! Всички функции са отключени.'}
            </div>
          )}
          <OverdueAlert onGoToProject={id => { openProject(id) }} />
          {tab === 'calc'     && <Calculator key={calcKey} editProjectId={editProjectId} />}
          {tab === 'projects' && <ProjectsPage onEdit={openProject} onNew={newProject} onGoUpgrade={() => setTab('upgrade')} />}
          {tab === 'clients'  && <ClientsPage />}
          {tab === 'reports'  && <ReportsGate profile={profile} onGoUpgrade={() => setTab('upgrade')} />}
          {tab === 'upgrade'  && <UpgradePage />}
          {tab === 'admin'    && user?.email === ADMIN_EMAIL && <AdminPage />}
          {tab === 'settings' && <SettingsPage />}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-slate-100 bg-white flex-shrink-0 pb-[env(safe-area-inset-bottom,0px)]">
          {TABS.map(tb => (
            <button
              key={tb.id}
              data-tour={`${tb.id}-tab`}
              onClick={() => setTab(tb.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold
                          border-t-2 transition-colors
                          ${tb.id === 'upgrade'
                            ? tab === 'upgrade'
                              ? 'border-amber-400 text-amber-500'
                              : 'border-transparent text-amber-400'
                            : tab === tb.id
                              ? 'border-indigo-600 text-indigo-600'
                              : 'border-transparent text-slate-400'}`}
            >
              <span className="text-xl leading-none">{tb.icon}</span>
              {tb.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
    <CookieBanner />
    </>
  )
}

function ReportsGate({ profile, onGoUpgrade }) {
  const { t } = useLang()
  if (profile?.plan === 'pro') return <ReportsPage />
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="text-6xl mb-4">📊</div>
      <h2 className="text-xl font-bold text-slate-700 mb-2">{t('reportsProOnly')}</h2>
      <p className="text-slate-400 text-sm max-w-xs mb-6">{t('reportsProDesc')}</p>
      <button
        onClick={onGoUpgrade}
        className="px-6 py-3 rounded-xl font-bold text-white text-sm
                   bg-gradient-to-r from-indigo-600 to-violet-700
                   hover:opacity-90 active:scale-[.98] transition-all shadow-sm"
      >
        ⚡ {t('upgradeNow').replace('⚡ ', '')} €2.99/{t('perMonth').replace('/', '')}
      </button>
    </div>
  )
}
