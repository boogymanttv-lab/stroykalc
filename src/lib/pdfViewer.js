const listeners = []

export function openPDFViewer(html) {
  listeners.forEach(fn => fn(html))
}

export function onPDFViewer(fn) {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i > -1) listeners.splice(i, 1)
  }
}
