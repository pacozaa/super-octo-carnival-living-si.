import { random, clamp, distance, distanceSq } from './utils.js';
import { WORLD_WIDTH, WORLD_HEIGHT, MIN_PREY_DISTANCE, HUNTER_REPRODUCTION_ENERGY, HUNTER_REPRODUCTION_COST, HUNTER_MIN_SIZE, HUNTER_MAX_SIZE, HUNTER_MIN_VISION, HUNTER_MAX_VISION, HUNTER_SIZE_DRAIN_FACTOR } from './constants.js';
import { config } from './config.js';

export class Hunter {
  constructor(x, y, generation = 1) {
    this.x = x;
    this.y = y;
    this.energy = random(92, 125);
    this.age = 0;
    this.generation = generation;
    this.speed = random(config.HUNTER_MIN_SPEED, config.HUNTER_MAX_SPEED);
    this.size = random(HUNTER_MIN_SIZE, HUNTER_MAX_SIZE);
    this.vision = random(HUNTER_MIN_VISION, HUNTER_MAX_VISION);
    this.vx = random(-1, 1);
    this.vy = random(-1, 1);
  }

  get alive() {
    return this.energy > 0 && this.age < 5200;
  }

  step(env, organisms, hunters) {
    this.age += 1;
    const hunt = this.findPrey(organisms);
    if (hunt) {
      this.steer(hunt.prey, env.event.instability * 0.7);
    } else {
      this.vx += random(-0.08, 0.08);
      this.vy += random(-0.08, 0.08);
    }

    const norm = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
    this.vx /= norm;
    this.vy /= norm;

    this.x = clamp(this.x + this.vx * this.speed * config.MOVEMENT_SPEED_MULTIPLIER, 1, WORLD_WIDTH - 1);
    this.y = clamp(this.y + this.vy * this.speed * config.MOVEMENT_SPEED_MULTIPLIER, 1, WORLD_HEIGHT - 1);
    if (this.x <= 1 || this.x >= WORLD_WIDTH - 1) this.vx *= -1;
    if (this.y <= 1 || this.y >= WORLD_HEIGHT - 1) this.vy *= -1;

    if (hunt && distanceSq(this.x, this.y, hunt.prey.x, hunt.prey.y) < (this.size + hunt.prey.size + 4) ** 2) {
      const drain = Math.min(hunt.prey.energy, config.HUNTER_BASE_DRAIN + this.size * HUNTER_SIZE_DRAIN_FACTOR);
      hunt.prey.energy -= drain;
      this.energy += drain * 0.92;
    }

    this.energy -= 0.42 + this.speed * 0.18 + env.getTravelPenalty(this.x, this.y) * 0.4;

    if (this.energy > HUNTER_REPRODUCTION_ENERGY && hunters.length < config.MAX_HUNTERS) {
      this.energy -= HUNTER_REPRODUCTION_COST;
      return new Hunter(
        clamp(this.x + random(-18, 18), 1, WORLD_WIDTH - 1),
        clamp(this.y + random(-18, 18), 1, WORLD_HEIGHT - 1),
        this.generation + 1
      );
    }

    return null;
  }

  findPrey(organisms) {
    let best = null;
    let bestScore = -Infinity;
    for (const organism of organisms) {
      const dist = distance(this.x, this.y, organism.x, organism.y);
      if (dist > this.vision) continue;
      const score = (organism.energy + organism.size * config.PREY_SIZE_SCORE_WEIGHT) / Math.max(dist, MIN_PREY_DISTANCE);
      if (score > bestScore) {
        bestScore = score;
        best = { prey: organism };
      }
    }
    return best;
  }

  steer(target, instability = 0.05) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / mag;
    const ny = dy / mag;
    this.vx = this.vx * 0.7 + nx * 0.3 + random(-instability, instability);
    this.vy = this.vy * 0.7 + ny * 0.3 + random(-instability, instability);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -this.size - 3);
    ctx.lineTo(this.size * 0.8, this.size);
    ctx.lineTo(0, this.size * 0.35);
    ctx.lineTo(-this.size * 0.8, this.size);
    ctx.closePath();
    ctx.fillStyle = "#ff6b6b";
    ctx.fill();
    ctx.restore();
  }
}
