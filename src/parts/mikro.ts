import type { Ctx2D, PartDef } from "../types";
import { rr } from "../draw-utils";

export const def: PartDef = {
  id: "mikro",
  icon: "📠",
  name: "Mikrowelle",
  w: 1,
  h: 1,
  weight: 12,
  buoy: 1,
  tough: 3,
  comfort: 1,
  flavor: "Ramen auf hoher See.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  rr(ctx, x + w * 0.06, y + h * 0.2, w * 0.88, h * 0.6, h * 0.08, "#b8bec6", "#78808a");
  // Fenster
  rr(ctx, x + w * 0.12, y + h * 0.28, w * 0.5, h * 0.44, h * 0.05, "#3a3f46", "#23272c");
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.18, y + h * 0.62);
  ctx.lineTo(x + w * 0.34, y + h * 0.34);
  ctx.stroke();
  // Bedienfeld
  ctx.fillStyle = "#5cd65c";
  ctx.fillRect(x + w * 0.7, y + h * 0.3, w * 0.16, h * 0.08);
  ctx.fillStyle = "#78808a";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + w * 0.78, y + h * (0.48 + i * 0.1), w * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  // Füße
  ctx.fillStyle = "#78808a";
  ctx.fillRect(x + w * 0.14, y + h * 0.8, w * 0.1, h * 0.05);
  ctx.fillRect(x + w * 0.76, y + h * 0.8, w * 0.1, h * 0.05);
}
