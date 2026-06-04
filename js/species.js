import { clamp } from './utils.js';

let speciesCounter = 1;
const VERTEBRATE_FORMS = ['Protofish', 'Tiktaalik', 'Lobe-fin', 'Amphibian', 'Synapsid', 'Reptile', 'Diapsid', 'Dinosaur', 'Avian'];
export const DEFAULT_VERTEBRATE_FORM = VERTEBRATE_FORMS[0];
const COMPLEXITY_DISTANCE_WEIGHT = 8;

export const buildMorphologySeed = (seed = {}) => {
  const size = seed.size ?? 4.2;
  const vision = seed.vision ?? 50;
  const fertility = seed.fertility ?? 0.08;
  const complexity = clamp(seed.complexity ?? 0.18, 0, 1);

  return {
    size,
    vision,
    fertility,
    complexity,
    body: clamp(seed.body ?? size * 2.4, 5, 20),
    tail: clamp(seed.tail ?? size * 1.5, 2, 18),
    fin: clamp(seed.fin ?? Math.max(1.1, vision / 22), 0.4, 10),
    limbs: clamp(seed.limbs ?? complexity * 2.2, 0, 6),
    neck: clamp(seed.neck ?? size * 0.28 + complexity * 2.2, 0.2, 7.5),
    crest: clamp(seed.crest ?? fertility * 18 + complexity * 1.4, 0, 5.5),
    wing: clamp(seed.wing ?? Math.max(0, (complexity - 0.58) * 10), 0, 12)
  };
};

const normalizeMorphology = (seed = {}) => {
  const morphology = buildMorphologySeed(seed);
  return {
    body: morphology.body,
    tail: morphology.tail,
    fin: morphology.fin,
    limbs: morphology.limbs,
    neck: morphology.neck,
    crest: morphology.crest,
    wing: morphology.wing
  };
};

const toMorphologySeed = (value = {}) => {
  if (value.morphology) {
    return buildMorphologySeed({
      ...value.morphology,
      complexity: value.complexity,
      size: value.size,
      vision: value.vision,
      fertility: value.fertility
    });
  }
  return buildMorphologySeed(value);
};

const evolutionScore = (seed, morphology) => {
  return (
    (seed.complexity ?? 0.18) * 4.6 +
    morphology.limbs * 0.56 +
    morphology.neck * 0.34 +
    morphology.wing * 0.28 +
    (seed.vision ?? 50) / 80 +
    (seed.speed ?? 0.9) * 0.45 -
    morphology.fin * 0.08 -
    morphology.tail * 0.02
  );
};

export const describeVertebrateForm = (seed = {}) => {
  const morphology = normalizeMorphology(seed);
  const score = evolutionScore(seed, morphology);
  let stageIndex = 0;
  if (score >= 8.5) stageIndex = 8;      // Avian
  else if (score >= 7.5) stageIndex = 7; // Dinosaur
  else if (score >= 6.5) stageIndex = 6; // Diapsid
  else if (score >= 5.5) stageIndex = 5; // Reptile
  else if (score >= 4.5) stageIndex = 4; // Synapsid
  else if (score >= 3.5) stageIndex = 3; // Amphibian
  else if (score >= 2.5) stageIndex = 2; // Lobe-fin
  else if (score >= 1.5) stageIndex = 1; // Tiktaalik

  return {
    stageIndex,
    name: VERTEBRATE_FORMS[stageIndex],
    morphology
  };
};

export const createSpecies = (seed) => {
  const form = describeVertebrateForm(seed);
  return {
    id: speciesCounter++,
    r: clamp(Math.round(seed.r), 30, 255),
    g: clamp(Math.round(seed.g), 30, 255),
    b: clamp(Math.round(seed.b), 30, 255),
    morphology: form.morphology,
    stageIndex: form.stageIndex,
    formName: form.name,
    complexity: clamp(seed.complexity ?? 0.18, 0, 1)
  };
};

export const speciesColor = (species) => {
  return `rgb(${species.r}, ${species.g}, ${species.b})`;
};

export const colorDistance = (a, b) => {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
};

export const morphologyDistance = (a, b) => {
  const leftSeed = toMorphologySeed(a);
  const rightSeed = toMorphologySeed(b);
  const left = normalizeMorphology(leftSeed);
  const right = normalizeMorphology(rightSeed);
  const complexityDelta = (leftSeed.complexity - rightSeed.complexity) * COMPLEXITY_DISTANCE_WEIGHT;

  return Math.sqrt(
    (left.body - right.body) ** 2 +
    (left.tail - right.tail) ** 2 +
    (left.fin - right.fin) ** 2 +
    (left.limbs - right.limbs) ** 2 +
    (left.neck - right.neck) ** 2 +
    (left.crest - right.crest) ** 2 +
    (left.wing - right.wing) ** 2 +
    complexityDelta ** 2
  );
};

export const resetSpeciesCounter = () => {
  speciesCounter = 1;
};

export const getSpeciesCounter = () => speciesCounter;
