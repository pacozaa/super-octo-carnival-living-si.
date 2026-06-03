import { random, clamp, distance, chance } from './utils.js';
import { WORLD_WIDTH, WORLD_HEIGHT, CELL, GRID_W, GRID_H, REPRODUCTION_ENERGY, REPRODUCTION_COST, TICK_DAMAGE, ORGANISM_MIN_SAFETY_RADIUS, SAFETY_RADIUS_VISION_FACTOR, MAX_ORGANISMS } from './constants.js';
import { speciesColor, colorDistance, createSpecies, describeVertebrateForm, morphologyDistance } from './species.js';
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
    }, env.event.mutation);
    const maybeNewSpecies =
      colorDistance(mutated, this.species) > 24 ||
      morphologyDistance(mutated, this.species) > 3.6 ||
      chance(0.01 * Math.max(1, env.event.mutation));
    const species = maybeNewSpecies ? createSpecies(mutated) : this.species;
    return new Organism(
      clamp(this.x + random(-10, 10), 1, WORLD_WIDTH - 1),
      clamp(this.y + random(-10, 10), 1, WORLD_HEIGHT - 1),
      mutated,
      species,
      this.generation + 1
    );
  }

  getFormName() {
    return describeVertebrateForm(this).name;
  }

  getVisualProfile() {
    const current = describeVertebrateForm(this);
    const speciesMorphology = this.species.morphology || current.morphology;
    const maturity = 0.72 + Math.min(this.age, 900) / 3200;

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
    const color = speciesColor(this.species);
    const bodyLength = Math.max(this.size * 1.8, profile.body);
    const bodyHeight = Math.max(this.size * 1.05, bodyLength * 0.34);
    const headX = bodyLength * 0.42 + profile.neck * 0.3;
    const headRadius = Math.max(this.size * 0.42, bodyHeight * 0.28);
    const angle = Math.atan2(this.vy, this.vx);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(6, 14, 24, 0.35)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.45, 0);
    ctx.quadraticCurveTo(-bodyLength * 0.62, -bodyHeight * 0.18, -bodyLength * 0.45 - profile.tail, 0);
    ctx.quadraticCurveTo(-bodyLength * 0.62, bodyHeight * 0.18, -bodyLength * 0.45, 0);
    ctx.closePath();
    ctx.fill();

    if (profile.stageIndex <= 1) {
      const finReach = profile.fin * 0.9;
      ctx.beginPath();
      ctx.moveTo(-bodyLength * 0.1, -bodyHeight * 0.15);
      ctx.lineTo(-bodyLength * 0.22, -bodyHeight * 0.45 - finReach);
      ctx.lineTo(bodyLength * 0.05, -bodyHeight * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-bodyLength * 0.05, bodyHeight * 0.15);
      ctx.lineTo(-bodyLength * 0.2, bodyHeight * 0.42 + finReach);
      ctx.lineTo(bodyLength * 0.08, bodyHeight * 0.26);
      ctx.closePath();
      ctx.fill();
    } else {
      const legPairs = profile.stageIndex >= 3 ? 2 : 1;
      for (let i = 0; i < legPairs; i++) {
        const offset = legPairs === 1 ? 0 : i === 0 ? -bodyLength * 0.15 : bodyLength * 0.1;
        const rear = 0.55 + i * 0.08;
        const front = 0.7 + i * 0.1;
        const spread = 1.4 + profile.limbs * 0.28;
        ctx.beginPath();
        ctx.moveTo(offset, bodyHeight * 0.22);
        ctx.lineTo(offset - spread, bodyHeight * rear);
        ctx.lineTo(offset - spread * 0.7, bodyHeight * front);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(offset + bodyLength * 0.08, bodyHeight * 0.18);
        ctx.lineTo(offset + spread, bodyHeight * rear);
        ctx.lineTo(offset + spread * 0.75, bodyHeight * front);
        ctx.stroke();
      }
    }

    if (profile.crest > 0.5) {
      const spikes = Math.max(2, Math.round(profile.crest));
      for (let i = 0; i < spikes; i++) {
        const ratio = spikes === 1 ? 0.5 : i / (spikes - 1);
        const x = -bodyLength * 0.2 + ratio * bodyLength * 0.65;
        const height = profile.crest * (0.45 + ratio * 0.2);
        ctx.beginPath();
        ctx.moveTo(x - 0.9, -bodyHeight * 0.3);
        ctx.lineTo(x, -bodyHeight * 0.45 - height);
        ctx.lineTo(x + 0.9, -bodyHeight * 0.3);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (profile.stageIndex >= 4 || profile.wing > 1.4) {
      const wingSpan = profile.wing + bodyLength * 0.2;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(-bodyLength * 0.05, -bodyHeight * 0.08);
      ctx.lineTo(-bodyLength * 0.35, -bodyHeight * 0.82 - wingSpan * 0.35);
      ctx.lineTo(bodyLength * 0.1, -bodyHeight * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -bodyHeight * 0.02);
      ctx.lineTo(bodyLength * 0.38, -bodyHeight * 0.74 - wingSpan * 0.28);
      ctx.lineTo(bodyLength * 0.16, -bodyHeight * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    ctx.ellipse(0, 0, bodyLength * 0.5, bodyHeight * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(headX, -bodyHeight * 0.06, headRadius * 1.05, headRadius * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f4fbff";
    ctx.beginPath();
    ctx.arc(headX + headRadius * 0.2, -bodyHeight * 0.12, Math.max(0.7, headRadius * 0.18), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
