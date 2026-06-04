// Enhanced graphics rendering with SVG-like styling and visual distinction

// Constants for visual rendering
const SPOT_X_FREQUENCY = 7.13;  // Frequency multiplier for deterministic X spot positioning
const SPOT_Y_FREQUENCY = 5.27;  // Frequency multiplier for deterministic Y spot positioning
const SPOT_SIZE_FREQUENCY = 2.1; // Frequency multiplier for deterministic spot size variation
const LEFT_EYE_POSITION = { xOffset: 0.3, yOffset: -0.4 };  // Hunter left eye position multipliers
const RIGHT_EYE_POSITION = { xOffset: -0.3, yOffset: -0.4 }; // Hunter right eye position multipliers

// Pattern drawing constants
const SPOTS_PATTERN_X_FREQ = 0.7;  // Spot pattern X position frequency
const SPOTS_PATTERN_Y_FREQ = 1.3;  // Spot pattern Y position frequency
const ROUGH_TEXTURE_FREQUENCY = 1.7;  // Rough texture variation frequency
const ROUGH_TEXTURE_BASE_SIZE = 0.8;  // Base size for rough texture
const ROUGH_TEXTURE_SIZE_VARIATION = 0.4;  // Size variation factor for rough texture
const FUR_LIKE_POSITION_X_FREQ = 0.4;  // Fur-like texture X positioning frequency
const FUR_LIKE_POSITION_Y_FREQ = 0.35; // Fur-like texture Y positioning frequency
const TRAIT_MIN_SPEED = 0.25;
const TRAIT_MAX_SPEED = 2.4;
const TRAIT_MIN_SIZE = 2.4;
const TRAIT_MAX_SIZE = 8.8;
const TRAIT_MIN_VISION = 16;
const TRAIT_MAX_VISION = 140;
const HIGH_ENERGY_LEVEL = 125;
const LOW_ENERGY_LEVEL = 24;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const clamp255 = (value) => Math.max(0, Math.min(255, Math.round(value)));

const mixColor = (base, target, amount) => {
  const blend = clamp01(amount);
  return {
    r: clamp255(base.r + (target.r - base.r) * blend),
    g: clamp255(base.g + (target.g - base.g) * blend),
    b: clamp255(base.b + (target.b - base.b) * blend)
  };
};

const shiftSaturation = (rgb, saturation) => {
  const value = clamp01(saturation);
  const gray = (rgb.r + rgb.g + rgb.b) / 3;
  return {
    r: clamp255(gray + (rgb.r - gray) * (1 + value)),
    g: clamp255(gray + (rgb.g - gray) * (1 + value)),
    b: clamp255(gray + (rgb.b - gray) * (1 + value))
  };
};

const traitFactor = (value, min, max) => clamp01((value - min) / (max - min));

const getOrganismPalette = (organism) => {
  const base = { r: organism.species.r, g: organism.species.g, b: organism.species.b };
  let color = { ...base };

  if (organism.state === 'fleeing') {
    color = shiftSaturation(color, -0.55);
    color = mixColor(color, { r: 112, g: 158, b: 224 }, 0.24);
  }

  if (organism.fedTicks > 0 || organism.energy > HIGH_ENERGY_LEVEL) {
    color = shiftSaturation(color, 0.35);
    color = mixColor(color, { r: 255, g: 174, b: 92 }, 0.16);
  }

  if (organism.energy < LOW_ENERGY_LEVEL) {
    const fade = clamp01((LOW_ENERGY_LEVEL - organism.energy) / LOW_ENERGY_LEVEL);
    color = mixColor(color, { r: 130, g: 130, b: 130 }, 0.35 + fade * 0.45);
  }

  const headTint = mixColor(color, { r: 236, g: 245, b: 255 }, 0.08 + traitFactor(organism.vision, TRAIT_MIN_VISION, TRAIT_MAX_VISION) * 0.22);
  return {
    body: `rgb(${color.r}, ${color.g}, ${color.b})`,
    head: `rgb(${headTint.r}, ${headTint.g}, ${headTint.b})`,
    rgb: color
  };
};

/**
 * Get complementary/accent color based on primary color for visual contrast
 */
const getAccentColor = (rgb) => {
  // Create a complementary color for better contrast
  const r = Math.max(0, Math.min(255, 255 - rgb.r));
  const g = Math.max(0, Math.min(255, 255 - rgb.g));
  const b = Math.max(0, Math.min(255, 255 - rgb.b));
  // Return darker version of complement for better visual contrast
  return {
    r: Math.floor(r * 0.6),
    g: Math.floor(g * 0.6),
    b: Math.floor(b * 0.6)
  };
};

/**
 * Get visual style based on form type for more distinctive appearance
 */
const getFormVisualStyle = (formName) => {
  const styles = {
    'Protofish': { pattern: 'scales', fins: true, complexity: 0.5 },
    'Tiktaalik': { pattern: 'stripes', fins: true, limbs: true, complexity: 0.6 },
    'Lobe-fin': { pattern: 'spots', fins: true, limbs: true, complexity: 0.7 },
    'Amphibian': { pattern: 'rough', limbs: true, bumps: true, complexity: 0.8 },
    'Synapsid': { pattern: 'fur-like', limbs: true, crest: true, complexity: 0.85 },
    'Reptile': { pattern: 'scales', limbs: true, crest: true, complexity: 0.9 },
    'Diapsid': { pattern: 'scutes', limbs: true, crests: true, complexity: 0.95 },
    'Dinosaur': { pattern: 'plates', limbs: true, crests: true, spikes: true, complexity: 1.0 },
    'Avian': { pattern: 'feathers', wings: true, complexity: 0.95 }
  };
  return styles[formName] || styles['Reptile'];
};

/**
 * Draw pattern/texture on organism body based on form type
 */
const drawFormPattern = (ctx, pattern, bodyLength, bodyHeight, color, isDark, accentColor) => {
  const patternColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
  ctx.fillStyle = patternColor;
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  switch (pattern) {
    case 'scales':
      // Draw scale pattern
      for (let x = -bodyLength * 0.45; x < bodyLength * 0.3; x += 2) {
        for (let y = -bodyHeight * 0.45; y < bodyHeight * 0.45; y += 1.5) {
          ctx.beginPath();
          ctx.ellipse(x, y, 1, 0.8, Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case 'stripes':
      // Draw stripe pattern
      ctx.lineWidth = 0.6;
      for (let i = -10; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(-bodyLength * 0.45 + i * 3, -bodyHeight * 0.4);
        ctx.lineTo(-bodyLength * 0.45 + i * 3 + bodyHeight * 0.4, bodyHeight * 0.4);
        ctx.stroke();
      }
      break;
    case 'spots':
      // Draw spot pattern
      for (let i = 0; i < 8; i++) {
        const spotX = (Math.sin(i * SPOTS_PATTERN_X_FREQ) * bodyLength * 0.35);
        const spotY = (Math.cos(i * SPOTS_PATTERN_X_FREQ) * bodyHeight * 0.35);
        const spotSize = 1 + Math.abs(Math.sin(i * SPOTS_PATTERN_Y_FREQ));
        ctx.beginPath();
        ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'rough':
      // Draw rough/bumpy texture with deterministic variation
      for (let i = 0; i < 12; i++) {
        const x = (Math.sin(i * 0.5) * bodyLength * 0.4);
        const y = (Math.cos(i * 0.5) * bodyHeight * 0.35);
        const sizeVariation = ROUGH_TEXTURE_BASE_SIZE + Math.abs(Math.sin(i * ROUGH_TEXTURE_FREQUENCY)) * ROUGH_TEXTURE_SIZE_VARIATION;
        ctx.beginPath();
        ctx.arc(x, y, sizeVariation, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'fur-like':
      // Draw hair-like texture
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 15; i++) {
        const startX = (Math.sin(i * FUR_LIKE_POSITION_X_FREQ) * bodyLength * 0.35);
        const startY = (Math.cos(i * FUR_LIKE_POSITION_Y_FREQ) * bodyHeight * 0.35);
        const angle = Math.atan2(startY, startX);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + Math.cos(angle) * 1.2, startY + Math.sin(angle) * 1.2);
        ctx.stroke();
      }
      break;
    case 'scutes':
      // Draw plate-like scutes
      ctx.lineWidth = 0.7;
      for (let x = -bodyLength * 0.35; x < bodyLength * 0.25; x += 3) {
        for (let y = -bodyHeight * 0.35; y < bodyHeight * 0.35; y += 2) {
          ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
          ctx.beginPath();
          ctx.rect(x, y, 2.5, 1.8);
          ctx.stroke();
        }
      }
      break;
    case 'plates':
      // Draw large plate pattern (dinosaur-like)
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
      for (let i = 0; i < 6; i++) {
        const x = -bodyLength * 0.3 + i * bodyLength * 0.1;
        ctx.beginPath();
        ctx.ellipse(x, 0, 1.8, 2.5, Math.PI / 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    case 'feathers':
      // Draw feather-like pattern (for avian forms)
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const startX = Math.cos(angle) * bodyLength * 0.2;
        const startY = Math.sin(angle) * bodyHeight * 0.2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX * 1.5, startY * 1.5);
        ctx.stroke();
      }
      break;
  }
};

/**
 * Enhanced organism drawing with form-specific visuals and improved contrast
 */
export const drawEnhancedOrganism = (ctx, organism, profile, bodyLength, bodyHeight, headX, headRadius, angle) => {
  const palette = getOrganismPalette(organism);
  const color = palette.body;
  const rgb = palette.rgb;
  const isDark = rgb.r + rgb.g + rgb.b < 384;
  const formName = organism.getFormName();
  const visualStyle = getFormVisualStyle(formName);
  const accentRgb = getAccentColor(rgb);
  const accentColor = `rgb(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b})`;
  const speedFactor = traitFactor(organism.speed, TRAIT_MIN_SPEED, TRAIT_MAX_SPEED);
  const sizeFactor = traitFactor(organism.size, TRAIT_MIN_SIZE, TRAIT_MAX_SIZE);
  const visionFactor = traitFactor(organism.vision, TRAIT_MIN_VISION, TRAIT_MAX_VISION);
  const stretchX = 1 + speedFactor * 0.34;
  const bulkY = 1 + sizeFactor * 0.22;
  const eyeScale = 1 + visionFactor * 0.35;
  const spawnScale = organism.spawnTicks > 0 ? 0.55 + (1 - clamp01(organism.spawnTicks / 16)) * 0.45 : 1;
  
  if (speedFactor > 0.34) {
    for (let i = 1; i <= 3; i++) {
      const trailStrength = (speedFactor - 0.3) * i;
      const ghostX = organism.x - organism.vx * (3 + trailStrength * 4) * i;
      const ghostY = organism.y - organism.vy * (3 + trailStrength * 4) * i;
      ctx.save();
      ctx.globalAlpha = Math.max(0.04, 0.2 - i * 0.05);
      ctx.translate(ghostX, ghostY);
      ctx.rotate(angle);
      ctx.scale(stretchX * 0.95, bulkY * 0.95);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyLength * 0.45, bodyHeight * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(organism.x, organism.y);
  ctx.rotate(angle);
  const visionArc = Math.PI * (0.54 - visionFactor * 0.12);
  ctx.fillStyle = isDark ? 'rgba(170, 206, 255, 0.06)' : 'rgba(60, 115, 178, 0.08)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, organism.vision, -visionArc, visionArc);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(organism.x, organism.y);
  ctx.rotate(angle);
  ctx.scale(stretchX * spawnScale, bulkY * spawnScale);

  // Draw enhanced shadow with color for depth
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 1, bodyLength * 0.5 + 1, bodyHeight * 0.5 + 1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main body with gradient effect using multiple strokes
  ctx.fillStyle = color;
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1.5;

  // Tail
  ctx.beginPath();
  ctx.moveTo(-bodyLength * 0.45, 0);
  ctx.quadraticCurveTo(-bodyLength * 0.62, -bodyHeight * 0.18, -bodyLength * 0.45 - profile.tail, 0);
  ctx.quadraticCurveTo(-bodyLength * 0.62, bodyHeight * 0.18, -bodyLength * 0.45, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw form-specific appendages
  if (profile.stageIndex <= 1) {
    // Aquatic forms - fins
    const finReach = profile.fin * 0.9;
    
    // Dorsal fin
    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.1, -bodyHeight * 0.15);
    ctx.lineTo(-bodyLength * 0.22, -bodyHeight * 0.45 - finReach);
    ctx.lineTo(bodyLength * 0.05, -bodyHeight * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Ventral fin
    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.05, bodyHeight * 0.15);
    ctx.lineTo(-bodyLength * 0.2, bodyHeight * 0.42 + finReach);
    ctx.lineTo(bodyLength * 0.08, bodyHeight * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Add subtle fin patterns for aquatic creatures
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.15, -bodyHeight * 0.25);
    ctx.lineTo(-bodyLength * 0.2, -bodyHeight * 0.38);
    ctx.stroke();
  } else {
    // Terrestrial forms - legs
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1.2;
    
    const legPairs = profile.stageIndex >= 3 ? 2 : 1;
    for (let i = 0; i < legPairs; i++) {
      const offset = i === 0 ? -bodyLength * 0.15 : bodyLength * 0.15;
      const rear = 0.55 + i * 0.08;
      const front = 0.7 + i * 0.1;
      const spread = 1.4 + profile.limbs * 0.28;
      
      // Front leg
      ctx.beginPath();
      ctx.moveTo(offset, bodyHeight * 0.22);
      ctx.lineTo(offset - spread, bodyHeight * rear);
      ctx.lineTo(offset - spread * 0.7, bodyHeight * front);
      ctx.stroke();
      
      // Back leg
      ctx.beginPath();
      ctx.moveTo(offset + bodyLength * 0.08, bodyHeight * 0.18);
      ctx.lineTo(offset + spread, bodyHeight * rear);
      ctx.lineTo(offset + spread * 0.75, bodyHeight * front);
      ctx.stroke();
    }
  }

  // Crest (species marker)
  if (profile.crest > 0.5) {
    ctx.fillStyle = color;
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.8;
    
    const spikes = Math.max(2, Math.round(profile.crest));
    for (let i = 0; i < spikes; i++) {
      const ratio = spikes === 1 ? 0.5 : i / (spikes - 1);
      const x = -bodyLength * 0.2 + ratio * bodyLength * 0.65;
      const height = profile.crest * (0.45 + ratio * 0.2);
      
      ctx.beginPath();
      ctx.moveTo(x - 0.9, -bodyHeight * 0.3);
      ctx.lineTo(x, -bodyHeight * 0.45 - height);
      ctx.lineTo(x + 0.9, -bodyHeight * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Wings (if present)
  if (profile.stageIndex >= 7 || profile.wing > 1.4) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = color;
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.8;
    
    const wingSpan = profile.wing + bodyLength * 0.2;
    
    // Left wing
    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.05, -bodyHeight * 0.08);
    ctx.lineTo(-bodyLength * 0.35, -bodyHeight * 0.82 - wingSpan * 0.35);
    ctx.lineTo(bodyLength * 0.1, -bodyHeight * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Right wing
    ctx.beginPath();
    ctx.moveTo(0, -bodyHeight * 0.02);
    ctx.lineTo(bodyLength * 0.38, -bodyHeight * 0.74 - wingSpan * 0.28);
    ctx.lineTo(bodyLength * 0.16, -bodyHeight * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.globalAlpha = 1;
  }

  // Main body ellipse
  ctx.fillStyle = color;
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyLength * 0.5, bodyHeight * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw pattern/texture based on form type
  drawFormPattern(ctx, visualStyle.pattern, bodyLength, bodyHeight, color, isDark, accentColor);

  // Head
  ctx.fillStyle = palette.head;
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(headX, -bodyHeight * 0.06, headRadius * 1.05, headRadius * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eyes with enhanced detail
  const eyeOuterRadius = Math.max(1, headRadius * 0.22 * eyeScale);
  const eyeInnerRadius = Math.max(0.5, headRadius * 0.09 * eyeScale);
  
  // Eye white
  ctx.fillStyle = '#f4fbff';
  ctx.strokeStyle = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(headX + headRadius * 0.2, -bodyHeight * 0.12, eyeOuterRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eye pupil (dark center)
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(headX + headRadius * 0.25, -bodyHeight * 0.14, eyeInnerRadius, 0, Math.PI * 2);
  ctx.fill();

  // Eye highlight (reflection)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(headX + headRadius * 0.3, -bodyHeight * 0.17, eyeInnerRadius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Add secondary pattern based on complexity/fertility
  if (organism.complexity > 0.25 || organism.fertility > 0.1) {
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const spotCount = Math.floor(organism.complexity * 6 + organism.fertility * 3);
    for (let i = 0; i < spotCount; i++) {
      const spotX = (Math.sin(i * SPOT_X_FREQUENCY) * bodyLength * 0.35);
      const spotY = (Math.cos(i * SPOT_Y_FREQUENCY) * bodyHeight * 0.3);
      const spotSize = 0.4 + Math.abs(Math.sin(i * SPOT_SIZE_FREQUENCY)) * 0.6;
      ctx.beginPath();
      ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
};

/**
 * Enhanced hunter drawing with more distinctive predatory appearance
 */
export const drawEnhancedHunter = (ctx, hunter) => {
  const speedFactor = traitFactor(hunter.speed, 1.05, 1.75);
  const warmFactor = clamp01(hunter.fedTicks / 16);
  const lowEnergyFade = clamp01((28 - hunter.energy) / 28);
  const bodyColor = mixColor(
    mixColor({ r: 230, g: 57, b: 70 }, { r: 255, g: 190, b: 100 }, warmFactor * 0.5),
    { r: 135, g: 135, b: 135 },
    lowEnergyFade * 0.55
  );
  const bodyFill = `rgb(${bodyColor.r}, ${bodyColor.g}, ${bodyColor.b})`;
  const spawnScale = hunter.spawnTicks > 0 ? 0.6 + (1 - clamp01(hunter.spawnTicks / 14)) * 0.4 : 1;

  if (speedFactor > 0.35) {
    for (let i = 1; i <= 2; i++) {
      ctx.save();
      ctx.globalAlpha = 0.18 - i * 0.05;
      ctx.translate(hunter.x - hunter.vx * 7 * i, hunter.y - hunter.vy * 7 * i);
      const ghostAngle = Math.atan2(hunter.vy, hunter.vx) + Math.PI / 2;
      ctx.rotate(ghostAngle);
      ctx.fillStyle = bodyFill;
      ctx.beginPath();
      ctx.moveTo(0, -hunter.size - 2);
      ctx.lineTo(hunter.size * 0.75, hunter.size * 0.95);
      ctx.lineTo(-hunter.size * 0.75, hunter.size * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(hunter.x, hunter.y);
  const angle = Math.atan2(hunter.vy, hunter.vx) + Math.PI / 2;
  ctx.rotate(angle);
  ctx.scale(spawnScale, spawnScale);

  const size = hunter.size;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.beginPath();
  ctx.ellipse(0, size + 1, size * 1.2, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main body - predatory shape
  ctx.fillStyle = bodyFill;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;

  // Head point (forward-facing predator)
  ctx.beginPath();
  ctx.moveTo(0, -size - 3);
  ctx.lineTo(size * 0.8, size);
  ctx.lineTo(size * 0.3, size * 0.5);
  ctx.lineTo(-size * 0.3, size * 0.5);
  ctx.lineTo(-size * 0.8, size);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Back fins/spikes for predatory look
  ctx.fillStyle = '#d62828';
  ctx.beginPath();
  ctx.moveTo(-size * 0.4, size * 0.3);
  ctx.lineTo(-size * 0.5, size * 0.8);
  ctx.lineTo(-size * 0.3, size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 0.4, size * 0.3);
  ctx.lineTo(size * 0.5, size * 0.8);
  ctx.lineTo(size * 0.3, size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Add scale pattern to hunter body
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  for (let x = -size * 0.7; x < size * 0.7; x += 1.5) {
    for (let y = -size * 0.5; y < size * 0.8; y += 1) {
      ctx.beginPath();
      ctx.ellipse(x, y, 0.8, 0.6, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Eye
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(size * 0.15, -size * 0.5, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pupil
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(size * 0.2, -size * 0.55, size * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(size * 0.28, -size * 0.65, size * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Teeth marks or stripes for predatory detail
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-size * 0.2 + i * size * 0.2, -size * 0.3);
    ctx.lineTo(-size * 0.15 + i * size * 0.2, -size * 0.1);
    ctx.stroke();
  }

  if (hunter.lockedOnPrey) {
    ctx.strokeStyle = 'rgba(255, 72, 72, 0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.15, size * 1.25, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
};

/**
 * Alternative hunter drawing style: More aggressive predator with sharp features.
 * Currently unused but kept as an alternative rendering option that can be swapped
 * with drawEnhancedHunter for different visual variations of hunter creatures.
 */
export const drawAggressiveHunter = (ctx, hunter) => {
  ctx.save();
  ctx.translate(hunter.x, hunter.y);
  const angle = Math.atan2(hunter.vy, hunter.vx) + Math.PI / 2;
  ctx.rotate(angle);

  const size = hunter.size;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(0, size + 2, size * 1.3, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body with sharp angular design
  const gradient = ctx.createLinearGradient(0, -size * 1.2, 0, size * 1.2);
  gradient.addColorStop(0, '#ff4757');
  gradient.addColorStop(0.5, '#e63946');
  gradient.addColorStop(1, '#d62828');
  
  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#8b0000';
  ctx.lineWidth = 1.2;

  // Sharp predatory head
  ctx.beginPath();
  ctx.moveTo(0, -size - 4);
  ctx.lineTo(size * 1.1, size * 0.6);
  ctx.lineTo(size * 0.2, size * 0.8);
  ctx.lineTo(0, size * 0.3);
  ctx.lineTo(-size * 0.2, size * 0.8);
  ctx.lineTo(-size * 1.1, size * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dorsal crest
  ctx.fillStyle = '#d62828';
  ctx.beginPath();
  ctx.moveTo(-size * 0.3, -size * 0.5);
  ctx.lineTo(0, -size * 1.3);
  ctx.lineTo(size * 0.3, -size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eyes (more menacing) using named positions for better readability
  for (const eyePos of [LEFT_EYE_POSITION, RIGHT_EYE_POSITION]) {
    const xOffset = eyePos.xOffset * size;
    const yOffset = eyePos.yOffset * size;
    ctx.fillStyle = '#ffff00';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(xOffset, yOffset, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(xOffset + size * 0.1, yOffset - size * 0.05, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};
