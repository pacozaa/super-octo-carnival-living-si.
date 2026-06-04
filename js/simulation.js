import { random } from './utils.js';
import { BASE_ORGANISMS, MAX_ORGANISMS, MAX_HUNTERS, HUNTER_SPAWN_INTERVAL, MIN_POPULATION_FOR_HUNTER_SPAWN, WORLD_WIDTH, WORLD_HEIGHT, APOCALYPSE_MIN_INTERVAL, APOCALYPSE_MAX_INTERVAL, APOCALYPSE_MIN_KILL_PERCENT, APOCALYPSE_MAX_KILL_PERCENT, APOCALYPSE_MIN_POPULATION } from './constants.js';
import { Environment } from './environment.js';
import { Organism } from './organism.js';
import { Hunter } from './hunter.js';
import { createSpecies, resetSpeciesCounter, DEFAULT_VERTEBRATE_FORM } from './species.js';
import { mutateTraits } from './traits.js';

export class Simulation {
  constructor() {
    this.reset();
  }

  reset() {
    resetSpeciesCounter();
    this.time = 0;
    this.running = true;
    this.env = new Environment();
    const root = createSpecies({ r: 112, g: 181, b: 235 });
    this.organisms = Array.from({ length: BASE_ORGANISMS }, () => {
      const traits = mutateTraits({
        speed: 0.9,
        size: 4.2,
        vision: 50,
        fertility: 0.08,
        r: root.r,
        g: root.g,
        b: root.b
      }, 1.4);
      return new Organism(
        random(0, WORLD_WIDTH),
        random(0, WORLD_HEIGHT),
        traits,
        root
      );
    });
    this.hunters = [];
    this.lastBirths = 0;
    this.spawnHunters(2);
    this.scheduleNextApocalypse();
    this.lastApocalypseKills = 0;
  }

  update(stepCount) {
    if (!this.running) return;
    let totalBirths = 0;
    for (let i = 0; i < stepCount; i++) {
      this.time += 1;
      this.env.update();
      const newborns = [];
      for (const organism of this.organisms) {
        const child = organism.step(this.env, this.organisms, this.hunters);
        if (child) newborns.push(child);
      }
      this.organisms = this.organisms.filter((o) => o.alive);
      if (newborns.length) this.organisms.push(...newborns);

      const cubs = [];
      for (const hunter of this.hunters) {
        const cub = hunter.step(this.env, this.organisms, this.hunters);
        if (cub) cubs.push(cub);
      }
      this.hunters = this.hunters.filter((hunter) => hunter.alive);
      if (cubs.length) this.hunters.push(...cubs);
      totalBirths += newborns.length + cubs.length;

      if (this.organisms.length > MAX_ORGANISMS) {
        this.organisms.sort((a, b) => b.energy - a.energy);
        this.organisms.length = MAX_ORGANISMS;
      }
      if (this.hunters.length > MAX_HUNTERS) {
        this.hunters.sort((a, b) => b.energy - a.energy);
        this.hunters.length = MAX_HUNTERS;
      }
      if (this.organisms.length < 14) this.seedRescuePopulation();
      if (this.time % HUNTER_SPAWN_INTERVAL === 0 && this.organisms.length > MIN_POPULATION_FOR_HUNTER_SPAWN && this.hunters.length < MAX_HUNTERS) {
        this.spawnHunters(1);
      }
      if (this.time >= this.nextApocalypse && this.organisms.length > APOCALYPSE_MIN_POPULATION) {
        this.triggerApocalypse(true);
      }
    }
    this.lastBirths = totalBirths;
  }

  triggerApocalypse(automatic = false) {
    const killPercent = random(APOCALYPSE_MIN_KILL_PERCENT, APOCALYPSE_MAX_KILL_PERCENT);
    const toKill = Math.floor(this.organisms.length * killPercent);
    
    // Randomly select organisms to kill (Fisher-Yates shuffle)
    const shuffled = [...this.organisms];
    for (let i = shuffled.length - 1; i > 0; i--) {
      // random(0, i + 1) gives [0, i+1), which includes 0 to i inclusive
      const j = Math.floor(random(0, i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Kill the selected organisms
    for (let i = 0; i < toKill; i++) {
      shuffled[i].energy = 0;
    }
    
    this.organisms = this.organisms.filter((o) => o.alive);
    this.lastApocalypseKills = toKill;
    
    // Schedule next apocalypse only if this was automatic
    if (automatic) {
      this.scheduleNextApocalypse();
    }
  }

  scheduleNextApocalypse() {
    this.nextApocalypse = this.time + Math.floor(random(APOCALYPSE_MIN_INTERVAL, APOCALYPSE_MAX_INTERVAL));
  }

  seedRescuePopulation() {
    const fallback = createSpecies({ r: random(80, 255), g: random(80, 255), b: random(80, 255) });
    const traits = {
      speed: random(0.5, 1.2),
      size: random(3, 6),
      vision: random(30, 100),
      fertility: random(0.05, 0.14)
    };
    for (let i = 0; i < 9; i++) {
      this.organisms.push(
        new Organism(random(0, WORLD_WIDTH), random(0, WORLD_HEIGHT), traits, fallback)
      );
    }
  }

  spawnHunters(count) {
    for (let i = 0; i < count && this.hunters.length < MAX_HUNTERS; i++) {
      const edge = Math.floor(random(0, 4));
      const x = edge % 2 === 0 ? (edge === 0 ? 18 : WORLD_WIDTH - 18) : random(24, WORLD_WIDTH - 24);
      const y = edge % 2 === 1 ? (edge === 1 ? 18 : WORLD_HEIGHT - 18) : random(24, WORLD_HEIGHT - 24);
      this.hunters.push(new Hunter(x, y));
    }
  }

  draw(ctx) {
    this.env.draw(ctx);
    for (const organism of this.organisms) organism.draw(ctx);
    for (const hunter of this.hunters) hunter.draw(ctx);
  }

  getOrganismAt(canvasX, canvasY, radius = 18) {
    let nearest = null;
    let nearestDist = radius;
    for (const organism of this.organisms) {
      const dx = organism.x - canvasX;
      const dy = organism.y - canvasY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = organism;
      }
    }
    return nearest;
  }

  getSpeciesInfo(organism) {
    const speciesId = organism.species.id;
    let population = 0;
    let generationSum = 0;
    for (const o of this.organisms) {
      if (o.species.id === speciesId) {
        population++;
        generationSum += o.generation;
      }
    }
    const avgGen = population ? generationSum / population : 0;

    const FORM_FACTS = {
      'Protofish':   'A primitive aquatic ancestor — fins and tail dominate its form.',
      'Tiktaalik':   'Transitional fossil between fish and tetrapods; early wrist bones emerge.',
      'Lobe-fin':    'Lobe-finned fish; early limb buds hint at a life on land.',
      'Amphibian':   'Crawls between water and land, pioneer of terrestrial life.',
      'Synapsid':    'Mammal-like reptile; ancestors of modern mammals with unique skull openings.',
      'Reptile':     'Fully terrestrial — scaled skin and sturdy limbs define it.',
      'Diapsid':     'Reptile with two skull openings; ancestor of dinosaurs, birds, and lizards.',
      'Dinosaur':    'Dominant terrestrial vertebrate; powerful legs and upright posture.',
      'Avian':       'Winged apex form; lightweight and built for speed.',
    };

    return {
      speciesId,
      color: `rgb(${organism.species.r}, ${organism.species.g}, ${organism.species.b})`,
      formName: organism.getFormName(),
      population,
      avgGeneration: Math.round(avgGen),
      speed: organism.speed.toFixed(2),
      size: organism.size.toFixed(1),
      vision: Math.round(organism.vision),
      fertility: (organism.fertility * 100).toFixed(1),
      complexity: (organism.complexity * 100).toFixed(0),
      energy: Math.round(organism.energy),
      state: organism.state,
      fact: FORM_FACTS[organism.getFormName()] ?? ''
    };
  }

  buildStats() {
    const speciesCounts = new Map();
    let oldest = 0;
    let fleeing = 0;
    for (const organism of this.organisms) {
      oldest = Math.max(oldest, organism.generation);
      speciesCounts.set(organism.species.id, (speciesCounts.get(organism.species.id) || 0) + 1);
      if (organism.state === "fleeing") fleeing += 1;
    }
    const sorted = [...speciesCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const leaders = sorted.map(([id, count]) => `S${id}:${count}`).join(" ");
    return `Time: ${this.time}  Population: ${this.organisms.length}  Hunters: ${this.hunters.length}  Species: ${speciesCounts.size}  Max generation: ${oldest}  Alerted: ${fleeing}${leaders ? `  Dominant: ${leaders}` : ""}`;
  }

  buildDetails() {
    const averageEnergy = this.organisms.length
      ? Math.round(this.organisms.reduce((sum, organism) => sum + organism.energy, 0) / this.organisms.length)
      : 0;
    const formCounts = new Map();
    for (const organism of this.organisms) {
      const form = organism.getFormName();
      formCounts.set(form, (formCounts.get(form) || 0) + 1);
    }
    const dominantForms = [...formCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([form, count]) => `${form}:${count}`)
      .join(" ");
    const apexGeneration = this.hunters.reduce((best, hunter) => Math.max(best, hunter.generation), 0);
    const timeToApocalypse = Math.max(0, this.nextApocalypse - this.time);
    const details = [
      `Season pulse ${this.env.season.toFixed(2)}`,
      `Climate event: ${this.env.event.name}`,
      `Mutation pressure ${this.env.event.mutation.toFixed(2)}x`,
      `Average energy ${averageEnergy}`,
      `Births this frame ${this.lastBirths}`,
      `Apex generation ${apexGeneration}`,
      `Forms ${dominantForms || `${DEFAULT_VERTEBRATE_FORM}:0`}`,
      `Next apocalypse in ${timeToApocalypse} ticks`
    ];
    if (this.lastApocalypseKills > 0) {
      details.push(`Last apocalypse killed ${this.lastApocalypseKills}`);
    }
    return details.join("  |  ");
  }
}
