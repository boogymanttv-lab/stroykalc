const listeners = []

// meta: { name?: string, type?: 'offer' | 'contract' | 'document' }
export function openPDFViewer(html, meta = {}) {
  listeners.forEach(fn => fn({ html, meta }))
}

export function onPDFViewer(fn) {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i > -1) listeners.splice(i, 1)
  }
}
