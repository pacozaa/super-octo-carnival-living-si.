// Utility math functions
export const random = (min, max) => min + Math.random() * (max - min);

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const chance = (value) => Math.random() < value;

export const distanceSq = (ax, ay, bx, by) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

export const distance = (ax, ay, bx, by) => Math.sqrt(distanceSq(ax, ay, bx, by));
