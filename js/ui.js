// UI setup and event handling

export const setupUI = (simulation, speedSelect, pauseBtn, resetBtn) => {
  pauseBtn.addEventListener("click", () => {
    simulation.running = !simulation.running;
    pauseBtn.textContent = simulation.running ? "Pause" : "Resume";
  });

  resetBtn.addEventListener("click", () => {
    simulation.reset();
    pauseBtn.textContent = "Pause";
  });
};

export const updateStats = (simulation, statsEl, detailsEl) => {
  statsEl.textContent = simulation.buildStats();
  detailsEl.textContent = simulation.buildDetails();
};
