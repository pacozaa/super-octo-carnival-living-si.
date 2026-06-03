# Code Organization Guide

## Overview
The Living Simulator application has been refactored from a monolithic single-file structure into a modular component-based architecture. This guide explains the organization and how to work with the codebase.

## Directory Structure

```
project/
├── index.html           # Main HTML file
├── README.md           # Project documentation
├── STRUCTURE.md        # This file
├── js/                 # JavaScript modules
│   ├── app.js         # Entry point - initializes app and animation loop
│   ├── constants.js   # Game configuration constants
│   ├── environment.js # Environment class and climate events
│   ├── hunter.js      # Hunter/predator class
│   ├── organism.js    # Organism/prey class
│   ├── simulation.js  # Main Simulation class
│   ├── species.js     # Species management and color
│   ├── traits.js      # Trait mutation logic
│   ├── ui.js          # UI event handlers
│   └── utils.js       # Utility functions
└── script.js.bak      # Backup of original monolithic code
```

## Module Descriptions

### `js/constants.js`
Contains all configurable game parameters:
- World dimensions and grid
- Organism population limits and behavior parameters
- Hunter parameters and constraints
- Climate event configuration

**Usage:** Import constants where needed
```javascript
import { WORLD_WIDTH, MAX_ORGANISMS } from './constants.js';
```

### `js/utils.js`
Utility functions for common operations:
- `random(min, max)` - Random number generation
- `clamp(v, min, max)` - Constrain value within range
- `chance(value)` - Probability check
- `distance(ax, ay, bx, by)` - Calculate distance between points
- `distanceSq(ax, ay, bx, by)` - Calculate squared distance (optimization)

### `js/species.js`
Manages species creation and identification:
- `createSpecies(seed)` - Generate new species with unique ID and color
- `speciesColor(species)` - Get RGB color string for a species
- `colorDistance(a, b)` - Calculate color distance between species
- `resetSpeciesCounter()` - Reset global species ID counter
- `getSpeciesCounter()` - Get current species counter value

### `js/traits.js`
Handles genetic trait mutations:
- `mutateTraits(parent, mutationPower)` - Generate mutated offspring traits
  - Mutates: speed, size, vision, fertility, color (r, g, b)
  - Respects min/max bounds for each trait
  - Mutation power affects magnitude of changes

### `js/environment.js`
Manages the game world:
- `Environment` class - Represents the world grid and resources
  - Methods: `update()`, `getCell()`, `getTravelPenalty()`, `eat()`, `draw()`
- `pickClimateEvent()` - Generate random climate event
  - Events: Bloom, Drought, Stormfront, Aurora, Temperate

### `js/organism.js`
Defines organism (prey) behavior:
- `Organism` class - Individual prey entity
  - Properties: position, energy, age, generation, traits, species
  - Methods: `step()`, `findThreat()`, `findRichTarget()`, `steer()`, `evade()`, `reproduce()`, `draw()`
  - Behavior: foraging, fleeing from hunters, reproduction when well-fed

### `js/hunter.js`
Defines hunter (predator) behavior:
- `Hunter` class - Apex predator entity
  - Properties: position, energy, age, generation, speed, size, vision
  - Methods: `step()`, `findPrey()`, `steer()`, `draw()`
  - Behavior: hunting, pursuing prey, reproduction from successful hunts

### `js/simulation.js`
Main simulation orchestrator:
- `Simulation` class - Coordinates all entities
  - Methods: `reset()`, `update()`, `draw()`, `buildStats()`, `buildDetails()`
  - Manages organism and hunter populations
  - Handles population culling and rescue mechanics
  - Triggers hunter spawning

### `js/ui.js`
User interface management:
- `setupUI(simulation, speedSelect, pauseBtn, resetBtn)` - Initialize event listeners
- `updateStats(simulation, statsEl, detailsEl)` - Update UI statistics display

### `js/app.js`
Application entry point:
- Gets DOM elements
- Initializes Simulation instance
- Sets up UI controls
- Implements animation loop using `requestAnimationFrame`
- Manages speed parameter and draws simulation

## Data Flow

1. **Initialization** (app.js):
   - Get canvas and UI elements
   - Create Simulation instance
   - Setup UI event listeners
   - Start animation loop

2. **Per Frame** (in animation loop):
   - Read speed multiplier from UI
   - Call `simulation.update(speed)` to advance state
   - Call `simulation.draw(ctx)` to render
   - Update statistics display

3. **Simulation Update** (simulation.js):
   - Update environment (climate, nutrients)
   - Update each organism:
     - Detect threats (hunters)
     - Find target (food)
     - Move and eat
     - Reproduce if conditions met
   - Update each hunter:
     - Find prey
     - Move and hunt
     - Reproduce if conditions met
   - Cull populations if over limits
   - Spawn new hunters if conditions met

## Dependency Graph

```
app.js
├── simulation.js
│   ├── environment.js
│   ├── organism.js
│   │   ├── utils.js
│   │   ├── constants.js
│   │   ├── species.js
│   │   ├── traits.js
│   │   └── environment.js
│   ├── hunter.js
│   │   ├── utils.js
│   │   └── constants.js
│   ├── species.js
│   ├── traits.js
│   └── constants.js
├── ui.js
└── index.html (DOM elements)
```

## Adding New Features

### To add a new organism trait:
1. Add constant to `constants.js` (e.g., `TRAIT_NAME`)
2. Add trait property to `mutateTraits()` in `traits.js`
3. Update `Organism` class in `organism.js` to use the trait
4. Add to species color/identification in `species.js` if applicable

### To add a new climate event:
1. Add event logic to `pickClimateEvent()` in `environment.js`
2. Adjust probability ranges to accommodate new event
3. Define tint and modifier values for the event

### To modify UI controls:
1. Edit event listeners in `ui.js`
2. Add HTML elements to `index.html` if needed
3. Import new UI function in `app.js` and call it

### To adjust world parameters:
1. Update constants in `constants.js`
2. Update canvas dimensions in `index.html` if changing world size
3. Ensure constants match canvas dimensions for consistency

## Performance Considerations

- Grid-based nutrient system (GRID_W × GRID_H) reduces per-pixel calculations
- Distance squared (`distanceSq`) used for comparisons to avoid square root overhead
- Population culling prevents unbounded growth
- Vision radius limiting reduces search scope in `findRichTarget()` and `findPrey()`

## Testing the Refactor

All functionality is preserved from the original implementation. To verify:
1. Open `index.html` in a browser
2. Verify simulation starts and runs smoothly
3. Test pause/resume functionality
4. Test speed controls (1x to 80x)
5. Test reset button
6. Observe population dynamics, species evolution, and hunter spawning

## Migration Notes

- Original code was in an IIFE (Immediately Invoked Function Expression)
- Refactored to ES6 modules for better code organization
- All functionality preserved
- Index.html updated to use `<script type="module">` for main app.js
- Constants exported from centralized module rather than inline declarations
