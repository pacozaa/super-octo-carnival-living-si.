import { random, clamp } from './utils.js';

export const mutateTraits = (parent, mutationPower = 1) => {
  const drift = (value, amount, min, max) => 
    clamp(value + random(-amount, amount) * mutationPower, min, max);
  const complexity = drift(parent.complexity ?? 0.18, 0.05, 0, 1);

  return {
    speed: drift(parent.speed, 0.12, 0.25, 2.4),
    size: drift(parent.size, 0.28, 2.4, 8.8),
    vision: drift(parent.vision, 4.5, 16, 140),
    fertility: drift(parent.fertility, 0.02, 0.01, 0.25),
    body: drift(parent.body ?? parent.size * 2.4, 0.55, 5, 20),
    tail: drift(parent.tail ?? parent.size * 1.5, 0.5, 2, 18),
    fin: drift(parent.fin ?? Math.max(1.1, parent.vision / 22), 0.4, 0.4, 10),
    limbs: drift(parent.limbs ?? (parent.complexity ?? 0.18) * 2.2, 0.24, 0, 6),
    neck: drift(parent.neck ?? parent.size * 0.28 + (parent.complexity ?? 0.18) * 2.2, 0.28, 0.2, 7.5),
    crest: drift(parent.crest ?? parent.fertility * 18 + (parent.complexity ?? 0.18) * 1.4, 0.22, 0, 5.5),
    wing: drift(parent.wing ?? Math.max(0, ((parent.complexity ?? 0.18) - 0.58) * 10), 0.45, 0, 12),
    complexity,
    r: drift(parent.r, 16, 0, 255),
    g: drift(parent.g, 16, 0, 255),
    b: drift(parent.b, 16, 0, 255)
  };
};
