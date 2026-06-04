import { random, clamp, distance, chance } from './utils.js';
import { WORLD_WIDTH, WORLD_HEIGHT, CELL, GRID_W, GRID_H, ORGANISM_MIN_SAFETY_RADIUS, SAFETY_RADIUS_VISION_FACTOR } from './constants.js';
import { speciesColor, colorDistance, createSpecies, describeVertebrateForm, morphologyDistance } from './species.js';
import { mutateTraits } from './traits.js';
import { config } from './config.js';
import { drawEnhancedOrganism } from './graphics.js';

const BASE_MATURITY = 0.72;
const MAX_MATURITY_AGE = 900;
const MATURITY_SCALE = 3200;
const BREEDING_AGE = 120;
const BREEDING_RANGE_FACTOR = 0.55;
const BREEDING_COOLDOWN = 80;
const BREEDING_ENERGY_BUFFER = 10;
const WING_RENDERING_STAGE = 7;
const SINGLE_LEG_OFFSET = 0;
const FRONT_LEG_BACK_OFFSET = 0.15;
const REAR_LEG_FRONT_OFFSET = 0.1;
const LEG_REAR_BASE = 0.55;
const LEG_REAR_OFFSET = 0.08;
const LEG_FRONT_BASE = 0.7;
const LEG_FRONT_OFFSET = 0.1;
const MIN_EYE_RADIUS = 0.7;

const getLegOffset = (legPairs, index, bodyLength) => {
  if (legPairs === 1) return SINGLE_LEG_OFFSET;
  return index === 0 ? -bodyLength * FRONT_LEG_BACK_OFFSET : bodyLength * REAR_LEG_FRONT_OFFSET;
};

export class Organism {
  constructor(x, y, traits, species, generation = 1) {
    this.x = x;
    this.y = y;
    this.energy = random(95, 130);
    this.age = 0;
    this.generation = generation;
    this.species = species;
    this.speed = traits.speed;
    this.size = traits.size;
    this.vision = traits.vision;
    this.fertility = traits.fertility;
    this.body = traits.body ?? this.size * 2.4;
    this.tail = traits.tail ?? this.size * 1.5;
    this.fin = traits.fin ?? Math.max(1.1, this.vision / 22);
    this.limbs = traits.limbs ?? 0.4;
    this.neck = traits.neck ?? this.size * 0.28;
    this.crest = traits.crest ?? this.fertility * 18;
    this.wing = traits.wing ?? 0;
    this.complexity = traits.complexity ?? 0.18;
    this.vx = random(-1, 1);
    this.vy = random(-1, 1);
    this.state = "foraging";
    this.breedCooldown = 0;
  }

  get alive() {
    return this.energy > 0 && this.age < 6200;
  }

  step(env, organisms, hunters) {
    this.age += 1;
    if (this.breedCooldown > 0) this.breedCooldown -= 1;
    const threat = this.findThreat(hunters);
    const target = threat ? null : this.findRichTarget(env);

    if (threat) {
      this.state = "fleeing";
      this.evade(threat, env.event.instability);
    } else {
      this.state = "foraging";
      this.steer(target, env.event.instability);
    }

    this.x = clamp(this.x + this.vx * this.speed * config.MOVEMENT_SPEED_MULTIPLIER, 1, WORLD_WIDTH - 1);
    this.y = clamp(this.y + this.vy * this.speed * config.MOVEMENT_SPEED_MULTIPLIER, 1, WORLD_HEIGHT - 1);
    if (this.x <= 1 || this.x >= WORLD_WIDTH - 1) this.vx *= -1;
    if (this.y <= 1 || this.y >= WORLD_HEIGHT - 1) this.vy *= -1;

    const intake = env.eat(this.x, this.y, 2.5 + this.size * 0.9);
    this.energy += intake * (0.65 + this.fertility);
    this.energy -= config.TICK_DAMAGE + this.speed * 0.13 + this.size * 0.08 + env.getTravelPenalty(this.x, this.y);
    if (threat) this.energy -= 0.06;

    if (!threat && organisms.length < config.MAX_ORGANISMS) {
      const mate = this.findMate(organisms);
      if (
        mate &&
        this.energy > config.REPRODUCTION_ENERGY + BREEDING_ENERGY_BUFFER &&
        mate.energy > config.REPRODUCTION_ENERGY + BREEDING_ENERGY_BUFFER
      ) {
        const sharedCost = config.REPRODUCTION_COST * 0.58;
        this.energy -= sharedCost;
        mate.energy -= sharedCost;
        this.state = "spawning";
        mate.state = "spawning";
        this.breedCooldown = BREEDING_COOLDOWN;
        mate.breedCooldown = BREEDING_COOLDOWN;
        return this.reproduce(env, mate);
      }

      if (this.energy > config.REPRODUCTION_ENERGY) {
        this.energy -= config.REPRODUCTION_COST;
        this.state = "spawning";
        this.breedCooldown = BREEDING_COOLDOWN;
        return this.reproduce(env);
      }
    }
    return null;
  }

  findMate(organisms) {
    if (this.age < BREEDING_AGE || this.breedCooldown > 0) return null;
    const range = Math.max(12, this.vision * BREEDING_RANGE_FACTOR);
    let best = null;
    let bestDistance = Infinity;
    for (const candidate of organisms) {
      if (candidate === this) continue;
      if (candidate.species.id !== this.species.id) continue;
      if (candidate.age < BREEDING_AGE || candidate.breedCooldown > 0) continue;
      if (candidate.energy <= config.REPRODUCTION_ENERGY + BREEDING_ENERGY_BUFFER) continue;
      if (candidate.state === "fleeing") continue;
      const dist = distance(this.x, this.y, candidate.x, candidate.y);
      if (dist < range && dist < bestDistance) {
        bestDistance = dist;
        best = candidate;
      }
    }
    return best;
  }

  findThreat(hunters) {
    let threat = null;
    let bestDistance = Infinity;
    const safetyRadius = Math.max(ORGANISM_MIN_SAFETY_RADIUS, this.vision * SAFETY_RADIUS_VISION_FACTOR);
    for (const hunter of hunters) {
      const dist = distance(this.x, this.y, hunter.x, hunter.y);
      if (dist < safetyRadius && dist < bestDistance) {
        bestDistance = dist;
        threat = hunter;
      }
    }
    return threat;
  }

  findRichTarget(env) {
    let best = null;
    let bestScore = -Infinity;
    const cx = Math.floor(this.x / CELL);
    const cy = Math.floor(this.y / CELL);
    const radius = Math.floor(this.vision / CELL);
    for (let dy = -radius; dy <= radius; dy++) {
      const gy = cy + dy;
      if (gy < 0 || gy >= GRID_H) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        const gx = cx + dx;
        if (gx < 0 || gx >= GRID_W) continue;
        const dist = Math.max(1, Math.abs(dx) + Math.abs(dy));
        const nutrient = env.cells[gy][gx].nutrient;
        const score = nutrient / dist;
        if (score > bestScore) {
          bestScore = score;
          best = { x: gx * CELL + CELL * 0.5, y: gy * CELL + CELL * 0.5 };
        }
      }
    }
    return best;
  }

  steer(target, instability = 0.08) {
    if (!target) return;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / mag;
    const ny = dy / mag;
    this.vx = this.vx * 0.75 + nx * 0.25 + random(-instability, instability);
    this.vy = this.vy * 0.75 + ny * 0.25 + random(-instability, instability);
    const norm = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
    this.vx /= norm;
    this.vy /= norm;
  }

  evade(hunter, instability = 0.08) {
    const dx = this.x - hunter.x;
    const dy = this.y - hunter.y;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / mag;
    const ny = dy / mag;
    this.vx = this.vx * 0.58 + nx * 0.42 + random(-instability, instability);
    this.vy = this.vy * 0.58 + ny * 0.42 + random(-instability, instability);
    const norm = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
    this.vx /= norm;
    this.vy /= norm;
  }

  reproduce(env, mate = null) {
    const parentSeed = mate ? {
      speed: (this.speed + mate.speed) * 0.5,
      size: (this.size + mate.size) * 0.5,
      vision: (this.vision + mate.vision) * 0.5,
      fertility: (this.fertility + mate.fertility) * 0.5,
      body: (this.body + mate.body) * 0.5,
      tail: (this.tail + mate.tail) * 0.5,
      fin: (this.fin + mate.fin) * 0.5,
      limbs: (this.limbs + mate.limbs) * 0.5,
      neck: (this.neck + mate.neck) * 0.5,
      crest: (this.crest + mate.crest) * 0.5,
      wing: (this.wing + mate.wing) * 0.5,
      complexity: (this.complexity + mate.complexity) * 0.5,
      r: (this.species.r + mate.species.r) * 0.5,
      g: (this.species.g + mate.species.g) * 0.5,
      b: (this.species.b + mate.species.b) * 0.5
    } : {
      speed: this.speed,
      size: this.size,
      vision: this.vision,
      fertility: this.fertility,
      body: this.body,
      tail: this.tail,
      fin: this.fin,
      limbs: this.limbs,
      neck: this.neck,
      crest: this.crest,
      wing: this.wing,
      complexity: this.complexity,
      r: this.species.r,
      g: this.species.g,
      b: this.species.b
    };
    const mutated = mutateTraits(parentSeed, env.event.mutation);
    const maybeNewSpecies =
      colorDistance(mutated, this.species) > 24 ||
      morphologyDistance(mutated, this.species) > 3.6 ||
      chance(0.01 * Math.max(1, env.event.mutation));
    const species = maybeNewSpecies ? createSpecies(mutated, this.species.id) : this.species;
    const baseX = mate ? (this.x + mate.x) * 0.5 : this.x;
    const baseY = mate ? (this.y + mate.y) * 0.5 : this.y;
    return new Organism(
      clamp(baseX + random(-10, 10), 1, WORLD_WIDTH - 1),
      clamp(baseY + random(-10, 10), 1, WORLD_HEIGHT - 1),
      mutated,
      species,
      Math.max(this.generation, mate?.generation ?? this.generation) + 1
    );
  }

  getFormName() {
    return describeVertebrateForm(this).name;
  }

  getVisualProfile() {
    const current = describeVertebrateForm(this);
    const speciesMorphology = this.species.morphology || current.morphology;
    const maturity = BASE_MATURITY + Math.min(this.age, MAX_MATURITY_AGE) / MATURITY_SCALE;

    return {
      stageIndex: current.stageIndex,
      body: (speciesMorphology.body * 0.55 + current.morphology.body * 0.45) * maturity,
      tail: speciesMorphology.tail * 0.5 + current.morphology.tail * 0.5,
      fin: speciesMorphology.fin * 0.35 + current.morphology.fin * 0.65,
      limbs: speciesMorphology.limbs * 0.4 + current.morphology.limbs * 0.6,
      neck: speciesMorphology.neck * 0.45 + current.morphology.neck * 0.55,
      crest: speciesMorphology.crest * 0.35 + current.morphology.crest * 0.65,
      wing: speciesMorphology.wing * 0.3 + current.morphology.wing * 0.7
    };
  }

  draw(ctx) {
    const profile = this.getVisualProfile();
    const bodyLength = Math.max(this.size * 1.8, profile.body);
    const bodyHeight = Math.max(this.size * 1.05, bodyLength * 0.34);
    const headX = bodyLength * 0.42 + profile.neck * 0.3;
    const headRadius = Math.max(this.size * 0.42, bodyHeight * 0.28);
    const angle = Math.atan2(this.vy, this.vx);

    drawEnhancedOrganism(ctx, this, profile, bodyLength, bodyHeight, headX, headRadius, angle);
  }
}
