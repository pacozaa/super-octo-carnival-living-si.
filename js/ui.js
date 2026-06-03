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

const buildTooltipHTML = (info) => {
  const stateEmoji = { foraging: '🌿', fleeing: '💨', spawning: '🥚' };
  return `
    <div class="tt-title">
      <span class="tt-swatch" style="background:${info.color}"></span>
      Species #${info.speciesId} — ${info.formName}
    </div>
    <hr class="tt-divider">
    <div class="tt-row"><span>Population</span><span>${info.population}</span></div>
    <div class="tt-row"><span>Avg generation</span><span>${info.avgGeneration}</span></div>
    <div class="tt-row"><span>State</span><span>${stateEmoji[info.state] ?? ''} ${info.state}</span></div>
    <hr class="tt-divider">
    <div class="tt-row"><span>Speed</span><span>${info.speed}</span></div>
    <div class="tt-row"><span>Size</span><span>${info.size}</span></div>
    <div class="tt-row"><span>Vision</span><span>${info.vision}</span></div>
    <div class="tt-row"><span>Fertility</span><span>${info.fertility}%</span></div>
    <div class="tt-row"><span>Complexity</span><span>${info.complexity}%</span></div>
    <div class="tt-row"><span>Energy</span><span>${info.energy}</span></div>
    ${info.fact ? `<hr class="tt-divider"><div class="tt-fact">${info.fact}</div>` : ''}
  `;
};

export const setupTooltip = (canvas, simulation, tooltipEl) => {
  let pinned = false;
  let pinnedOrganism = null;
  let rafId = null;
  let cachedRect = canvas.getBoundingClientRect();

  window.addEventListener('resize', () => {
    cachedRect = canvas.getBoundingClientRect();
  });

  const showTooltip = (organism, clientX, clientY) => {
    const info = simulation.getSpeciesInfo(organism);
    tooltipEl.innerHTML = buildTooltipHTML(info);
    const margin = 14;
    const tw = tooltipEl.offsetWidth || 260;
    const th = tooltipEl.offsetHeight || 200;
    let tx = clientX + margin;
    let ty = clientY + margin;
    if (tx + tw > window.innerWidth - 6) tx = clientX - tw - margin;
    if (ty + th > window.innerHeight - 6) ty = clientY - th - margin;
    tooltipEl.style.left = `${tx}px`;
    tooltipEl.style.top = `${ty}px`;
    tooltipEl.style.display = 'block';
  };

  const hideTooltip = () => {
    tooltipEl.style.display = 'none';
    pinned = false;
    pinnedOrganism = null;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const refreshPinned = () => {
    if (pinned && pinnedOrganism) {
      if (!pinnedOrganism.alive) {
        hideTooltip();
        return;
      }
      const info = simulation.getSpeciesInfo(pinnedOrganism);
      tooltipEl.innerHTML = buildTooltipHTML(info);
    }
    rafId = requestAnimationFrame(refreshPinned);
  };

  canvas.addEventListener('mousemove', (e) => {
    if (pinned) return;
    const scaleX = canvas.width / cachedRect.width;
    const scaleY = canvas.height / cachedRect.height;
    const cx = (e.clientX - cachedRect.left) * scaleX;
    const cy = (e.clientY - cachedRect.top) * scaleY;
    const organism = simulation.getOrganismAt(cx, cy);
    if (organism) {
      showTooltip(organism, e.clientX, e.clientY);
    } else {
      tooltipEl.style.display = 'none';
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (!pinned) hideTooltip();
  });

  canvas.addEventListener('click', (e) => {
    const scaleX = canvas.width / cachedRect.width;
    const scaleY = canvas.height / cachedRect.height;
    const cx = (e.clientX - cachedRect.left) * scaleX;
    const cy = (e.clientY - cachedRect.top) * scaleY;
    const organism = simulation.getOrganismAt(cx, cy);
    if (organism) {
      pinned = true;
      pinnedOrganism = organism;
      showTooltip(organism, e.clientX, e.clientY);
      if (rafId === null) {
        rafId = requestAnimationFrame(refreshPinned);
      }
    } else {
      hideTooltip();
    }
  });
};

