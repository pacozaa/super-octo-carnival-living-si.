// Mutable configuration object for adjustable constants
// Default values match the original constants

export const config = {
  // Organism population
  BASE_ORGANISMS: 48,
  MAX_ORGANISMS: 1521,
  
  // Organism traits and behavior
  REPRODUCTION_ENERGY: 120,
  REPRODUCTION_COST: 70,
  TICK_DAMAGE: 0.22,
  
  // Hunter population
  MAX_HUNTERS: 25,
  HUNTER_SPAWN_INTERVAL: 720,
  MIN_POPULATION_FOR_HUNTER_SPAWN: 85,
  
  // Hunter traits
  HUNTER_MIN_SPEED: 1.05,
  HUNTER_MAX_SPEED: 1.75,
  HUNTER_BASE_DRAIN: 28,
  
  // Hunting mechanics
  PREY_SIZE_SCORE_WEIGHT: 14,
  
  // Movement speed multiplier (added for previous adjustment)
  MOVEMENT_SPEED_MULTIPLIER: 0.5,
  
  // Apocalypse settings
  APOCALYPSE_MIN_INTERVAL: 1800,
  APOCALYPSE_MAX_INTERVAL: 3500,
};

// Update a config value
export function updateConfig(key, value) {
  if (key in config) {
    config[key] = value;
    return true;
  }
  return false;
}

// Reset config to defaults
export function resetConfig() {
  config.BASE_ORGANISMS = 48;
  config.MAX_ORGANISMS = 1521;
  config.REPRODUCTION_ENERGY = 120;
  config.REPRODUCTION_COST = 70;
  config.TICK_DAMAGE = 0.22;
  config.MAX_HUNTERS = 25;
  config.HUNTER_SPAWN_INTERVAL = 720;
  config.MIN_POPULATION_FOR_HUNTER_SPAWN = 85;
  config.HUNTER_MIN_SPEED = 1.05;
  config.HUNTER_MAX_SPEED = 1.75;
  config.HUNTER_BASE_DRAIN = 28;
  config.PREY_SIZE_SCORE_WEIGHT = 14;
  config.MOVEMENT_SPEED_MULTIPLIER = 0.5;
  config.APOCALYPSE_MIN_INTERVAL = 1800;
  config.APOCALYPSE_MAX_INTERVAL = 3500;
}
