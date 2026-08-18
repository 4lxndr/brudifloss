/* Gemeinsamer Simulations-Zustand + Wellen- und Partikel-Helfer. */

import { $, GOAL_M, PXPM } from "./config";

// Vom Spieler in der Bauphase gewählte Einstellungen
export const settings = { endless: false };

export const sim: any = {
  running: false,
  phase: "drop",
  t: 0,
  lastTs: 0,
  main: null,
  drifters: [],
  freeBrudi: null,
  swamp: 0,
  tilt: 0,
  dEq: 0,
  sinkDepth: 0,
  dropY: 0,
  chaosEvents: [],
  particles: [],
  comfort: 0,
  sinkAt: 0,
  bannerTimeout: null,
};

export const canvas = () => $("sea") as HTMLCanvasElement;

export function resizeCanvas() {
  const c = canvas();
  c.width = c.clientWidth * devicePixelRatio;
  c.height = c.clientHeight * devicePixelRatio;
}
window.addEventListener("resize", () => {
  if (sim.running) resizeCanvas();
});

export function inRapids(m: number): boolean {
  return sim.zones && sim.zones.some((z: any) => m >= z.s && m <= z.e);
}

export function waveAmp(): number {
  if (sim.phase === "drop") return 5;
  // Im Endlos-Modus wachsen die Wellen über die 600 m hinaus weiter — bis es nicht mehr geht.
  const cap = sim.endless ? 1.8 : 1;
  const base = 6 + Math.min(cap, sim.dist / GOAL_M) * 9;
  return base * (inRapids(sim.dist) ? 2.2 : 1);
}

export function waveAt(x: number, time: number): number {
  const a = waveAmp();
  const wx = x + (sim.dist || 0) * PXPM * 0.6; // Wellen ziehen mit der Strömung vorbei
  return (
    Math.sin(wx * 0.012 + time * 1.6) * a * 0.6 +
    Math.sin(wx * 0.027 - time * 2.3) * a * 0.3 +
    Math.sin(wx * 0.005 + time * 0.7) * a * 0.4
  );
}

export function spawnSplash(x: number, y: number, n: number, big?: boolean) {
  for (let i = 0; i < n; i++) {
    sim.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * (big ? 260 : 120),
      vy: -Math.random() * (big ? 320 : 160) - 40,
      life: 0.9 + Math.random() * 0.5,
      r: 2 + Math.random() * (big ? 5 : 3),
      type: "drop",
    });
  }
}

export function spawnBubble(x: number, y: number) {
  sim.particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 20,
    vy: -30 - Math.random() * 40,
    life: 1.5,
    r: 2 + Math.random() * 4,
    type: "bubble",
  });
}
