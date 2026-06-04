// UI setup and event handling
import { updateConfig } from './config.js';

const TRAIT_COLORS = {
  speed: '#6ec1ff',
  size: '#ffb36e',
  vision: '#93ffb1'
};

export const setupUI = (simulation, speedSelect, pauseBtn, resetBtn, apocalypseBtn, saveBtn, loadBtn, loadInput, timelineEl) => {
  pauseBtn.addEventListener('click', () => {
    simulation.running = !simulation.running;
    pauseBtn.textContent = simulation.running ? 'Pause' : 'Resume';
  });

  resetBtn.addEventListener('click', () => {
    simulation.reset();
    pauseBtn.textContent = 'Pause';
  });

  apocalypseBtn.addEventListener('click', () => {
    simulation.triggerApocalypse();
  });

  saveBtn?.addEventListener('click', () => {
    const state = simulation.serializeState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `living-sim-state-t${simulation.time}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  loadBtn?.addEventListener('click', () => {
    loadInput?.click();
  });

  loadInput?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const state = JSON.parse(text);
      simulation.loadState(state);
      pauseBtn.textContent = simulation.running ? 'Pause' : 'Resume';
    } catch (error) {
      alert('Could not load state file. Please select a valid simulator JSON export.');
      console.error(error);
    } finally {
      event.target.value = '';
    }
  });

  timelineEl?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-replay-id]');
    if (!button) return;
    const momentId = button.dataset.replayId;
    const jumped = simulation.jumpToReplayMoment(momentId);
    if (jumped) {
      pauseBtn.textContent = simulation.running ? 'Pause' : 'Resume';
    }
  });
};

export const setupSettings = () => {
  const panel = document.getElementById('settings-panel');
  const toggle = document.getElementById('settings-toggle');

  // Toggle settings panel
  toggle.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
  });

  // Setup config input handlers
  const configMap = {
    'base-organisms': 'BASE_ORGANISMS',
    'max-organisms': 'MAX_ORGANISMS',
    'reproduction-energy': 'REPRODUCTION_ENERGY',
    'reproduction-cost': 'REPRODUCTION_COST',
    'tick-damage': 'TICK_DAMAGE',
    'movement-speed': 'MOVEMENT_SPEED_MULTIPLIER',
    'max-hunters': 'MAX_HUNTERS',
    'hunter-spawn-interval': 'HUNTER_SPAWN_INTERVAL',
    'min-pop-hunter': 'MIN_POPULATION_FOR_HUNTER_SPAWN',
    'hunter-min-speed': 'HUNTER_MIN_SPEED',
    'hunter-max-speed': 'HUNTER_MAX_SPEED',
    'hunter-base-drain': 'HUNTER_BASE_DRAIN',
    'prey-size-weight': 'PREY_SIZE_SCORE_WEIGHT',
    'apocalypse-min': 'APOCALYPSE_MIN_INTERVAL',
    'apocalypse-max': 'APOCALYPSE_MAX_INTERVAL'
  };

  for (const [inputId, configKey] of Object.entries(configMap)) {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
          updateConfig(configKey, value);
        }
      });
    }
  }
};

const renderReplayTimeline = (simulation, timelineEl) => {
  if (!timelineEl) return;
  const moments = simulation.getReplayTimeline().slice().reverse();
  if (!moments.length) {
    timelineEl.innerHTML = '<div class="timeline-empty">No key moments recorded yet.</div>';
    return;
  }

  timelineEl.innerHTML = moments.map((moment) => `
    <button class="timeline-item" data-replay-id="${moment.id}" title="Jump to tick ${moment.time}">
      <span class="timeline-time">t=${moment.time}</span>
      <span class="timeline-label">${moment.label}</span>
    </button>
  `).join('');
};

const drawLine = (ctx, points, color) => {
  if (!points.length) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
};

const normalizePoints = (history, key, width, height, padding) => {
  if (!history.length) return [];
  const min = Math.min(...history.map((point) => point[key]));
  const max = Math.max(...history.map((point) => point[key]));
  const spread = Math.max(0.0001, max - min);
  const xSpan = Math.max(1, history.length - 1);

  return history.map((point, index) => ({
    x: padding + (index / xSpan) * (width - padding * 2),
    y: height - padding - ((point[key] - min) / spread) * (height - padding * 2)
  }));
};

const renderTraitGraph = (simulation, traitCanvas) => {
  if (!traitCanvas) return;
  const ctx = traitCanvas.getContext('2d');
  const width = traitCanvas.width;
  const height = traitCanvas.height;
  const padding = 18;
  const history = simulation.getTraitHistory();

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0d1a2a';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#274466';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  if (history.length < 2) {
    ctx.fillStyle = '#9eb7d4';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('Collecting trait history...', 12, 24);
    return;
  }

  drawLine(ctx, normalizePoints(history, 'speed', width, height, padding), TRAIT_COLORS.speed);
  drawLine(ctx, normalizePoints(history, 'size', width, height, padding), TRAIT_COLORS.size);
  drawLine(ctx, normalizePoints(history, 'vision', width, height, padding), TRAIT_COLORS.vision);

  const milestones = simulation.getMutationMilestones();
  if (milestones.length) {
    const minTime = history[0].time;
    const maxTime = history[history.length - 1].time;
    const span = Math.max(1, maxTime - minTime);
    ctx.strokeStyle = '#ff5f8f';
    ctx.lineWidth = 1;
    for (const milestone of milestones) {
      if (milestone.time < minTime || milestone.time > maxTime) continue;
      const x = padding + ((milestone.time - minTime) / span) * (width - padding * 2);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
  }

  ctx.fillStyle = '#9eb7d4';
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('speed', 10, height - 6);
  ctx.fillStyle = TRAIT_COLORS.speed;
  ctx.fillRect(44, height - 13, 10, 4);
  ctx.fillStyle = '#9eb7d4';
  ctx.fillText('size', 62, height - 6);
  ctx.fillStyle = TRAIT_COLORS.size;
  ctx.fillRect(87, height - 13, 10, 4);
  ctx.fillStyle = '#9eb7d4';
  ctx.fillText('vision', 106, height - 6);
  ctx.fillStyle = TRAIT_COLORS.vision;
  ctx.fillRect(140, height - 13, 10, 4);
  ctx.fillStyle = '#9eb7d4';
  ctx.fillText('stick', 158, height - 6);
  ctx.fillStyle = '#ff5f8f';
  ctx.fillRect(186, height - 13, 10, 4);
};

export const updateStats = (simulation, statsEl, detailsEl, timelineEl, traitCanvas) => {
  statsEl.textContent = simulation.buildStats();
  detailsEl.textContent = simulation.buildDetails();
  renderReplayTimeline(simulation, timelineEl);
  renderTraitGraph(simulation, traitCanvas);
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
