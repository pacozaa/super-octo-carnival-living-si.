(function () {
  const canvas = document.getElementById("world");
  const ctx = canvas.getContext("2d");
  const speedSelect = document.getElementById("speed");
  const pauseBtn = document.getElementById("pause");
  const resetBtn = document.getElementById("reset");
  const statsEl = document.getElementById("stats");
  const detailsEl = document.getElementById("details");

  const WORLD_WIDTH = canvas.width;
  const WORLD_HEIGHT = canvas.height;
  const CELL = 14;
  const GRID_W = Math.floor(WORLD_WIDTH / CELL);
  const GRID_H = Math.floor(WORLD_HEIGHT / CELL);
  const BASE_ORGANISMS = 48;
  const MAX_ORGANISMS = 420;
  const MAX_HUNTERS = 10;
  const REPRODUCTION_ENERGY = 170;
  const REPRODUCTION_COST = 75;
  const TICK_DAMAGE = 0.22;
  const HUNTER_REPRODUCTION_ENERGY = 185;
  const HUNTER_REPRODUCTION_COST = 82;
  const HUNTER_SPAWN_INTERVAL = 720;

  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const chance = (value) => Math.random() < value;
  const distanceSq = (ax, ay, bx, by) => {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  };
  const distance = (ax, ay, bx, by) => Math.sqrt(distanceSq(ax, ay, bx, by));

  let speciesCounter = 1;

  function createSpecies(seed) {
    return {
      id: speciesCounter++,
      r: clamp(Math.round(seed.r), 30, 255),
      g: clamp(Math.round(seed.g), 30, 255),
      b: clamp(Math.round(seed.b), 30, 255)
    };
  }

  function speciesColor(species) {
    return `rgb(${species.r}, ${species.g}, ${species.b})`;
  }

  function mutateTraits(parent, mutationPower = 1) {
    const drift = (value, amount, min, max) => clamp(value + random(-amount, amount) * mutationPower, min, max);
    return {
      speed: drift(parent.speed, 0.12, 0.25, 2.4),
      size: drift(parent.size, 0.28, 2.4, 8.8),
      vision: drift(parent.vision, 4.5, 16, 140),
      fertility: drift(parent.fertility, 0.02, 0.01, 0.25),
      r: drift(parent.r, 16, 0, 255),
      g: drift(parent.g, 16, 0, 255),
      b: drift(parent.b, 16, 0, 255)
    };
  }

  function colorDistance(a, b) {
    return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
  }

  function pickClimateEvent() {
    const roll = Math.random();
    if (roll < 0.34) {
      return {
        name: "Bloom",
        growth: 1.42,
        pressure: -0.03,
        mutation: 1.05,
        instability: 0.04,
        tint: { r: 14, g: 32, b: 10 }
      };
    }
    if (roll < 0.63) {
      return {
        name: "Drought",
        growth: 0.54,
        pressure: 0.12,
        mutation: 1,
        instability: 0.06,
        tint: { r: 50, g: 24, b: 0 }
      };
    }
    if (roll < 0.86) {
      return {
        name: "Stormfront",
        growth: 0.92,
        pressure: 0.06,
        mutation: 1.12,
        instability: 0.14,
        tint: { r: 8, g: 14, b: 42 }
      };
    }
    return {
      name: "Aurora",
      growth: 1.1,
      pressure: 0.01,
      mutation: 1.35,
      instability: 0.18,
      tint: { r: 18, g: 0, b: 32 }
    };
  }

  class Environment {
    constructor() {
      this.tick = 0;
      this.season = 1;
      this.event = {
        name: "Temperate",
        growth: 1,
        pressure: 0,
        mutation: 1,
        instability: 0.05,
        tint: { r: 0, g: 0, b: 0 }
      };
      this.nextEventTick = 900;
      this.cells = Array.from({ length: GRID_H }, (_, y) =>
        Array.from({ length: GRID_W }, (_, x) => {
          const gradient = (x / GRID_W) * 0.18 + (y / GRID_H) * 0.12;
          return {
            fertility: clamp(random(0.2, 1) + gradient, 0.1, 1.3),
            nutrient: random(55, 145)
          };
        })
      );
    }

    update() {
      this.tick += 1;
      this.season = 0.45 + 0.35 * Math.sin(this.tick * 0.004);
      if (this.tick >= this.nextEventTick) {
        this.event = pickClimateEvent();
        this.nextEventTick = this.tick + 800 + Math.floor(random(0, 540));
      }
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const cell = this.cells[y][x];
          const wave = 0.08 * Math.sin(this.tick * 0.03 + x * 0.7 + y * 0.4);
          const richness = cell.fertility * this.event.growth * (0.84 + this.season + wave);
          cell.nutrient = clamp(cell.nutrient + richness, 0, 220);
        }
      }
    }

    getCell(x, y) {
      const gx = clamp(Math.floor(x / CELL), 0, GRID_W - 1);
      const gy = clamp(Math.floor(y / CELL), 0, GRID_H - 1);
      return this.cells[gy][gx];
    }

    getTravelPenalty(x, y) {
      const cell = this.getCell(x, y);
      const scarcity = cell.nutrient < 35 ? (35 - cell.nutrient) / 220 : 0;
      const roughness = (1.2 - cell.fertility) * 0.03;
      return Math.max(0, this.event.pressure + scarcity + roughness);
    }

    eat(x, y, bite) {
      const cell = this.getCell(x, y);
      const consumed = Math.min(cell.nutrient, bite);
      cell.nutrient -= consumed;
      return consumed;
    }

    draw(ctx) {
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const cell = this.cells[y][x];
          const value = cell.nutrient / 220;
          const r = Math.round(8 + value * 32 + this.event.tint.r);
          const g = Math.round(24 + value * 150 + this.event.tint.g);
          const b = Math.round(20 + value * 54 + this.event.tint.b);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }
  }

  class Organism {
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
      const safetyRadius = Math.max(52, this.vision * 0.95);
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
      const maybeNewSpecies = colorDistance(mutated, this.species) > 24 || chance(0.01 * env.event.mutation);
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

  class Hunter {
    constructor(x, y, generation = 1) {
      this.x = x;
      this.y = y;
      this.energy = random(92, 125);
      this.age = 0;
      this.generation = generation;
      this.speed = random(1.05, 1.75);
      this.size = random(6, 9.5);
      this.vision = random(90, 175);
      this.vx = random(-1, 1);
      this.vy = random(-1, 1);
    }

    get alive() {
      return this.energy > 0 && this.age < 5200;
    }

    step(env, organisms, hunters) {
      this.age += 1;
      const prey = this.findPrey(organisms);
      if (prey) {
        this.steer(prey, env.event.instability * 0.7);
      } else {
        this.vx += random(-0.08, 0.08);
        this.vy += random(-0.08, 0.08);
      }

      const norm = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
      this.vx /= norm;
      this.vy /= norm;

      this.x = clamp(this.x + this.vx * this.speed, 1, WORLD_WIDTH - 1);
      this.y = clamp(this.y + this.vy * this.speed, 1, WORLD_HEIGHT - 1);
      if (this.x <= 1 || this.x >= WORLD_WIDTH - 1) this.vx *= -1;
      if (this.y <= 1 || this.y >= WORLD_HEIGHT - 1) this.vy *= -1;

      if (prey && distanceSq(this.x, this.y, prey.x, prey.y) < (this.size + prey.size + 4) ** 2) {
        const drain = Math.min(prey.energy, 28 + this.size);
        prey.energy -= drain;
        this.energy += drain * 0.92;
      }

      this.energy -= 0.42 + this.speed * 0.18 + env.getTravelPenalty(this.x, this.y) * 0.4;

      if (this.energy > HUNTER_REPRODUCTION_ENERGY && hunters.length < MAX_HUNTERS) {
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
        const score = (organism.energy + organism.size * 12) / Math.max(dist, 10);
        if (score > bestScore) {
          bestScore = score;
          best = organism;
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

  class Simulation {
    constructor() {
      this.reset();
    }

    reset() {
      speciesCounter = 1;
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
        if (cubs.length) this.hunters.push(...cubs.slice(0, MAX_HUNTERS - this.hunters.length));

        if (this.organisms.length > MAX_ORGANISMS) {
          this.organisms.sort((a, b) => b.energy - a.energy);
          this.organisms.length = MAX_ORGANISMS;
        }
        if (this.organisms.length < 14) this.seedRescuePopulation();
        if (this.time % HUNTER_SPAWN_INTERVAL === 0 && this.organisms.length > 85 && this.hunters.length < MAX_HUNTERS) {
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

    draw() {
      this.env.draw(ctx);
      for (const organism of this.organisms) organism.draw(ctx);
      for (const hunter of this.hunters) hunter.draw(ctx);
      statsEl.textContent = this.buildStats();
      detailsEl.textContent = this.buildDetails();
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

  const simulation = new Simulation();

  pauseBtn.addEventListener("click", () => {
    simulation.running = !simulation.running;
    pauseBtn.textContent = simulation.running ? "Pause" : "Resume";
  });

  resetBtn.addEventListener("click", () => {
    simulation.reset();
    pauseBtn.textContent = "Pause";
  });

  function frame() {
    const speed = Number(speedSelect.value || 1);
    simulation.update(speed);
    simulation.draw();
    requestAnimationFrame(frame);
  }

  frame();
})();
