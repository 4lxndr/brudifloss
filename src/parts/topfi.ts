import type { Ctx2D, PartDef } from "../types";
import { rr } from "../draw-utils";

export const def: PartDef = {
  id: "topfi",
  icon: "🍲",
  name: "Topfi",
  w: 1,
  h: 1,
  weight: 3,
  buoy: 15,
  tough: 5,
  comfort: 1,
  flavor:
    "Der treueste Topf der Welt. Unzerstörbar — sein Knoten leider nicht. Das Militär beobachtet Topf-Ansammlungen.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  // Der treueste (und leicht schimmelige) Topf der Welt
  rr(ctx, x + w * 0.16, y + h * 0.34, w * 0.68, h * 0.52, h * 0.1, "#8f97a3", "#5c636e");
  // Deckel
  ctx.fillStyle = "#aab2bd";
  ctx.strokeStyle = "#5c636e";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.34, w * 0.36, h * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#5c636e";
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.24, w * 0.07, 0, Math.PI * 2);
  ctx.fill();
  // Griffe
  ctx.strokeStyle = "#5c636e";
  ctx.lineWidth = w * 0.06;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(
      x + w * (0.5 + side * 0.36),
      y + h * 0.5,
      w * 0.08,
      Math.PI * 0.5,
      Math.PI * 1.5,
      side > 0,
    );
    ctx.stroke();
  }
  // Schimmel — Topfi hat schon einiges erlebt
  for (const [mx, my, mr] of [
    [0.3, 0.78, 0.1],
    [0.66, 0.62, 0.075],
    [0.44, 0.86, 0.06],
  ]) {
    ctx.fillStyle = "#7fae4a";
    ctx.beginPath();
    ctx.arc(x + w * mx, y + h * my, w * mr, 0, Math.PI * 2);
    ctx.arc(x + w * (mx + 0.06), y + h * (my - 0.03), w * mr * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c8534";
    ctx.beginPath();
    ctx.arc(x + w * (mx + 0.02), y + h * my, w * mr * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  // Kulleraugen — Topfi ist ein Charakter, kein Küchengerät
  for (const side of [-1, 1]) {
    const ex = x + w * (0.5 + side * 0.12);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ex, y + h * 0.5, w * 0.085, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b2b34";
    ctx.beginPath();
    ctx.arc(ex + side * w * 0.02, y + h * 0.52, w * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
  // Die Fliege gehört inzwischen zur Familie
  ctx.fillStyle = "#2b2b34";
  ctx.beginPath();
  ctx.arc(x + w * 0.88, y + h * 0.16, w * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(43,43,52,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + w * 0.82, y + h * 0.14, w * 0.08, Math.PI * 1.2, Math.PI * 1.9);
  ctx.stroke();
}
