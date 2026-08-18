import type { Ctx2D, PartDef } from "../types";
import { rr } from "../draw-utils";

export const def: PartDef = {
  id: "kasten",
  icon: "🍺",
  name: "Bierkasten",
  w: 1,
  h: 1,
  weight: 4,
  buoy: 18,
  tough: 2,
  flavor: "Leer. Natürlich leer.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  // Flaschenhälse
  ctx.fillStyle = "#5e3d17";
  for (const fx of [0.28, 0.5, 0.72]) {
    ctx.fillRect(x + w * fx - w * 0.045, y + h * 0.1, w * 0.09, h * 0.22);
    ctx.beginPath();
    ctx.arc(x + w * fx, y + h * 0.1, w * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
  // Kasten
  rr(ctx, x + w * 0.08, y + h * 0.28, w * 0.84, h * 0.62, h * 0.08, "#e8b93a", "#9a7315");
  ctx.strokeStyle = "#9a7315";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.08, y + h * 0.52);
  ctx.lineTo(x + w * 0.92, y + h * 0.52);
  ctx.moveTo(x + w * 0.38, y + h * 0.52);
  ctx.lineTo(x + w * 0.38, y + h * 0.9);
  ctx.moveTo(x + w * 0.62, y + h * 0.52);
  ctx.lineTo(x + w * 0.62, y + h * 0.9);
  ctx.stroke();
  // Griffloch
  rr(ctx, x + w * 0.38, y + h * 0.34, w * 0.24, h * 0.1, h * 0.05, "#9a7315");
}
