(function () {
  const canvas = document.getElementById("world");
  const ctx = canvas.getContext("2d");
  const speedSelect = document.getElementById("speed");
  const pauseBtn = document.getElementById("pause");
  const resetBtn = document.getElementById("reset");
  const statsEl = document.getElementById("stats");

  const WORLD_WIDTH = canvas.width;
  const WORLD_HEIGHT = canvas.height;
  const CELL = 14;
  const GRID_W = Math.floor(WORLD_WIDTH / CELL);
  const GRID_H = Math.floor(WORLD_HEIGHT / CELL);
  const BASE_ORGANISMS = 45;
  const MAX_ORGANISMS = 450;
  const REPRODUCTION_ENERGY = 170;
  const REPRODUCTION_COST = 75;
  const TICK_DAMAGE = 0.22;

  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const distanceSq = (ax, ay, bx, by) => {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  };

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

  class Environment {
    constructor() {
      this.tick = 0;
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
      const season = 0.45 + 0.35 * Math.sin(this.tick * 0.004);
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const cell = this.cells[y][x];
          const richness = cell.fertility * (0.8 + season);
          cell.nutrient = clamp(cell.nutrient + richness, 0, 220);
        }
      }
    }

    eat(x, y, bite) {
      const gx = clamp(Math.floor(x / CELL), 0, GRID_W - 1);
      const gy = clamp(Math.floor(y / CELL), 0, GRID_H - 1);
      const cell = this.cells[gy][gx];
      const consumed = Math.min(cell.nutrient, bite);
      cell.nutrient -= consumed;
      return consumed;
    }

    draw(ctx) {
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const cell = this.cells[y][x];
          const value = cell.nutrient / 220;
          const r = Math.round(8 + value * 32);
          const g = Math.round(24 + value * 150);
          const b = Math.round(20 + value * 54);
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
    }

    get alive() {
      return this.energy > 0 && this.age < 6200;
    }

    step(env, organisms) {
      this.age += 1;
      const nearest = this.findRichTarget(env);
      this.steer(nearest);

      this.x = clamp(this.x + this.vx * this.speed, 1, WORLD_WIDTH - 1);
      this.y = clamp(this.y + this.vy * this.speed, 1, WORLD_HEIGHT - 1);
      if (this.x <= 1 || this.x >= WORLD_WIDTH - 1) this.vx *= -1;
      if (this.y <= 1 || this.y >= WORLD_HEIGHT - 1) this.vy *= -1;

      const intake = env.eat(this.x, this.y, 2.5 + this.size * 0.9);
      this.energy += intake * (0.65 + this.fertility);
      this.energy -= TICK_DAMAGE + this.speed * 0.13 + this.size * 0.08;

      if (this.energy > REPRODUCTION_ENERGY && organisms.length < MAX_ORGANISMS) {
        this.energy -= REPRODUCTION_COST;
        return this.reproduce();
      }
      return null;
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

    steer(target) {
      if (!target) return;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const mag = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / mag;
      const ny = dy / mag;
      this.vx = this.vx * 0.75 + nx * 0.25 + random(-0.08, 0.08);
      this.vy = this.vy * 0.75 + ny * 0.25 + random(-0.08, 0.08);
      const norm = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
      this.vx /= norm;
      this.vy /= norm;
    }

    reproduce() {
      const mutated = mutateTraits({
        speed: this.speed,
        size: this.size,
        vision: this.vision,
        fertility: this.fertility,
        r: this.species.r,
        g: this.species.g,
        b: this.species.b
      });
      const maybeNewSpecies = colorDistance(mutated, this.species) > 24 || Math.random() < 0.01;
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
    }

    update(stepCount) {
      if (!this.running) return;
      for (let i = 0; i < stepCount; i++) {
        this.time += 1;
        this.env.update();
        const newborns = [];
        for (const organism of this.organisms) {
          const child = organism.step(this.env, this.organisms);
          if (child) newborns.push(child);
        }
        this.organisms = this.organisms.filter((o) => o.alive);
        if (newborns.length) this.organisms.push(...newborns);
        if (this.organisms.length > MAX_ORGANISMS) {
          this.organisms.sort((a, b) => b.energy - a.energy);
          this.organisms.length = MAX_ORGANISMS;
        }
        if (this.organisms.length < 14) this.seedRescuePopulation();
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

    draw() {
      this.env.draw(ctx);
      for (const organism of this.organisms) organism.draw(ctx);
      statsEl.textContent = this.buildStats();
    }

    buildStats() {
      const speciesCounts = new Map();
      let oldest = 0;
      for (const organism of this.organisms) {
        oldest = Math.max(oldest, organism.generation);
        speciesCounts.set(organism.species.id, (speciesCounts.get(organism.species.id) || 0) + 1);
      }
      const sorted = [...speciesCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const leaders = sorted.map(([id, count]) => `S${id}:${count}`).join(" ");
      return `Time: ${this.time}  Population: ${this.organisms.length}  Species: ${speciesCounts.size}  Max generation: ${oldest}${leaders ? `  Dominant: ${leaders}` : ""}`;
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
