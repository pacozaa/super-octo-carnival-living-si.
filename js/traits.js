import { random, clamp } from './utils.js';
import { buildMorphologySeed } from './species.js';

export const mutateTraits = (parent, mutationPower = 1) => {
  const drift = (value, amount, min, max) => 
    clamp(value + random(-amount, amount) * mutationPower, min, max);
  const morphologySeed = buildMorphologySeed(parent);
  const complexity = drift(morphologySeed.complexity, 0.05, 0, 1);

  return {
    speed: drift(parent.speed, 0.12, 0.25, 2.4),
    size: drift(parent.size, 0.28, 2.4, 8.8),
    vision: drift(parent.vision, 4.5, 16, 140),
    fertility: drift(parent.fertility, 0.02, 0.01, 0.25),
    body: drift(morphologySeed.body, 0.55, 5, 20),
    tail: drift(morphologySeed.tail, 0.5, 2, 18),
    fin: drift(morphologySeed.fin, 0.4, 0.4, 10),
    limbs: drift(morphologySeed.limbs, 0.24, 0, 6),
    neck: drift(morphologySeed.neck, 0.28, 0.2, 7.5),
    crest: drift(morphologySeed.crest, 0.22, 0, 5.5),
    wing: drift(morphologySeed.wing, 0.45, 0, 12),
    complexity,
    r: drift(parent.r, 16, 0, 255),
    g: drift(parent.g, 16, 0, 255),
    b: drift(parent.b, 16, 0, 255)
  };
};
