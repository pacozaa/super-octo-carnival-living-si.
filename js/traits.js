import { random, clamp } from './utils.js';

export const mutateTraits = (parent, mutationPower = 1) => {
  const drift = (value, amount, min, max) => 
    clamp(value + random(-amount, amount) * mutationPower, min, max);

  return {
    speed: drift(parent.speed, 0.12, 0.25, 2.4),
    size: drift(parent.size, 0.28, 2.4, 8.8),
    vision: drift(parent.vision, 4.5, 16, 140),
    fertility: drift(parent.fertility, 0.02, 0.01, 0.25),
    r: drift(parent.r, 16, 0, 255),
    g: drift(parent.g, 16, 0, 255),
    b: drift(parent.b, 16, 0, 255)
  };
};
