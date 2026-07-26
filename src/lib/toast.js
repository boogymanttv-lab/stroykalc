const listeners = []

export function showToast(msg, type = 'info', duration = 3500) {
  const id = Date.now() + Math.random()
  listeners.forEach(fn => fn({ id, msg, type, duration }))
}

export function onToast(fn) {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i > -1) listeners.splice(i, 1)
  }
}
