/* Alles, was das Floß kaputt macht: Felsen, Rakete, Bombe, Polizei, lose Knoten. */

import type { PlacedPart } from "./types";
import { CT } from "./config";
import { sim, spawnSplash } from "./state";
import { showBanner } from "./hud";
import { buildStructure, components, standCell } from "./physics";

// Ein Teil löst sich vom Floß: wird zu Treibgut, Struktur wird neu berechnet.
export function detachPart(part: PlacedPart, raftX: number, waterBase: number, silent?: boolean) {
  const st = sim.main;
  if (!st || !st.parts.includes(part)) return;

  const sc = standCell(st.parts);
  const stoodOnIt =
    sc &&
    sc[0] >= part.col &&
    sc[0] < part.col + part.def.w &&
    sc[1] >= part.row &&
    sc[1] < part.row + part.def.h;

  const toDrifter = (p: PlacedPart) =>
    sim.drifters.push({
      def: p.def,
      dx: (p.col - st.minCol + p.def.w / 2) * CT - st.cmx,
      vx: ((p.col - st.minCol + p.def.w / 2) * CT < st.cmx ? -1 : 1) * (30 + Math.random() * 35),
      wob: Math.random() * 10,
    });

  toDrifter(part);
  sim.brokeOff.push(part.def.name);
  for (const ce of sim.chaosEvents) if (ce.part === part) ce.done = true;
  spawnSplash(raftX + (part.col - st.minCol + part.def.w / 2) * CT - st.cmx, waterBase, 25, true);

  if (!silent) {
    const msgs = [
      `„${part.def.name}“ hat sich VERABSCHIEDET! 🪢`,
      `${part.def.name} war offenbar nur DEKO-verknotet! 🫠`,
      `Und tschüss, ${part.def.name}! Einfach weggeschwommen!`,
    ];
    showBanner(msgs[Math.floor(Math.random() * msgs.length)], true, 2800);
  }

  const remaining = st.parts.filter((p: PlacedPart) => p !== part);
  if (!remaining.length) {
    sim.main = null;
    sim.phase = "soloswim";
    sim.sinkAt = sim.t;
    sim.freeBrudi = { x: raftX, y: waterBase - 50, vx: 0, vy: 0, inWater: false, since: 0 };
    setTimeout(() => showBanner("Das Floß hat sich KOMPLETT ZERLEGT! 🧨", true, 3000), 1400);
    return;
  }

  // Hängt der Rest noch zusammen? Kleinere Bruchstücke treiben ebenfalls davon.
  const groups = components(remaining).sort(
    (a, b) =>
      b.reduce((s, p) => s + p.def.w * p.def.h, 0) - a.reduce((s, p) => s + p.def.w * p.def.h, 0),
  );
  for (const p of groups.slice(1).flat()) {
    toDrifter(p);
    sim.brokeOff.push(p.def.name);
  }
  if (groups.length > 1)
    setTimeout(() => showBanner("…und der Rest gleich MIT! 🧨", true, 2400), 1000);

  if (stoodOnIt)
    setTimeout(() => showBanner("Brudis STANDFLÄCHE! Umsteigen, SCHNELL! 😱", true, 2400), 500);

  const brokenSet = new Set(st.parts.filter((p: PlacedPart) => p.broken));
  sim.main = buildStructure(groups[0]);
  for (const p of sim.main.parts) if (brokenSet.has(p)) p.broken = true;
}

// Kollision mit einem Felsen: Teile fliegen ab, alles wackelt.
export function rockCrash(rock: any, raftX: number, waterBase: number) {
  rock.hit = true;
  sim.rockHits++;
  sim.shake = Math.max(sim.shake, 1.3);
  sim.tilt += (Math.random() - 0.5) * 0.4;
  spawnSplash(raftX + 30, waterBase, 40, true);

  const st = sim.main;
  if (!st) return;
  // Die getroffenen Teile würfeln gegen ihre Festigkeit
  const candidates = st.parts.filter((p: PlacedPart) => p.def.id !== "topfi");
  const n = Math.min(candidates.length, 1 + (Math.random() < 0.4 ? 1 : 0));
  const lost: string[] = [],
    tanked: string[] = [];
  for (let i = 0; i < n; i++) {
    const pick = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
    if (!pick || !sim.main || !sim.main.parts.includes(pick)) continue;
    if (Math.random() < (pick.def.tough || 1) / 6) {
      tanked.push(pick.def.name);
    } else {
      detachPart(pick, raftX, waterBase, true);
      lost.push(pick.def.name);
    }
  }
  let msg: string;
  if (lost.length) {
    msg = [
      `KLONK! 🪨 „${lost.join("“ und „")}“ ist AB!`,
      `VOLL GEGEN DEN FELSEN! 🪨 ${lost.join(" und ")}: weg.`,
    ][Math.floor(Math.random() * 2)];
  } else if (tanked.length) {
    msg = `KLONK! 🪨 ${tanked.join(" und ")} hat den Felsen einfach WEGGETANKT! 💪`;
  } else {
    msg = "KLONK! 🪨 Der Felsen stand da schon IMMER, Brudi.";
  }
  showBanner(msg, true, 2600);
}

// Die Rakete schlägt ein. Übertrieben? Ja. Absicht? Auch.
export function rocketImpact(raftX: number, waterBase: number) {
  const r = sim.rocket;
  r.exploded = true;
  sim.rocketHit = true;
  sim.shake = 3;
  sim.explosion = { x: raftX, y: waterBase - 40, r: 12, life: 1 };
  spawnSplash(raftX, waterBase, 90, true);
  showBanner("💥 DIREKTER RAKETENEINSCHLAG. Klar. Warum auch nicht.", true, 3400);

  const st = sim.main;
  if (st) {
    // Auch hier hilft Festigkeit — gegen eine Rakete allerdings nur bedingt.
    // Topfi ist unzerstörbar, aber sein KNOTEN nicht: Er kann abgerissen werden.
    const doomed = st.parts.filter(
      (p: PlacedPart) => Math.random() < 1 - (p.def.tough || 1) * 0.07,
    );
    const potsGone = doomed.filter((p: PlacedPart) => p.def.id === "topfi").length;
    for (const p of doomed) {
      if (sim.main && sim.main.parts.includes(p)) detachPart(p, raftX, waterBase, true);
    }
    if (potsGone) {
      setTimeout(
        () =>
          showBanner(
            "Die Topfis überleben natürlich – schwimmen jetzt nur woanders. 🍲👋",
            false,
            2600,
          ),
        2200,
      );
    }
  }
  sim.tilt += (Math.random() < 0.5 ? -1 : 1) * 0.3;
}

// Die Bombe. Verdampft alles — außer Topfi. Topfi ist ewig.
export function nukeDetonate(raftX: number, waterBase: number) {
  const nk = sim.nuke;
  nk.detonated = true;
  sim.nukeHit = true;
  sim.shake = 5;
  sim.nukeFlash = 1.8;
  sim.explosion = { x: raftX, y: waterBase - 70, r: 40, life: 2.4 };
  spawnSplash(raftX, waterBase, 150, true);
  showBanner("☢️ ATOMPILZ. ÜBER EINEM FLOẞ.", true, 3200);

  const st = sim.main;
  if (st) {
    for (const p of st.parts) {
      if (p.def.id === "topfi") {
        // Topfi übersteht auch das. Selbstverständlich.
        sim.drifters.push({
          def: p.def,
          dx: (p.col - st.minCol + 0.5) * CT - st.cmx,
          vx: (Math.random() - 0.5) * 80,
          wob: Math.random() * 10,
        });
      } else {
        sim.brokeOff.push(p.def.name);
      }
    }
    sim.main = null;
  }
  sim.phase = "soloswim";
  sim.sinkAt = sim.t;
  sim.freeBrudi = { x: raftX, y: waterBase - 50, vx: 0, vy: 0, inWater: false, since: -1.2 };
  setTimeout(() => showBanner("🍲 Die Topfis haben überlebt. Alle.", false, 2600), 2400);
}

// Die Staatsgewalt trifft. Festigkeit hilft — Beamte zielen aber gut.
export function policeHit(raftX: number, waterBase: number) {
  const po = sim.police;
  po.done = true;
  sim.policeHit = true;
  sim.shake = 2.5;
  sim.explosion = { x: raftX, y: waterBase - 30, r: 10, life: 1 };
  spawnSplash(raftX, waterBase, 70, true);
  showBanner("🚔💥 SIE HABEN WIRKLICH GESCHOSSEN!", true, 3200);
  const st = sim.main;
  if (st) {
    // Auch Topfi-Knoten halten einer Bordkanone nicht stand (der Topf selbst schon).
    const doomed = st.parts.filter((p: PlacedPart) => Math.random() < 1 - p.def.tough * 0.09);
    const potsGone = doomed.filter((p: PlacedPart) => p.def.id === "topfi").length;
    for (const p of doomed) {
      if (sim.main && sim.main.parts.includes(p)) detachPart(p, raftX, waterBase, true);
    }
    if (potsGone) {
      setTimeout(() => showBanner("Die Topfis? Unversehrt. Nur… weg. 🍲👋", false, 2400), 2200);
    }
  }
  sim.tilt += (Math.random() < 0.5 ? -1 : 1) * 0.25;
}
