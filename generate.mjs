#!/usr/bin/env node
/**
 * Retro Arcade Space Defender Jet & Heatmap Generator
 *
 * - 1180px x 340px Retro Arcade Canvas with CRT scanlines and neon borders
 * - Dual-hull interceptor starfighter with twin plasma thrusters and railguns
 * - Holographic target-locking reticle sweeping over contribution power-nodes
 * - Retro Arcade HUD: Score (PTS), Level (Rank), Combo multiplier, Shield health bar
 * - Strict TDD & STRIDE / OWASP Top 10 security defenses
 */

import fs from "node:fs";
import path from "node:path";

export const USERNAME = process.env.GH_USERNAME || "RedjiJB";
export const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
export const OUTPUT = process.env.OUTPUT_PATH || "github-jet.svg";

export const COLS = 52;
export const ROWS = 7;
export const CELL = 14;
export const GAP = 4;
export const STEP = CELL + GAP; // 18px

export const WIDTH = 1180;
export const HEIGHT = 340;

export const GRID_X = 140;
export const GRID_Y = 88;

export const JET_X_START = GRID_X + CELL / 2; // 147
export const JET_X_END = GRID_X + (COLS - 1) * STEP + CELL / 2; // 1065
export const JET_Y = 270;
export const LOOP_DUR = 18; // seconds

export const THEME = {
  bgStart: "#050805",
  bgEnd: "#020402",
  border1: "#00ff41",
  border2: "#00b300",
  border3: "#39ff14",
  gold: "#FACC15",
  cyan: "#00ff41",
  rose: "#39ff14",
  emerald: "#00ff41",
  mint: "#86EFAC",
  slate: "#4ade80",
  muted: "#166534",
  cellEmpty: "#0a140a",
  cellEmptyBorder: "#0f2a0f",
  palette: ["#0a140a", "#0d3b0d", "#0f6b1f", "#00b300", "#39ff14"]
};

export const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export const DAY_NAMES = [
  { label: "MON", row: 1 },
  { label: "WED", row: 3 },
  { label: "FRI", row: 5 }
];

export function sanitizeText(str) {
  if (str === null || str === undefined) return "";
  const s = String(str);
  return s
    .replace(/on\w+\s*=/gi, "disarmed-attr=")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function validateUsername(username) {
  if (!username || typeof username !== "string") return false;
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username);
}

export function validateApiEndpoint(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === "https:" && parsed.hostname === "api.github.com";
  } catch {
    return false;
  }
}

export function computeArcadeScore(count) {
  const safeCount = Number(count);
  if (count === null || count === undefined || isNaN(safeCount)) {
    return "0 PTS";
  }
  if (safeCount === 0) return "0 PTS";
  const pts = safeCount * 1000;
  return pts.toLocaleString("en-US") + " PTS";
}

export function buildShieldBar(pct = 100) {
  const totalBlocks = 10;
  const activeBlocks = Math.max(0, Math.min(totalBlocks, Math.round((pct / 100) * totalBlocks)));
  let svg = '<g id="shield-segments">\n';
  for (let i = 0; i < totalBlocks; i++) {
    const x = i * 10;
    const isFilled = i < activeBlocks;
    const fill = isFilled ? "#39ff14" : "#0a140a";
    const opacity = isFilled ? "0.95" : "0.3";
    svg += `  <rect x="${x}" y="0" width="7.5" height="12" rx="1.5" fill="${fill}" opacity="${opacity}" stroke="#00b300" stroke-width="0.5"/>\n`;
  }
  svg += "</g>";
  return svg;
}

export function generateMockWeeks(colCount = COLS) {
  const weeks = [];
  const now = new Date();
  const seedMultiplier = 16807;
  let seed = 42;

  for (let c = 0; c < colCount; c++) {
    const contributionDays = [];
    for (let r = 0; r < ROWS; r++) {
      seed = (seed * seedMultiplier) % 2147483647;
      const rand = seed / 2147483647;
      let count = 0;
      let color = THEME.palette[0];

      if (rand > 0.45) {
        if (rand > 0.90) {
          count = Math.floor(rand * 15) + 6;
          color = THEME.palette[4];
        } else if (rand > 0.75) {
          count = Math.floor(rand * 6) + 3;
          color = THEME.palette[3];
        } else if (rand > 0.60) {
          count = Math.floor(rand * 3) + 2;
          color = THEME.palette[2];
        } else {
          count = 1;
          color = THEME.palette[1];
        }
      }

      const d = new Date(now);
      d.setDate(d.getDate() - ((colCount - 1 - c) * 7 + (6 - r)));
      contributionDays.push({
        contributionCount: count,
        color,
        date: d.toISOString().split("T")[0]
      });
    }
    weeks.push({ contributionDays });
  }
  return weeks;
}

export function computeStats(data) {
  let total = 0;
  let activeDays = 0;
  let maxDay = 0;

  if (!data) return { total, activeDays, maxDay };

  if (Array.isArray(data) && data[0] && Array.isArray(data[0].contributionDays)) {
    for (const week of data) {
      if (!week || !Array.isArray(week.contributionDays)) continue;
      for (const day of week.contributionDays) {
        if (!day) continue;
        const count = Number(day.contributionCount) || 0;
        total += count;
        if (count > 0) activeDays++;
        if (count > maxDay) maxDay = count;
      }
    }
  } else if (Array.isArray(data)) {
    for (const c of data) {
      if (!c) continue;
      const count = Number(c.count !== undefined ? c.count : c.contributionCount) || 0;
      total += count;
      if (count > 0) activeDays++;
      if (count > maxDay) maxDay = count;
    }
  }

  return { total, activeDays, maxDay };
}

export function buildCells(weeks, colCount = COLS) {
  const safeWeeks = Array.isArray(weeks) ? weeks.filter(w => w && Array.isArray(w.contributionDays)) : [];
  const recent = safeWeeks.slice(-colCount);
  const pad = colCount - recent.length;

  const padded = Array.from({ length: Math.max(0, pad) }, () => ({
    contributionDays: Array.from({ length: ROWS }, () => ({ contributionCount: 0, color: THEME.palette[0], date: null }))
  })).concat(recent);

  const cells = [];
  padded.forEach((week, col) => {
    if (col >= colCount) return;
    const days = Array.isArray(week.contributionDays) ? week.contributionDays : [];
    for (let row = 0; row < ROWS; row++) {
      const day = days[row] || { contributionCount: 0, color: THEME.palette[0], date: null };
      const rawColor = day.color || THEME.palette[0];
      const color = (rawColor === "#161b22" || rawColor === "#ebedf0") ? THEME.palette[0] : rawColor;
      cells.push({
        col,
        row,
        x: GRID_X + col * STEP,
        y: GRID_Y + row * STEP,
        color: sanitizeText(color),
        count: Number(day.contributionCount) || 0,
        date: sanitizeText(day.date || "")
      });
    }
  });
  return cells;
}

/**
 * Exact analytical inversion of SMIL calcMode="spline" keySplines="0.45 0 0.55 1"
 * Solves 3u^2 - 2u^3 = p in closed-form, then evaluates X(u).
 */
export function columnToTimeFraction(col, totalCols = 51) {
  const p = Math.max(0, Math.min(1, col / totalCols));
  const theta = Math.asin(Math.max(-1, Math.min(1, 2 * p - 1))) / 3;
  const u = 0.5 + Math.sin(theta);

  const oneMinusU = 1 - u;
  const tau = 1.35 * oneMinusU * oneMinusU * u + 1.65 * oneMinusU * u * u + u * u * u;

  const t_fwd = 0.5 * tau;
  const t_ret = 0.5 + 0.5 * (1 - tau);

  return { t_fwd, t_ret };
}

export function buildMonotonicKeyTimes(events) {
  const sorted = events.slice().sort((a, b) => a.time - b.time);
  const cleanTimes = [0];
  const cleanValues = [sorted[0] ? sorted[0].value : "0"];

  let lastFormatted = 0;
  for (const ev of sorted) {
    let t = Math.max(0.0001, Math.min(0.9999, ev.time));
    let tRounded = Number(t.toFixed(4));
    if (tRounded <= lastFormatted) {
      tRounded = Number((lastFormatted + 0.0002).toFixed(4));
    }
    if (tRounded > lastFormatted && tRounded < 1) {
      cleanTimes.push(tRounded);
      cleanValues.push(ev.value);
      lastFormatted = tRounded;
    }
  }
  cleanTimes.push(1);
  cleanValues.push(cleanValues[cleanValues.length - 1] || "0");

  return {
    keyTimes: cleanTimes.map(t => t.toFixed(4)).join("; "),
    values: cleanValues.join("; ")
  };
}

export function selectTargets(cells) {
  const byCol = new Map();
  for (const c of cells) {
    if (c.count > 0 && c.color !== THEME.palette[0]) {
      if (!byCol.has(c.col) || byCol.get(c.col).count < c.count) {
        byCol.set(c.col, c);
      }
    }
  }

  if (byCol.size === 0) {
    return [];
  }

  const candidates = Array.from(byCol.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.col - b.col;
  });

  const selectedCols = [];
  const MAX_TARGETS = 8;
  const MIN_SPACING = 3;

  for (const cand of candidates) {
    if (selectedCols.length >= MAX_TARGETS) break;
    const tooClose = selectedCols.some(c => Math.abs(c - cand.col) < MIN_SPACING);
    if (!tooClose) {
      selectedCols.push(cand.col);
    }
  }

  selectedCols.sort((a, b) => a - b);

  return selectedCols.map(col => {
    const cell = byCol.get(col);
    const cx = cell.x + CELL / 2;
    const cy = cell.y + CELL / 2;

    const { t_fwd, t_ret } = columnToTimeFraction(col, 51);
    const k_hit_fwd = t_fwd;
    const k_lock_fwd = Math.max(0.0001, t_fwd - 0.014);
    const k_settle_fwd = Math.min(0.4990, t_fwd + 0.008);

    const k_hit_ret = t_ret;
    const k_lock_ret = Math.max(0.5001, t_ret - 0.014);
    const k_settle_ret = Math.min(0.9990, t_ret + 0.008);

    return {
      col,
      x: cell.x,
      y: cell.y,
      cx,
      cy,
      count: cell.count,
      color: cell.color,
      k_lock_fwd,
      k_hit_fwd,
      k_settle_fwd,
      k_lock_ret,
      k_hit_ret,
      k_settle_ret
    };
  });
}

export function buildGrid(cells, targets = []) {
  const targetMap = new Map();
  targets.forEach(t => targetMap.set(`${t.x},${t.y}`, t));

  let svg = "";
  for (const c of cells) {
    const key = `${c.x},${c.y}`;
    const isTarget = targetMap.has(key);
    const isLevel0 = c.color === THEME.palette[0];
    const strokeAttr = isLevel0 ? ` stroke="${THEME.cellEmptyBorder}" stroke-width="0.75"` : ' stroke="#00b300" stroke-width="0.35"';

    if (isTarget) {
      const t = targetMap.get(key);
      const fillEvents = [
        { time: 0, value: c.color },
        { time: t.k_lock_fwd, value: c.color },
        { time: t.k_hit_fwd, value: "#FFFFFF" },
        { time: t.k_settle_fwd, value: "#39ff14" },
        { time: Math.min(0.4999, t.k_settle_fwd + 0.004), value: c.color },
        { time: 0.5, value: c.color },
        { time: t.k_lock_ret, value: c.color },
        { time: t.k_hit_ret, value: "#FFFFFF" },
        { time: t.k_settle_ret, value: "#39ff14" },
        { time: Math.min(0.9999, t.k_settle_ret + 0.004), value: c.color },
        { time: 1, value: c.color }
      ];
      const fillTimeline = buildMonotonicKeyTimes(fillEvents);

      svg += `  <rect x="${c.x}" y="${c.y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${c.color}"${strokeAttr}>\n`;
      svg += `    <animate attributeName="fill" dur="18s" repeatCount="indefinite" values="${fillTimeline.values}" keyTimes="${fillTimeline.keyTimes}"/>\n`;
      svg += `    <title>${c.count} power units on ${c.date || "untracked"}</title>\n`;
      svg += `  </rect>\n`;
    } else {
      svg += `  <rect x="${c.x}" y="${c.y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${c.color}"${strokeAttr}><title>${c.count} power units on ${c.date || "untracked"}</title></rect>\n`;
    }
  }
  return svg;
}

export function buildTargetLockBrackets(targets = []) {
  let svg = '<g id="target-lock-brackets">\n';
  for (const t of targets) {
    const lockEvents = [
      { time: 0, value: "0" },
      { time: t.k_lock_fwd, value: "0" },
      { time: Math.min(0.4998, t.k_lock_fwd + 0.002), value: "1" },
      { time: t.k_hit_fwd, value: "1" },
      { time: t.k_settle_fwd, value: "0" },
      { time: 0.5, value: "0" },
      { time: t.k_lock_ret, value: "0" },
      { time: Math.min(0.9998, t.k_lock_ret + 0.002), value: "1" },
      { time: t.k_hit_ret, value: "1" },
      { time: t.k_settle_ret, value: "0" },
      { time: 1, value: "0" }
    ];
    const lockTimeline = buildMonotonicKeyTimes(lockEvents);

    svg += `  <g class="lock-bracket" opacity="0">\n`;
    svg += `    <path d="M${t.cx - 10} ${t.cy - 6} V${t.cy - 10} H${t.cx - 6} M${t.cx + 6} ${t.cy - 10} H${t.cx + 10} V${t.cy - 6} M${t.cx + 10} ${t.cy + 6} V${t.cy + 10} H${t.cx + 6} M${t.cx - 6} ${t.cy + 10} H${t.cx - 10} V${t.cy + 6}" fill="none" stroke="#FACC15" stroke-width="1.5"/>\n`;
    svg += `    <circle cx="${t.cx}" cy="${t.cy}" r="2" fill="#FACC15"/>\n`;
    svg += `    <animate attributeName="opacity" dur="18s" repeatCount="indefinite" values="${lockTimeline.values}" keyTimes="${lockTimeline.keyTimes}"/>\n`;
    svg += `  </g>\n`;
  }
  svg += '</g>\n';
  return svg;
}

export function buildProminentRailguns(targets = []) {
  let svg = '<g id="world-space-railguns">\n';
  for (const t of targets) {
    const beamEvents = [
      { time: 0, value: "0" },
      { time: Math.max(0.0001, t.k_hit_fwd - 0.001), value: "0" },
      { time: t.k_hit_fwd, value: "1" },
      { time: t.k_settle_fwd, value: "1" },
      { time: Math.min(0.4999, t.k_settle_fwd + 0.002), value: "0" },
      { time: 0.5, value: "0" },
      { time: Math.max(0.5001, t.k_hit_ret - 0.001), value: "0" },
      { time: t.k_hit_ret, value: "1" },
      { time: t.k_settle_ret, value: "1" },
      { time: Math.min(0.9999, t.k_settle_ret + 0.002), value: "0" },
      { time: 1, value: "0" }
    ];
    const beamTimeline = buildMonotonicKeyTimes(beamEvents);

    svg += `  <g class="railgun-lance" opacity="0">\n`;
    svg += `    <line x1="${t.cx - 3.5}" y1="${JET_Y - 14}" x2="${t.cx - 3.5}" y2="${t.cy}" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>\n`;
    svg += `    <line x1="${t.cx - 3.5}" y1="${JET_Y - 14}" x2="${t.cx - 3.5}" y2="${t.cy}" stroke="#39ff14" stroke-width="4.5" stroke-opacity="0.45" stroke-linecap="round"/>\n`;
    svg += `    <line x1="${t.cx + 3.5}" y1="${JET_Y - 14}" x2="${t.cx + 3.5}" y2="${t.cy}" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>\n`;
    svg += `    <line x1="${t.cx + 3.5}" y1="${JET_Y - 14}" x2="${t.cx + 3.5}" y2="${t.cy}" stroke="#39ff14" stroke-width="4.5" stroke-opacity="0.45" stroke-linecap="round"/>\n`;
    svg += `    <animate attributeName="opacity" dur="18s" repeatCount="indefinite" values="${beamTimeline.values}" keyTimes="${beamTimeline.keyTimes}"/>\n`;
    svg += `  </g>\n`;
  }
  svg += '</g>\n';
  return svg;
}

export function buildExplosiveImpacts(targets = []) {
  let svg = '<g id="explosive-impacts">\n';
  for (const t of targets) {
    const impactEvents = [
      { time: 0, value: "0" },
      { time: Math.max(0.0001, t.k_hit_fwd - 0.001), value: "0" },
      { time: t.k_hit_fwd, value: "1" },
      { time: t.k_settle_fwd, value: "0" },
      { time: 0.5, value: "0" },
      { time: Math.max(0.5001, t.k_hit_ret - 0.001), value: "0" },
      { time: t.k_hit_ret, value: "1" },
      { time: t.k_settle_ret, value: "0" },
      { time: 1, value: "0" }
    ];
    const impactTimeline = buildMonotonicKeyTimes(impactEvents);

    const radiusEvents = [
      { time: 0, value: "0" },
      { time: Math.max(0.0001, t.k_hit_fwd - 0.001), value: "0" },
      { time: t.k_hit_fwd, value: "3" },
      { time: t.k_settle_fwd, value: "14" },
      { time: 0.5, value: "0" },
      { time: Math.max(0.5001, t.k_hit_ret - 0.001), value: "0" },
      { time: t.k_hit_ret, value: "3" },
      { time: t.k_settle_ret, value: "14" },
      { time: 1, value: "0" }
    ];
    const radiusTimeline = buildMonotonicKeyTimes(radiusEvents);

    svg += `  <g class="explosive-impact">\n`;
    svg += `    <circle cx="${t.cx}" cy="${t.cy}" r="0" fill="none" stroke="#FACC15" stroke-width="1.8" class="shockwave-primary" opacity="0">\n`;
    svg += `      <animate attributeName="r" dur="18s" repeatCount="indefinite" values="${radiusTimeline.values}" keyTimes="${radiusTimeline.keyTimes}"/>\n`;
    svg += `      <animate attributeName="opacity" dur="18s" repeatCount="indefinite" values="${impactTimeline.values}" keyTimes="${impactTimeline.keyTimes}"/>\n`;
    svg += `    </circle>\n`;
    svg += `    <circle cx="${t.cx}" cy="${t.cy}" r="4" fill="#FFFFFF" opacity="0">\n`;
    svg += `      <animate attributeName="opacity" dur="18s" repeatCount="indefinite" values="${impactTimeline.values}" keyTimes="${impactTimeline.keyTimes}"/>\n`;
    svg += `    </circle>\n`;
    svg += `  </g>\n`;
  }
  svg += '</g>\n';
  return svg;
}

export function buildDynamicReticle(targets = []) {
  return `<g id="boresight-reticle">
  <line x1="0" y1="-8" x2="0" y2="-180" stroke="#00ff41" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.6" class="sighting-laser"/>

  <circle cx="0" cy="-60" r="16" fill="none" stroke="#00ff41" stroke-width="1.4" opacity="0.75"/>
  <circle cx="0" cy="-60" r="24" fill="none" stroke="#39ff14" stroke-width="1" stroke-dasharray="6 3" opacity="0.5"/>

  <line x1="0" y1="-74" x2="0" y2="-66" stroke="#00ff41" stroke-width="1.5"/>
  <line x1="0" y1="-54" x2="0" y2="-46" stroke="#00ff41" stroke-width="1.5"/>
  <line x1="-14" y1="-60" x2="-6" y2="-60" stroke="#00ff41" stroke-width="1.5"/>
  <line x1="6" y1="-60" x2="14" y2="-60" stroke="#00ff41" stroke-width="1.5"/>

  <circle cx="0" cy="-60" r="2" fill="#FACC15">
    <animate attributeName="opacity" values="1;0.3;1" dur="0.6s" repeatCount="indefinite"/>
  </circle>
</g>`;
}

export function buildMonthLabels(cells = []) {
  let svg = "";
  const monthCols = [];
  let lastMonth = -1;
  let lastCol = -10;

  for (let col = 0; col < COLS; col++) {
    const colCells = cells.filter(c => c.col === col && c.date);
    if (colCells.length === 0) continue;
    const dateStr = colCells[0].date;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;

    const m = d.getUTCMonth();
    if (m !== lastMonth) {
      if (col - lastCol >= 2) {
        monthCols.push({ col, label: MONTH_NAMES[m] });
        lastCol = col;
      }
      lastMonth = m;
    }
  }

  if (monthCols.length === 0) {
    const defaultMonthCols = [0, 4, 9, 13, 17, 22, 26, 30, 35, 39, 43, 48];
    defaultMonthCols.forEach((col, idx) => {
      monthCols.push({ col, label: MONTH_NAMES[idx % MONTH_NAMES.length] });
    });
  }

  for (const { col, label } of monthCols) {
    const x = GRID_X + col * STEP;
    svg += `  <text x="${x}" y="74" class="axis-label">${label}</text>\n`;
  }

  return svg;
}

export function buildDayLabels() {
  let svg = "";
  DAY_NAMES.forEach(({ label, row }) => {
    const y = GRID_Y + row * STEP + 10.5;
    svg += `  <text x="${GRID_X - 12}" y="${y}" class="axis-label" text-anchor="end">${label}</text>\n`;
  });
  return svg;
}

export function buildCrosshairs() {
  const points = [
    [22, 60], [WIDTH - 22, 60],
    [22, HEIGHT - 22], [WIDTH - 22, HEIGHT - 22]
  ];
  return points.map(([x, y]) =>
    `  <path d="M${x - 4} ${y} H${x + 4} M${x} ${y - 4} V${y + 4}" stroke="#00ff41" stroke-width="1" opacity="0.4"/>`
  ).join("\n");
}

export function buildStars() {
  const stars = [
    [35, 110, 2.2], [45, 190, 3.1], [75, 140, 1.8], [95, 230, 2.7],
    [1090, 110, 2.5], [1120, 180, 1.9], [1145, 130, 3.4], [1105, 220, 2.1],
    [320, 290, 2.0], [580, 290, 3.0], [840, 290, 1.7]
  ];
  return stars.map(([x, y, dur]) =>
    `  <circle cx="${x}" cy="${y}" r="1.1" fill="#86EFAC">` +
    `<animate attributeName="opacity" values="0.15;0.9;0.15" dur="${dur}s" repeatCount="indefinite"/>` +
    `</circle>`
  ).join("\n");
}

export function buildLegend() {
  let svg = `<g transform="translate(${GRID_X}, ${HEIGHT - 20})">\n`;
  svg += `  <text x="0" y="8" class="legend-text">POWER NODES: LOW</text>\n`;
  THEME.palette.forEach((color, i) => {
    const x = 115 + i * 14;
    const stroke = color === THEME.palette[0] ? ` stroke="${THEME.cellEmptyBorder}" stroke-width="0.75"` : "";
    svg += `  <rect x="${x}" y="0" width="10" height="10" rx="2" fill="${color}"${stroke}/>\n`;
  });
  svg += `  <text x="${115 + 5 * 14 + 4}" y="8" class="legend-text">OVERDRIVE</text>\n`;
  svg += `</g>\n`;
  return svg;
}

export function buildArcadeStarfighter(targets = []) {
  return `<g id="starfighter">
  ${buildDynamicReticle(targets)}

  <g transform="translate(0,0)">
    <ellipse cx="0" cy="18" rx="14" ry="3" fill="url(#ionGlow)" opacity="0.7">
      <animate attributeName="rx" values="12;18;13;17" dur="0.2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.5;0.85;0.4;0.9" dur="0.2s" repeatCount="indefinite"/>
    </ellipse>

    <rect x="-21" y="-8" width="2.5" height="18" rx="1" fill="#86EFAC"/>
    <rect x="18.5" y="-8" width="2.5" height="18" rx="1" fill="#86EFAC"/>
    <circle cx="-19.75" cy="-8" r="1.8" fill="#00ff41">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="0.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="19.75" cy="-8" r="1.8" fill="#00ff41">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="0.6s" repeatCount="indefinite"/>
    </circle>

    <polygon points="-14,-16 -7,-16 -5,9 -16,9" fill="#39ff14" stroke="#00b300" stroke-width="1.2"/>
    <polygon points="7,-16 14,-16 16,9 5,9" fill="#39ff14" stroke="#00b300" stroke-width="1.2"/>

    <polygon points="-7,-7 7,-7 18,9 5,6 -5,6 -18,9" fill="#00b300"/>
    <polygon points="0,-12 6,4 0,1 -6,4" fill="#0a140a"/>

    <ellipse cx="0" cy="-3" rx="3.2" ry="5.8" fill="#DCFCE7" opacity="0.95"/>
    <ellipse cx="0" cy="-4.5" rx="1.5" ry="2.6" fill="#FFFFFF"/>

    <g id="twin-thrusters">
      <polygon points="-13,9 -8,9 -10.5,26" fill="url(#plasmaFlame)">
        <animate attributeName="opacity" values="0.75;1;0.6;0.95;0.7;1" dur="0.16s" repeatCount="indefinite"/>
      </polygon>
      <polygon points="-12,9 -9,9 -10.5,15" fill="#FFFFFF">
        <animate attributeName="opacity" values="0.8;1;0.7;1" dur="0.16s" repeatCount="indefinite"/>
      </polygon>

      <polygon points="8,9 13,9 10.5,26" fill="url(#plasmaFlame)">
        <animate attributeName="opacity" values="0.75;1;0.6;0.95;0.7;1" dur="0.16s" repeatCount="indefinite"/>
      </polygon>
      <polygon points="9,9 12,9 10.5,15" fill="#FFFFFF">
        <animate attributeName="opacity" values="0.8;1;0.7;1" dur="0.16s" repeatCount="indefinite"/>
      </polygon>
    </g>
  </g>

  <animateTransform attributeName="transform" attributeType="XML" type="translate"
    dur="${LOOP_DUR}s" repeatCount="indefinite" calcMode="spline"
    keyTimes="0; 0.5; 1"
    keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
    values="${JET_X_START},${JET_Y}; ${JET_X_END},${JET_Y}; ${JET_X_START},${JET_Y}"/>
</g>`;
}

export function buildSvg(weeks, options = {}) {
  const { mock = false, username = USERNAME, cols = 52 } = options;
  if (mock || !weeks || weeks.length === 0) {
    weeks = generateMockWeeks(cols);
  }

  const cells = buildCells(weeks, cols);
  const targets = selectTargets(cells);
  const stats = computeStats(cells);
  const scoreText = computeArcadeScore(stats.total);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<defs>
  <radialGradient id="bgGlow" cx="30%" cy="20%" r="80%">
    <stop offset="0%" stop-color="${THEME.bgStart}"/>
    <stop offset="100%" stop-color="${THEME.bgEnd}"/>
  </radialGradient>

  <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="${THEME.border1}"/>
    <stop offset="50%" stop-color="${THEME.border2}"/>
    <stop offset="100%" stop-color="${THEME.border3}"/>
  </linearGradient>

  <linearGradient id="plasmaFlame" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#39ff14"/>
    <stop offset="40%" stop-color="#00ff41"/>
    <stop offset="80%" stop-color="#F59E0B"/>
    <stop offset="100%" stop-color="#EF4444" stop-opacity="0"/>
  </linearGradient>

  <radialGradient id="ionGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#39ff14" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="#39ff14" stop-opacity="0"/>
  </radialGradient>

  <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
    <rect width="4" height="1" fill="#86EFAC" opacity="0.035"/>
  </pattern>

  <style>
    .hud-label-gold { font-family: 'Courier New', Consolas, monospace; font-size: 13px; fill: #FACC15; font-weight: bold; letter-spacing: 0.5px; }
    .hud-val-gold   { font-family: 'Courier New', Consolas, monospace; font-size: 13px; fill: #FEF08A; font-weight: bold; }
    .hud-label-cyan { font-family: 'Courier New', Consolas, monospace; font-size: 12px; fill: #00ff41; font-weight: bold; letter-spacing: 0.5px; }
    .hud-val-cyan   { font-family: 'Courier New', Consolas, monospace; font-size: 12px; fill: #DCFCE7; font-weight: bold; }
    .hud-label-rose { font-family: 'Courier New', Consolas, monospace; font-size: 12px; fill: #39ff14; font-weight: bold; letter-spacing: 0.5px; }
    .hud-val-rose   { font-family: 'Courier New', Consolas, monospace; font-size: 12px; fill: #BBF7D0; font-weight: bold; }
    .axis-label     { font-family: 'Courier New', Consolas, monospace; font-size: 10px; fill: #4ade80; font-weight: bold; }
    .legend-text    { font-family: 'Courier New', Consolas, monospace; font-size: 9px; fill: #4ade80; font-weight: bold; letter-spacing: 0.5px; }
    .hud-meta       { font-family: 'Courier New', Consolas, monospace; font-size: 10px; fill: #166534; letter-spacing: 1px; font-weight: bold; }
    text { white-space: pre; }
  </style>
</defs>

<rect width="${WIDTH}" height="${HEIGHT}" rx="16" fill="url(#bgGlow)"/>
<rect width="${WIDTH}" height="${HEIGHT}" rx="16" fill="url(#scanlines)"/>
<rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="16" fill="none" stroke="url(#borderGrad)" stroke-width="1.5"/>
<rect x="6" y="6" width="${WIDTH - 12}" height="${HEIGHT - 12}" rx="12" fill="none" stroke="#00ff41" stroke-width="0.5" opacity="0.25"/>

<g id="arcade-hud">
  <text x="24" y="32"><tspan class="hud-label-gold">SCORE: </tspan><tspan class="hud-val-gold">${scoreText}</tspan></text>

  <text x="320" y="32"><tspan class="hud-label-cyan">RANK: </tspan><tspan class="hud-val-cyan">NETWORK ENGINEER</tspan></text>

  <text x="680" y="32"><tspan class="hud-label-rose">STATUS: </tspan><tspan class="hud-val-rose">LEARNING</tspan></text>

  <text x="930" y="32" class="hud-label-cyan">SHIELDS: 100%</text>
  <g transform="translate(1045, 22)">
    ${buildShieldBar(100)}
  </g>

  <line x1="20" y1="46" x2="${WIDTH - 20}" y2="46" stroke="#0f2a0f" stroke-width="1"/>
  <line x1="20" y1="46" x2="160" y2="46" stroke="#FACC15" stroke-width="1" opacity="0.8"/>
  <line x1="${WIDTH - 160}" y1="46" x2="${WIDTH - 20}" y2="46" stroke="#00ff41" stroke-width="1" opacity="0.8"/>
</g>

${buildCrosshairs()}
${buildStars()}

<g id="axes">
${buildMonthLabels(cells)}
${buildDayLabels()}
</g>

<g id="grid">
${buildGrid(cells, targets)}</g>

${buildTargetLockBrackets(targets)}

${buildProminentRailguns(targets)}

${buildExplosiveImpacts(targets)}

${buildLegend()}
<text x="${WIDTH - 140}" y="${HEIGHT - 12}" class="hud-meta" text-anchor="end">[NETWORK DEFENSE GRID // SECTOR: REDJI-JB]</text>

${buildArcadeStarfighter(targets)}
</svg>`;
}

const QUERY = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{weeks{contributionDays{date contributionCount color}}}}}}`;

export async function fetchWeeks(username = USERNAME, token = TOKEN) {
  const endpoint = "https://api.github.com/graphql";
  if (!validateApiEndpoint(endpoint)) {
    throw new Error("Invalid GraphQL endpoint configuration");
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { login: username } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API returned HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error("GraphQL query execution failed: " + JSON.stringify(json.errors));
  }
  return json.data.user.contributionsCollection.contributionCalendar.weeks;
}

export async function main() {
  console.log("Initializing Network Defense Grid Heatmap Engine...");

  let weeks = [];
  let isMock = false;

  if (TOKEN && USERNAME) {
    try {
      console.log(`Querying live GitHub contributions for @${USERNAME}...`);
      weeks = await fetchWeeks(USERNAME, TOKEN);
      console.log(`Successfully retrieved ${weeks.length} weeks of live activity.`);
    } catch (err) {
      console.warn(`Live fetch failed (${err.message}). Falling back to deterministic preview.`);
      isMock = true;
    }
  } else {
    console.log("No GH_TOKEN detected in environment. Generating deterministic preview.");
    isMock = true;
  }

  const svg = buildSvg(weeks, { mock: isMock, username: USERNAME });
  const outPath = path.resolve(OUTPUT);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, svg, "utf8");
  console.log(`Wrote ${outPath} (${Buffer.byteLength(svg, "utf8")} bytes)`);

  updateReadmeCacheBuster(Date.now(), true);
}

export function updateReadmeCacheBuster(version = Date.now(), writeToFile = true) {
  const versionStr = String(version);
  if (!/^[a-zA-Z0-9_-]+$/.test(versionStr)) {
    throw new Error("Invalid cache buster format");
  }

  const readmePath = path.resolve("README.md");
  if (!fs.existsSync(readmePath)) {
    return "";
  }

  let content = fs.readFileSync(readmePath, "utf8");
  content = content.replace(
    /(github-jet\.svg\?v=)[a-zA-Z0-9_-]+/g,
    `$1${versionStr}`
  );

  if (writeToFile) {
    fs.writeFileSync(readmePath, content, "utf8");
    console.log(`Updated README.md cache buster to ?v=${versionStr}`);
  }
  return content;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  main().catch(err => {
    console.error("FATAL:", err.message);
    process.exit(1);
  });
}
