import type { Ctx2D, PartDef } from "../types";
import { rr } from "../draw-utils";

export const def: PartDef = {
  id: "brett",
  icon: "🪵",
  name: "Brett",
  w: 3,
  h: 1,
  weight: 6,
  buoy: 12,
  tough: 2,
  flavor: "Der Grundbaustein. Splittergefahr.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  rr(ctx, x + 1, y + h * 0.22, w - 2, h * 0.56, h * 0.1, "#b07a3e", "#6e4620");
  // Maserung
  ctx.strokeStyle = "rgba(110,70,32,0.55)";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y + h * 0.42);
  ctx.quadraticCurveTo(x + w * 0.45, y + h * 0.36, x + w * 0.9, y + h * 0.45);
  ctx.moveTo(x + w * 0.15, y + h * 0.62);
  ctx.quadraticCurveTo(x + w * 0.55, y + h * 0.68, x + w * 0.88, y + h * 0.6);
  ctx.stroke();
  // Schrauben
  ctx.fillStyle = "#4d3315";
  for (const sx of [x + w * 0.07, x + w * 0.93]) {
    ctx.beginPath();
    ctx.arc(sx, y + h * 0.5, h * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
}
