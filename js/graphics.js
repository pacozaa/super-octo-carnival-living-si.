// Enhanced graphics rendering with SVG-like styling and visual distinction

import { speciesColor } from './species.js';

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
        const spotX = (Math.sin(i * 0.7) * bodyLength * 0.35);
        const spotY = (Math.cos(i * 0.7) * bodyHeight * 0.35);
        const spotSize = 1 + Math.abs(Math.sin(i * 1.3));
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
        const sizeVariation = 0.8 + Math.abs(Math.sin(i * 1.7)) * 0.4;
        ctx.beginPath();
        ctx.arc(x, y, sizeVariation, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'fur-like':
      // Draw hair-like texture
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 15; i++) {
        const startX = (Math.sin(i * 0.4) * bodyLength * 0.35);
        const startY = (Math.cos(i * 0.4) * bodyHeight * 0.35);
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
  const color = speciesColor(organism.species);
  const rgb = organism.species;
  const isDark = rgb.r + rgb.g + rgb.b < 384;
  const formName = organism.getFormName();
  const visualStyle = getFormVisualStyle(formName);
  const accentRgb = getAccentColor(rgb);
  const accentColor = `rgb(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b})`;
  
  ctx.save();
  ctx.translate(organism.x, organism.y);
  ctx.rotate(angle);

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
  ctx.fillStyle = color;
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(headX, -bodyHeight * 0.06, headRadius * 1.05, headRadius * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eyes with enhanced detail
  const eyeOuterRadius = Math.max(1, headRadius * 0.22);
  const eyeInnerRadius = Math.max(0.5, headRadius * 0.09);
  
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
      const spotX = (Math.sin(i * 7.13) * bodyLength * 0.35);
      const spotY = (Math.cos(i * 5.27) * bodyHeight * 0.3);
      const spotSize = 0.4 + Math.abs(Math.sin(i * 2.1)) * 0.6;
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
  ctx.save();
  ctx.translate(hunter.x, hunter.y);
  const angle = Math.atan2(hunter.vy, hunter.vx) + Math.PI / 2;
  ctx.rotate(angle);

  const size = hunter.size;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.beginPath();
  ctx.ellipse(0, size + 1, size * 1.2, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main body - predatory shape
  ctx.fillStyle = '#e63946';
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

  // Eyes (more menacing)
  for (const [xOffset, yOffset] of [[size * 0.3, -size * 0.4], [-size * 0.3, -size * 0.4]]) {
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
