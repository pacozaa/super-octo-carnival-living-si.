import { random } from './utils.js';
import { WORLD_WIDTH, WORLD_HEIGHT, APOCALYPSE_MIN_KILL_PERCENT, APOCALYPSE_MAX_KILL_PERCENT, APOCALYPSE_MIN_POPULATION } from './constants.js';
import { Environment } from './environment.js';
import { Organism } from './organism.js';
import { Hunter } from './hunter.js';
import { createSpecies, resetSpeciesCounter, getSpeciesCounter, setSpeciesCounter, DEFAULT_VERTEBRATE_FORM } from './species.js';
import { mutateTraits } from './traits.js';
import { config } from './config.js';

const REPLAY_LIMIT = 80;
const TRAIT_HISTORY_LIMIT = 260;
const TRAIT_SAMPLE_INTERVAL = 30;
const MUTATION_STICK_WINDOW = 4;
const MUTATION_MIN_INTERVAL = 180;
const MUTATION_MILESTONE_LIMIT = 80;
const SNAPSHOT_TRAIT_LIMIT = 120;
const SNAPSHOT_MILESTONE_LIMIT = 40;
const deepClone = (value) => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      // Fallback below keeps compatibility with unsupported value types.
    }
  }
  return JSON.parse(JSON.stringify(value));
};
const createFallbackSpeciesCatalog = (state) => {
  if (!Array.isArray(state.organisms)) return [];
  return [...new Map(state.organisms.map((organism) => [
    organism.speciesId,
    {
      id: organism.speciesId,
      parentId: null,
      r: organism.traits?.r ?? 112,
      g: organism.traits?.g ?? 181,
      b: organism.traits?.b ?? 235,
      complexity: organism.traits?.complexity ?? 0.18
    }
  ])).values()];
};

const cloneSpecies = (species) => ({
  id: species.id,
  parentId: species.parentId ?? null,
  r: species.r,
  g: species.g,
  b: species.b,
  morphology: species.morphology,
  stageIndex: species.stageIndex,
  formName: species.formName,
  complexity: species.complexity
});

export class Simulation {
  constructor() {
    this.reset();
  }

  reset() {
    resetSpeciesCounter();
    this.time = 0;
    this.running = true;
    this.env = new Environment();
    this.replayCounter = 1;
    this.speciesCatalog = new Map();
    this.knownSpeciesIds = new Set();
    this.replayMoments = [];
    this.traitHistory = [];
    this.mutationMilestones = [];
    this.lastTraitSampleTime = 0;
    this.lastStableTraitSample = null;
    this.lastMutationStickTime = 0;

    const root = createSpecies({ r: 112, g: 181, b: 235 });
    this.registerSpecies(root);
    this.organisms = Array.from({ length: config.BASE_ORGANISMS }, () => {
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
    this.spawnHunters(2, 'initial');
    this.scheduleNextApocalypse();
    this.lastApocalypseKills = 0;
    this.prevSpeciesCounts = this.buildSpeciesCounts();
    this.captureReplayMoment('run-start', 'Run started');
    this.sampleTraitHistory(true);
  }

  registerSpecies(species) {
    if (!species || this.speciesCatalog.has(species.id)) return;
    this.speciesCatalog.set(species.id, cloneSpecies(species));
    this.knownSpeciesIds.add(species.id);
  }

  buildSpeciesCounts() {
    const counts = new Map();
    for (const organism of this.organisms) {
      counts.set(organism.species.id, (counts.get(organism.species.id) || 0) + 1);
      this.registerSpecies(organism.species);
    }
    return counts;
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
      if (newborns.length) {
        this.organisms.push(...newborns);
        for (const child of newborns) {
          if (!this.knownSpeciesIds.has(child.species.id)) {
            this.registerSpecies(child.species);
            const branchFrom = child.species.parentId ? ` from S${child.species.parentId}` : '';
            this.captureReplayMoment('species-branch', `Species S${child.species.id} branched${branchFrom}`);
          }
        }
      }

      const cubs = [];
      for (const hunter of this.hunters) {
        const cub = hunter.step(this.env, this.organisms, this.hunters);
        if (cub) cubs.push(cub);
      }
      this.hunters = this.hunters.filter((hunter) => hunter.alive);
      if (cubs.length) this.hunters.push(...cubs);
      totalBirths += newborns.length + cubs.length;

      if (this.organisms.length > config.MAX_ORGANISMS) {
        this.organisms.sort((a, b) => b.energy - a.energy);
        this.organisms.length = config.MAX_ORGANISMS;
      }
      if (this.hunters.length > config.MAX_HUNTERS) {
        this.hunters.sort((a, b) => b.energy - a.energy);
        this.hunters.length = config.MAX_HUNTERS;
      }
      if (this.organisms.length < 14) this.seedRescuePopulation();
      if (this.time % config.HUNTER_SPAWN_INTERVAL === 0 && this.organisms.length > config.MIN_POPULATION_FOR_HUNTER_SPAWN && this.hunters.length < config.MAX_HUNTERS) {
        this.spawnHunters(1, 'cycle');
      }
      if (this.time >= this.nextApocalypse && this.organisms.length > APOCALYPSE_MIN_POPULATION) {
        this.triggerApocalypse(true);
      }

      this.detectExtinctions();
      this.sampleTraitHistory();
    }
    this.lastBirths = totalBirths;
  }

  detectExtinctions() {
    const currentCounts = this.buildSpeciesCounts();
    for (const [speciesId, previousCount] of this.prevSpeciesCounts.entries()) {
      if (previousCount > 0 && !currentCounts.has(speciesId)) {
        this.captureReplayMoment('extinction', `Species S${speciesId} went extinct`);
      }
    }
    this.prevSpeciesCounts = currentCounts;
  }

  sampleTraitHistory(force = false) {
    if (!force && this.time - this.lastTraitSampleTime < TRAIT_SAMPLE_INTERVAL) return;

    const sample = this.buildTraitSample();
    this.traitHistory.push(sample);
    if (this.traitHistory.length > TRAIT_HISTORY_LIMIT) {
      this.traitHistory.shift();
    }

    this.lastTraitSampleTime = this.time;
    if (!this.lastStableTraitSample) {
      this.lastStableTraitSample = {
        speed: sample.speed,
        size: sample.size,
        vision: sample.vision
      };
      return;
    }

    // Wait until we have enough points for a stability window before detecting sticky mutations.
    if (this.traitHistory.length < MUTATION_STICK_WINDOW) {
      return;
    }
    // Avoid flooding the timeline with repeated stick events in short bursts.
    if (this.time - this.lastMutationStickTime < MUTATION_MIN_INTERVAL) {
      return;
    }

    const window = this.traitHistory.slice(-MUTATION_STICK_WINDOW);
    const avg = {
      speed: window.reduce((sum, point) => sum + point.speed, 0) / window.length,
      size: window.reduce((sum, point) => sum + point.size, 0) / window.length,
      vision: window.reduce((sum, point) => sum + point.vision, 0) / window.length
    };

    const changes = [];
    if (Math.abs(avg.speed - this.lastStableTraitSample.speed) > 0.08) changes.push('speed');
    if (Math.abs(avg.size - this.lastStableTraitSample.size) > 0.2) changes.push('size');
    if (Math.abs(avg.vision - this.lastStableTraitSample.vision) > 2) changes.push('vision');

    if (!changes.length) return;

    const milestone = {
      time: this.time,
      generation: sample.generation,
      traits: changes
    };
    this.mutationMilestones.push(milestone);
    if (this.mutationMilestones.length > MUTATION_MILESTONE_LIMIT) {
      this.mutationMilestones.shift();
    }

    this.lastStableTraitSample = avg;
    this.lastMutationStickTime = this.time;
    this.captureReplayMoment('mutation-stick', `Mutation stuck: ${changes.join(', ')}`);
  }

  buildTraitSample() {
    if (!this.organisms.length) {
      return {
        time: this.time,
        generation: 0,
        speed: 0,
        size: 0,
        vision: 0
      };
    }

    const totals = this.organisms.reduce((acc, organism) => {
      acc.speed += organism.speed;
      acc.size += organism.size;
      acc.vision += organism.vision;
      acc.generation += organism.generation;
      return acc;
    }, { speed: 0, size: 0, vision: 0, generation: 0 });

    return {
      time: this.time,
      generation: Math.round(totals.generation / this.organisms.length),
      speed: totals.speed / this.organisms.length,
      size: totals.size / this.organisms.length,
      vision: totals.vision / this.organisms.length
    };
  }

  captureReplayMoment(type, label) {
    const lastMoment = this.replayMoments[this.replayMoments.length - 1];
    if (lastMoment && lastMoment.type === type && lastMoment.time === this.time) {
      return;
    }
    const moment = {
      id: `m${this.replayCounter++}`,
      type,
      label,
      time: this.time,
      state: deepClone(this.buildStatePayload({ includeReplaySnapshots: false, snapshotMode: true }))
    };
    this.replayMoments.push(moment);
    if (this.replayMoments.length > REPLAY_LIMIT) {
      this.replayMoments.shift();
    }
  }

  getReplayTimeline() {
    return this.replayMoments;
  }

  getTraitHistory() {
    return this.traitHistory;
  }

  getMutationMilestones() {
    return this.mutationMilestones;
  }

  jumpToReplayMoment(momentId) {
    const target = this.replayMoments.find((moment) => moment.id === momentId);
    if (!target?.state) return false;
    this.loadState(target.state, { addResumeMoment: false });
    return true;
  }

  triggerApocalypse(automatic = false) {
    const killPercent = random(APOCALYPSE_MIN_KILL_PERCENT, APOCALYPSE_MAX_KILL_PERCENT);
    const toKill = Math.floor(this.organisms.length * killPercent);

    const shuffled = [...this.organisms];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random(0, i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (let i = 0; i < toKill; i++) {
      shuffled[i].energy = 0;
    }

    this.organisms = this.organisms.filter((o) => o.alive);
    this.lastApocalypseKills = toKill;
    this.captureReplayMoment('apocalypse', `Extinction event: ${toKill} organisms lost`);

    if (automatic) {
      this.scheduleNextApocalypse();
    }
  }

  scheduleNextApocalypse() {
    this.nextApocalypse = this.time + Math.floor(random(config.APOCALYPSE_MIN_INTERVAL, config.APOCALYPSE_MAX_INTERVAL));
  }

  seedRescuePopulation() {
    const fallback = createSpecies({ r: random(80, 255), g: random(80, 255), b: random(80, 255) });
    this.registerSpecies(fallback);
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

  spawnHunters(count, reason = 'manual') {
    let spawned = 0;
    for (let i = 0; i < count && this.hunters.length < config.MAX_HUNTERS; i++) {
      const edge = Math.floor(random(0, 4));
      const x = edge % 2 === 0 ? (edge === 0 ? 18 : WORLD_WIDTH - 18) : random(24, WORLD_WIDTH - 24);
      const y = edge % 2 === 1 ? (edge === 1 ? 18 : WORLD_HEIGHT - 18) : random(24, WORLD_HEIGHT - 24);
      this.hunters.push(new Hunter(x, y));
      spawned += 1;
    }
    if (spawned > 0) {
      this.captureReplayMoment('apex-spawn', `Apex predators spawned: +${spawned} (${reason})`);
    }
    return spawned;
  }

  buildStatePayload({ includeReplaySnapshots, snapshotMode = false }) {
    return {
      version: 1,
      time: this.time,
      running: this.running,
      nextApocalypse: this.nextApocalypse,
      lastBirths: this.lastBirths,
      lastApocalypseKills: this.lastApocalypseKills,
      replayCounter: this.replayCounter,
      config: { ...config },
      speciesCounter: getSpeciesCounter(),
      speciesCatalog: [...this.speciesCatalog.values()].map((species) => cloneSpecies(species)),
      knownSpeciesIds: [...this.knownSpeciesIds],
      env: {
        tick: this.env.tick,
        season: this.env.season,
        event: this.env.event,
        nextEventTick: this.env.nextEventTick,
        cells: this.env.cells
      },
      organisms: this.organisms.map((organism) => ({
        x: organism.x,
        y: organism.y,
        energy: organism.energy,
        age: organism.age,
        generation: organism.generation,
        speciesId: organism.species.id,
        traits: {
          speed: organism.speed,
          size: organism.size,
          vision: organism.vision,
          fertility: organism.fertility,
          body: organism.body,
          tail: organism.tail,
          fin: organism.fin,
          limbs: organism.limbs,
          neck: organism.neck,
          crest: organism.crest,
          wing: organism.wing,
          complexity: organism.complexity,
          r: organism.species.r,
          g: organism.species.g,
          b: organism.species.b
        },
        vx: organism.vx,
        vy: organism.vy,
        state: organism.state,
        breedCooldown: organism.breedCooldown
      })),
      hunters: this.hunters.map((hunter) => ({
        x: hunter.x,
        y: hunter.y,
        energy: hunter.energy,
        age: hunter.age,
        generation: hunter.generation,
        speed: hunter.speed,
        size: hunter.size,
        vision: hunter.vision,
        vx: hunter.vx,
        vy: hunter.vy
      })),
      // Keep recent windows only in replay snapshots to limit per-moment payload size.
      traitHistory: snapshotMode ? this.traitHistory.slice(-SNAPSHOT_TRAIT_LIMIT) : this.traitHistory,
      mutationMilestones: snapshotMode ? this.mutationMilestones.slice(-SNAPSHOT_MILESTONE_LIMIT) : this.mutationMilestones,
      replayMoments: snapshotMode ? [] : this.replayMoments.map((moment) => ({
        id: moment.id,
        type: moment.type,
        label: moment.label,
        time: moment.time,
        state: includeReplaySnapshots ? moment.state : undefined
      }))
    };
  }

  serializeState() {
    return deepClone(this.buildStatePayload({ includeReplaySnapshots: true }));
  }

  loadState(state, options = {}) {
    const { addResumeMoment = true } = options;
    if (!state || typeof state !== 'object') {
      throw new Error('Invalid state payload');
    }

    if (state.config && typeof state.config === 'object') {
      for (const [key, value] of Object.entries(state.config)) {
        if (key in config && typeof value === 'number' && Number.isFinite(value)) {
          config[key] = value;
        }
      }
    }

    const speciesMap = new Map();
    const sourceSpecies = Array.isArray(state.speciesCatalog) ? state.speciesCatalog : createFallbackSpeciesCatalog(state);

    for (const entry of sourceSpecies) {
      if (typeof entry?.id !== 'number') continue;
      speciesMap.set(entry.id, {
        id: entry.id,
        parentId: entry.parentId ?? null,
        r: entry.r,
        g: entry.g,
        b: entry.b,
        morphology: entry.morphology,
        stageIndex: entry.stageIndex,
        formName: entry.formName,
        complexity: entry.complexity
      });
    }

    this.env = new Environment();
    this.env.tick = state.env?.tick ?? 0;
    this.env.season = state.env?.season ?? 1;
    this.env.event = state.env?.event ?? this.env.event;
    this.env.nextEventTick = state.env?.nextEventTick ?? this.env.nextEventTick;
    this.env.cells = state.env?.cells ?? this.env.cells;

    this.organisms = Array.isArray(state.organisms) ? state.organisms.map((entry) => {
      const species = speciesMap.get(entry.speciesId) ?? createSpecies(entry.traits);
      speciesMap.set(species.id, species);
      const organism = new Organism(entry.x, entry.y, entry.traits, species, entry.generation);
      organism.energy = entry.energy;
      organism.age = entry.age;
      organism.vx = entry.vx;
      organism.vy = entry.vy;
      organism.state = entry.state;
      organism.breedCooldown = entry.breedCooldown ?? 0;
      return organism;
    }) : [];

    this.hunters = Array.isArray(state.hunters) ? state.hunters.map((entry) => {
      const hunter = new Hunter(entry.x, entry.y, entry.generation);
      hunter.energy = entry.energy;
      hunter.age = entry.age;
      hunter.speed = entry.speed;
      hunter.size = entry.size;
      hunter.vision = entry.vision;
      hunter.vx = entry.vx;
      hunter.vy = entry.vy;
      return hunter;
    }) : [];

    this.time = state.time ?? 0;
    this.running = Boolean(state.running);
    this.nextApocalypse = state.nextApocalypse ?? this.time + 1000;
    this.lastBirths = state.lastBirths ?? 0;
    this.lastApocalypseKills = state.lastApocalypseKills ?? 0;
    this.replayCounter = state.replayCounter ?? 1;
    this.traitHistory = Array.isArray(state.traitHistory) ? state.traitHistory : [];
    this.mutationMilestones = Array.isArray(state.mutationMilestones) ? state.mutationMilestones : [];
    this.lastTraitSampleTime = this.time;
    this.lastMutationStickTime = this.mutationMilestones.length ? this.mutationMilestones[this.mutationMilestones.length - 1].time : 0;

    this.speciesCatalog = speciesMap;
    this.knownSpeciesIds = new Set(Array.isArray(state.knownSpeciesIds) ? state.knownSpeciesIds : [...speciesMap.keys()]);
    this.prevSpeciesCounts = this.buildSpeciesCounts();
    this.lastStableTraitSample = this.traitHistory.length
      ? {
          speed: this.traitHistory[this.traitHistory.length - 1].speed,
          size: this.traitHistory[this.traitHistory.length - 1].size,
          vision: this.traitHistory[this.traitHistory.length - 1].vision
        }
      : null;

    this.replayMoments = Array.isArray(state.replayMoments)
      ? state.replayMoments
          .filter((moment) => moment && moment.id)
          .map((moment) => ({
            id: moment.id,
            type: moment.type,
            label: moment.label,
            time: moment.time,
            state: moment.state
          }))
      : [];

    let maxSpeciesId = 0;
    for (const speciesId of speciesMap.keys()) {
      if (speciesId > maxSpeciesId) maxSpeciesId = speciesId;
    }
    // Species IDs are 1-based, so 1 remains the safe minimum when catalog is empty.
    const fallbackSpeciesCounter = maxSpeciesId + 1;
    setSpeciesCounter(state.speciesCounter ?? fallbackSpeciesCounter);

    if (addResumeMoment) {
      this.captureReplayMoment('resume', 'Run resumed from saved state');
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
      if (organism.state === 'fleeing') fleeing += 1;
    }
    const sorted = [...speciesCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const leaders = sorted.map(([id, count]) => `S${id}:${count}`).join(' ');
    return `Time: ${this.time}  Population: ${this.organisms.length}  Hunters: ${this.hunters.length}  Species: ${speciesCounts.size}  Max generation: ${oldest}  Alerted: ${fleeing}${leaders ? `  Dominant: ${leaders}` : ''}`;
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
      .join(' ');
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
    return details.join('  |  ');
  }
}
