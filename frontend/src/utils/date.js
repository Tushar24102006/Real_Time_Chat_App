export function formatMessageTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDateSeparator(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Checks if two timestamps fall on different calendar days
 */
export function isDifferentDay(isoString1, isoString2) {
  if (!isoString1 || !isoString2) return true;
  const d1 = new Date(isoString1);
  const d2 = new Date(isoString2);
  return (
    d1.getDate() !== d2.getDate() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getFullYear() !== d2.getFullYear()
  );
}

/**
 * Determines whether two consecutive messages should be grouped:
 * - Same sender
 * - Sent within 2 minutes (120,000 ms)
 * - Sent on the same calendar day
 */
export function shouldGroupMessages(prevMsg, currMsg) {
  if (!prevMsg || !currMsg) return false;
  if (prevMsg.senderId !== currMsg.senderId) return false;
  if (isDifferentDay(prevMsg.createdAt, currMsg.createdAt)) return false;

  const t1 = new Date(prevMsg.createdAt).getTime();
  const t2 = new Date(currMsg.createdAt).getTime();
  return Math.abs(t2 - t1) < 120000; // 2 minutes in ms
}
