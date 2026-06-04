// Game world dimensions and grid
export const WORLD_WIDTH = 900;
export const WORLD_HEIGHT = 560;
export const CELL = 14;
export const GRID_W = Math.floor(WORLD_WIDTH / CELL);
export const GRID_H = Math.floor(WORLD_HEIGHT / CELL);

// Organism population
export const BASE_ORGANISMS = 48;
export const MAX_ORGANISMS = 1521;

// Organism traits and behavior
export const REPRODUCTION_ENERGY = 120;
export const REPRODUCTION_COST = 50;
export const TICK_DAMAGE = 0.22;
export const ORGANISM_MIN_SAFETY_RADIUS = 52;
export const SAFETY_RADIUS_VISION_FACTOR = 0.95;

// Hunter population
export const MAX_HUNTERS = 10;
export const HUNTER_REPRODUCTION_ENERGY = 140;
export const HUNTER_REPRODUCTION_COST = 60;
export const HUNTER_SPAWN_INTERVAL = 720;
export const MIN_POPULATION_FOR_HUNTER_SPAWN = 85;

// Hunter traits
export const HUNTER_MIN_SPEED = 1.05;
export const HUNTER_MAX_SPEED = 1.75;
export const HUNTER_MIN_SIZE = 6;
export const HUNTER_MAX_SIZE = 9.5;
export const HUNTER_MIN_VISION = 90;
export const HUNTER_MAX_VISION = 175;
export const HUNTER_BASE_DRAIN = 28;
export const HUNTER_SIZE_DRAIN_FACTOR = 1;

// Hunting mechanics
export const PREY_SIZE_SCORE_WEIGHT = 12;
export const MIN_PREY_DISTANCE = 10;

// Climate events
export const MIN_EVENT_INTERVAL = 800;
export const EVENT_INTERVAL_VARIANCE = 540;
