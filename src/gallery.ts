/* Dev-Galerie: rendert jedes gezeichnete Element einzeln (animiert).
   Nur lokal erreichbar — auf der Live-Domain gibt es nur einen Hinweis. */

import type { Ctx2D, PlacedPart } from "./types";
import { PARTS } from "./parts/index";
import { drawFifthMark, drawPartRect } from "./painters";
import { buildStructure } from "./physics";
import { sim } from "./state";
import {
  drawBomber,
  drawBrudi,
  drawCameos,
  drawExplosion,
  drawGoal,
  drawMayflies,
  drawMonkeyPigeon,
  drawPoliceBoat,
  drawRocket,
  drawStructure,
  drawUmbrellaMonkey,
} from "./scene";

interface Slot {
  label: string;
  w: number;
  h: number;
  render: (ctx: Ctx2D, w: number, h: number, t: number) => void;
}

// Setzt die sim-Felder, die die Zeichenfunktionen lesen, auf neutrale Werte.
function neutralSim() {
  sim.phase = "float";
  sim.dist = 0;
  sim.zones = [];
  sim.tilt = 0;
  sim.dEq = 20;
  sim.sinkDepth = 0;
  sim.dropY = 0;
  sim.freeBrudi = null;
  sim.mayflies = null;
  sim.cameos = [];
  sim.rocket = null;
  sim.police = null;
  sim.nuke = null;
  sim.nukeHit = false;
  sim.explosion = null;
  sim.blizzcon = false;
  sim.umbrellaMonkey = null;
  sim.gull = null;
  sim.drifters = [];
  sim.shake = 0;
}

function makePart(id: string, col: number, row: number, fifth = false): PlacedPart {
  const def = PARTS.find((p) => p.id === id)!;
  return { def, col, row, broken: false, fifth };
}

function buildSlots(): Slot[] {
  const slots: Slot[] = [];

  // --- Alle Bauteile ---
  for (const def of PARTS) {
    slots.push({
      label: `${def.name} (${def.w}×${def.h})`,
      w: 220,
      h: 150,
      render(ctx, w, h) {
        const cs = Math.min((w - 30) / def.w, (h - 30) / def.h);
        drawPartRect(ctx, def, (w - def.w * cs) / 2, (h - def.h * cs) / 2, cs);
      },
    });
  }
  const fass = PARTS.find((p) => p.id === "fass")!;
  slots.push({
    label: "Das 5. Fass",
    w: 220,
    h: 150,
    render(ctx, w, h) {
      const cs = Math.min((w - 30) / 2, (h - 30) / 2);
      const x = (w - 2 * cs) / 2,
        y = (h - 2 * cs) / 2;
      drawPartRect(ctx, fass, x, y, cs);
      drawFifthMark(ctx, x, y, 2 * cs, 2 * cs);
    },
  });
  const brett = PARTS.find((p) => p.id === "brett")!;
  slots.push({
    label: "Brett (kaputt)",
    w: 220,
    h: 150,
    render(ctx, w, h) {
      const cs = Math.min((w - 30) / 3, h - 30);
      drawPartRect(ctx, brett, (w - 3 * cs) / 2, (h - cs) / 2, cs, true);
    },
  });

  // --- Brudi in allen Lebenslagen ---
  slots.push({
    label: "Brudi (entspannt)",
    w: 220,
    h: 190,
    render(ctx, w, h, t) {
      drawBrudi(ctx, w / 2, h - 30, t, false);
    },
  });
  slots.push({
    label: "Brudi (Panik)",
    w: 220,
    h: 190,
    render(ctx, w, h, t) {
      drawBrudi(ctx, w / 2, h - 30, t, true);
    },
  });
  slots.push({
    label: "Brudi (Sieger)",
    w: 220,
    h: 190,
    render(ctx, w, h, t) {
      sim.phase = "won";
      drawBrudi(ctx, w / 2, h - 30, t, false);
      sim.phase = "float";
    },
  });

  // --- Beispiel-Floß mit Flagge ---
  slots.push({
    label: "Beispiel-Floß",
    w: 340,
    h: 230,
    render(ctx, w, h, t) {
      sim.main = buildStructure([
        makePart("fass", 0, 1),
        makePart("fass", 2, 1, true),
        makePart("brett", 0, 0),
      ]);
      drawStructure(ctx, w / 2, h * 0.72, t);
      sim.main = null;
    },
  });

  // --- Flugobjekte & Gegner ---
  slots.push({
    label: "Affe auf Taube",
    w: 340,
    h: 160,
    render(ctx, w, h) {
      drawMonkeyPigeon(ctx, w, h * 2.6);
    },
  });
  slots.push({
    label: "Schirm-Affe",
    w: 220,
    h: 190,
    render(ctx, w, h) {
      sim.umbrellaMonkey = { atM: 0 };
      drawUmbrellaMonkey(ctx, w / 2, w, h * 3.2);
      sim.umbrellaMonkey = null;
    },
  });
  slots.push({
    label: "Polizeiboot",
    w: 420,
    h: 180,
    render(ctx, w, h, t) {
      sim.police = { announced: true, approach: 1, shot: false, done: false, shotProg: 0 };
      drawPoliceBoat(ctx, w - 170 + 250, h * 0.72, t);
      sim.police = null;
    },
  });
  slots.push({
    label: "Rakete",
    w: 220,
    h: 190,
    render(ctx, w, h) {
      sim.rocket = { fired: true, prog: 1, exploded: false };
      drawRocket(ctx, w / 2, h * 0.5 + 80);
      sim.rocket = null;
    },
  });
  slots.push({
    label: "Bomber (mit Bombe)",
    w: 420,
    h: 200,
    render(ctx, w, h, t) {
      sim.nuke = { bomber: 0.5, dropped: true, bombProg: 0.45, detonated: false };
      drawBomber(ctx, w / 2, h * 0.95, w, h * 0.9, t);
      sim.nuke = null;
    },
  });
  slots.push({
    label: "Explosion",
    w: 220,
    h: 190,
    render(ctx, w, h, t) {
      sim.explosion = { x: w / 2, y: h / 2, r: 42 + Math.sin(t * 4) * 8, life: 0.85 };
      drawExplosion(ctx, h);
      sim.explosion = null;
    },
  });
  slots.push({
    label: "Atompilz",
    w: 260,
    h: 230,
    render(ctx, w, h) {
      sim.nukeHit = true;
      sim.explosion = { x: w / 2, y: h * 0.75, r: 40, life: 1.1 };
      drawExplosion(ctx, h * 0.95);
      sim.nukeHit = false;
      sim.explosion = null;
    },
  });

  // --- Ereignisse & Kulissen ---
  slots.push({
    label: "Maifliegen-Schwarm",
    w: 340,
    h: 200,
    render(ctx, w, h) {
      sim.mayflies = { intensity: 1, corpses: 0 };
      drawMayflies(ctx, w / 2, h * 0.9, 0);
      drawMayflies(ctx, w / 2, h * 0.9, 1);
      sim.mayflies = null;
    },
  });
  for (const [id, label, cw] of [
    ["egypt", "Ägypten-Cameo", 420],
    ["amsterdam", "Amsterdam-Cameo", 300],
    ["mccarry", "McCarry-Cameo", 300],
    ["suitcase", "25.000-€-Koffer", 220],
  ] as [string, string, number][]) {
    slots.push({
      label,
      w: cw,
      h: 200,
      render(ctx, w, h, t) {
        sim.cameos = [{ id, atM: 0, stage: 0 }];
        drawCameos(ctx, w / 2, w, h * 0.85, t);
        sim.cameos = [];
      },
    });
  }
  slots.push({
    label: "Ziel-Steg (mit den 2%-Beamten)",
    w: 420,
    h: 200,
    render(ctx, _w, h) {
      sim.blizzcon = true;
      drawGoal(ctx, 30, h * 0.8);
      sim.blizzcon = false;
    },
  });

  return slots;
}

export function initGallery() {
  const root = document.getElementById("gallery-root")!;
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (!isLocal) {
    root.innerHTML =
      "<p class='gallery-denied'>🛂 ENTRY DENIED — die Galerie gibt es nur lokal (npm run dev).</p>";
    return;
  }

  const slots = buildSlots();
  const items: { slot: Slot; ctx: Ctx2D }[] = [];
  const dpr = devicePixelRatio || 1;
  for (const slot of slots) {
    const item = document.createElement("div");
    item.className = "g-item";
    const cv = document.createElement("canvas");
    cv.width = slot.w * dpr;
    cv.height = slot.h * dpr;
    cv.style.width = slot.w + "px";
    cv.style.height = slot.h + "px";
    const label = document.createElement("div");
    label.className = "g-label";
    label.textContent = slot.label;
    item.appendChild(cv);
    item.appendChild(label);
    root.appendChild(item);
    items.push({ slot, ctx: cv.getContext("2d")! });
  }

  const start = performance.now();
  function frame() {
    const t = (performance.now() - start) / 1000;
    neutralSim();
    sim.t = t;
    for (const { slot, ctx } of items) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, slot.w, slot.h);
      ctx.save();
      slot.render(ctx, slot.w, slot.h, t);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
