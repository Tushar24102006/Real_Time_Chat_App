/**
 * Deterministic avatar color & initials generator
 * Uses 8 desaturated, calm hues suitable for a professional placement portal
 */

const AVATAR_PALETTE = [
  '#2F6F5E', // Deep Forest Pine
  '#3B607A', // Slate Ocean
  '#6D597A', // Dusty Plum
  '#8E5B5B', // Warm Terra
  '#4E6B7A', // Steel Teal
  '#7A684D', // Olive Ochre
  '#4D7268', // Muted Sage
  '#635E7A'  // Heather Lavender
];

export function getAvatarColor(username) {
  if (!username) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

export function getInitials(name) {
  if (!name) return '??';
  const clean = name.replace(/[^a-zA-Z0-9_\s]/g, '').trim();
  const parts = clean.split(/[_\s.-]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

