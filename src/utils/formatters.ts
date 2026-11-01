export function formatNumber(value: number, decimals: number = 2): string {
  if (isNaN(value)) return '0';
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDateTime(timestamp: number, locale: 'ru' | 'kk' = 'ru'): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(locale === 'kk' ? 'kk-KZ' : 'ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
