import type { Ctx2D, PartDef } from "../types";
import { rr } from "../draw-utils";

export const def: PartDef = {
  id: "fass",
  icon: "🛢️",
  name: "Holzfass",
  w: 2,
  h: 2,
  weight: 25,
  buoy: 90,
  tough: 4,
  flavor: "Klassiker. Riecht leicht nach Met.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  rr(ctx, x + 3, y + 3, w - 6, h - 6, w * 0.24, "#a0662f", "#5c3a18");
  ctx.fillStyle = "#6e4620";
  ctx.fillRect(x + 4, y + h * 0.26, w - 8, h * 0.09);
  ctx.fillRect(x + 4, y + h * 0.65, w - 8, h * 0.09);
  // Lichtkante
  ctx.strokeStyle = "rgba(255,225,170,0.35)";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.22, y + h * 0.12);
  ctx.quadraticCurveTo(x + w * 0.14, y + h * 0.5, x + w * 0.22, y + h * 0.88);
  ctx.stroke();
}
