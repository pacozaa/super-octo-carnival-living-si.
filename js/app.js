import { Simulation } from './simulation.js';
import { setupUI, updateStats } from './ui.js';

// Get DOM elements
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");
const speedSelect = document.getElementById("speed");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
const statsEl = document.getElementById("stats");
const detailsEl = document.getElementById("details");

// Initialize simulation
const simulation = new Simulation();

// Setup UI controls
setupUI(simulation, speedSelect, pauseBtn, resetBtn);

// Main animation loop
function frame() {
  const speed = Number(speedSelect.value || 1);
  simulation.update(speed);
  simulation.draw(ctx);
  updateStats(simulation, statsEl, detailsEl);
  requestAnimationFrame(frame);
}

frame();
