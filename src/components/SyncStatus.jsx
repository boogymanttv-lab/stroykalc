import { useState, useEffect, useCallback } from 'react'
import { flushQueue, flushDocuments, getPendingCount } from '../lib/syncService'

export default function SyncStatus({ onOnline, userId }) {
  const [online, setOnline]   = useState(navigator.onLine)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  const refreshPending = useCallback(async () => {
    setPending(await getPendingCount())
  }, [])

  const handleOnline = useCallback(async () => {
    setOnline(true)
    setSyncing(true)
    try {
      const [n, nd] = await Promise.all([flushQueue(), flushDocuments(userId)])
      if (n + nd > 0) {
        setJustSynced(true)
        setTimeout(() => setJustSynced(false), 3000)
      }
    } finally {
      setSyncing(false)
      refreshPending()
      onOnline?.()
    }
  }, [onOnline, refreshPending])

  const handleOffline = useCallback(() => {
    setOnline(false)
    refreshPending()
  }, [refreshPending])

  useEffect(() => {
    refreshPending()
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline, refreshPending])

  // Re-check pending count periodically
  useEffect(() => {
    const t = setInterval(refreshPending, 5000)
    return () => clearInterval(t)
  }, [refreshPending])

  if (online && !syncing && !justSynced && pending === 0) return null

  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold flex-shrink-0 ${
      !online
        ? 'bg-amber-50 text-amber-700 border-b border-amber-200'
        : syncing
          ? 'bg-blue-50 text-blue-700 border-b border-blue-100'
          : justSynced
            ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100'
            : 'bg-orange-50 text-orange-700 border-b border-orange-100'
    }`}>
      <span className="text-base">
        {!online ? '📵' : syncing ? '🔄' : justSynced ? '✅' : '⏳'}
      </span>
      <span>
        {!online
          ? `Офлайн режим${pending > 0 ? ` · ${pending} несинхронизирани промени` : ' · Промените ще се запазят при свързване'}`
          : syncing
            ? 'Синхронизиране...'
            : justSynced
              ? 'Синхронизирано успешно!'
              : `${pending} промени чакат синхронизиране`
        }
      </span>
    </div>
  )
}
