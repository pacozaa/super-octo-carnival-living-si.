import { random, clamp, distance, chance } from './utils.js';
import { WORLD_WIDTH, WORLD_HEIGHT, CELL, GRID_W, GRID_H, REPRODUCTION_ENERGY, REPRODUCTION_COST, TICK_DAMAGE, ORGANISM_MIN_SAFETY_RADIUS, SAFETY_RADIUS_VISION_FACTOR, MAX_ORGANISMS } from './constants.js';
import { speciesColor, colorDistance, createSpecies } from './species.js';
import { mutateTraits } from './traits.js';

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
    this.vx = random(-1, 1);
    this.vy = random(-1, 1);
    this.state = "foraging";
  }

  get alive() {
    return this.energy > 0 && this.age < 6200;
  }

  step(env, organisms, hunters) {
    this.age += 1;
    const threat = this.findThreat(hunters);
    const target = threat ? null : this.findRichTarget(env);

    if (threat) {
      this.state = "fleeing";
      this.evade(threat, env.event.instability);
    } else {
      this.state = "foraging";
      this.steer(target, env.event.instability);
    }

    this.x = clamp(this.x + this.vx * this.speed, 1, WORLD_WIDTH - 1);
    this.y = clamp(this.y + this.vy * this.speed, 1, WORLD_HEIGHT - 1);
    if (this.x <= 1 || this.x >= WORLD_WIDTH - 1) this.vx *= -1;
    if (this.y <= 1 || this.y >= WORLD_HEIGHT - 1) this.vy *= -1;

    const intake = env.eat(this.x, this.y, 2.5 + this.size * 0.9);
    this.energy += intake * (0.65 + this.fertility);
    this.energy -= TICK_DAMAGE + this.speed * 0.13 + this.size * 0.08 + env.getTravelPenalty(this.x, this.y);
    if (threat) this.energy -= 0.06;

    if (this.energy > REPRODUCTION_ENERGY && organisms.length < MAX_ORGANISMS) {
      this.energy -= REPRODUCTION_COST;
      this.state = "spawning";
      return this.reproduce(env);
    }
    return null;
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

  reproduce(env) {
    const mutated = mutateTraits({
      speed: this.speed,
      size: this.size,
      vision: this.vision,
      fertility: this.fertility,
      r: this.species.r,
      g: this.species.g,
      b: this.species.b
    }, env.event.mutation);
    const maybeNewSpecies = colorDistance(mutated, this.species) > 24 || chance(0.01 * Math.max(1, env.event.mutation));
    const species = maybeNewSpecies ? createSpecies(mutated) : this.species;
    return new Organism(
      clamp(this.x + random(-10, 10), 1, WORLD_WIDTH - 1),
      clamp(this.y + random(-10, 10), 1, WORLD_HEIGHT - 1),
      mutated,
      species,
      this.generation + 1
    );
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = speciesColor(this.species);
    ctx.fill();
  }
}
