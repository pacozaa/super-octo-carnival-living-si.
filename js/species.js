import { clamp } from './utils.js';

let speciesCounter = 1;

export const createSpecies = (seed) => {
  return {
    id: speciesCounter++,
    r: clamp(Math.round(seed.r), 30, 255),
    g: clamp(Math.round(seed.g), 30, 255),
    b: clamp(Math.round(seed.b), 30, 255)
  };
};

export const speciesColor = (species) => {
  return `rgb(${species.r}, ${species.g}, ${species.b})`;
};

export const colorDistance = (a, b) => {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
};

export const resetSpeciesCounter = () => {
  speciesCounter = 1;
};

export const getSpeciesCounter = () => speciesCounter;
