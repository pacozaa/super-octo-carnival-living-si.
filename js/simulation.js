import { random } from './utils.js';
import { BASE_ORGANISMS, MAX_ORGANISMS, MAX_HUNTERS, HUNTER_SPAWN_INTERVAL, MIN_POPULATION_FOR_HUNTER_SPAWN } from './constants.js';
import { Environment } from './environment.js';
import { Organism } from './organism.js';
import { Hunter } from './hunter.js';
import { createSpecies, resetSpeciesCounter } from './species.js';
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
        random(0, 900),
        random(0, 560),
        traits,
        root
      );
    });
    this.hunters = [];
    this.spawnHunters(2);
  }

  update(stepCount) {
    if (!this.running) return;
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
    }
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
        new Organism(random(0, 900), random(0, 560), traits, fallback)
      );
    }
  }

  spawnHunters(count) {
    for (let i = 0; i < count && this.hunters.length < MAX_HUNTERS; i++) {
      const edge = Math.floor(random(0, 4));
      const x = edge % 2 === 0 ? (edge === 0 ? 18 : 900 - 18) : random(24, 900 - 24);
      const y = edge % 2 === 1 ? (edge === 1 ? 18 : 560 - 18) : random(24, 560 - 24);
      this.hunters.push(new Hunter(x, y));
    }
  }

  draw(ctx) {
    this.env.draw(ctx);
    for (const organism of this.organisms) organism.draw(ctx);
    for (const hunter of this.hunters) hunter.draw(ctx);
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
    const apexGeneration = this.hunters.reduce((best, hunter) => Math.max(best, hunter.generation), 0);
    return `Season pulse ${this.env.season.toFixed(2)}  |  Climate event: ${this.env.event.name}  |  Mutation pressure ${this.env.event.mutation.toFixed(2)}x  |  Average energy ${averageEnergy}  |  Apex generation ${apexGeneration}`;
  }
}
