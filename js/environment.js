import { random, clamp } from './utils.js';
import { WORLD_WIDTH, WORLD_HEIGHT, CELL, GRID_W, GRID_H, MIN_EVENT_INTERVAL, EVENT_INTERVAL_VARIANCE } from './constants.js';

export const pickClimateEvent = () => {
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
};

export class Environment {
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
      this.nextEventTick = this.tick + MIN_EVENT_INTERVAL + Math.floor(random(0, EVENT_INTERVAL_VARIANCE));
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
