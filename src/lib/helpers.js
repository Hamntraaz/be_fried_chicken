export function makeCode(prefix) {
  const stamp = Date.now().toString().slice(-6)
  const rand = Math.floor(Math.random() * 900 + 100)
  return `${prefix}-${stamp}${rand}`
}

export function initials(name = 'RF') {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('') || 'RF'
}

export function formatDate(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(value)
  }
}

export function materialStatus(stock, minimumStock) {
  return Number(stock || 0) < Number(minimumStock || 0) ? 'Menipis' : 'Aman'
}

export function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}
