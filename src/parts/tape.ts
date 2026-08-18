import type { Ctx2D, PartDef } from "../types";

export const def: PartDef = {
  id: "tape",
  icon: "🩹",
  name: "Panzertape",
  w: 1,
  h: 1,
  weight: 1,
  buoy: 1,
  tough: 3,
  flavor: "Löst 98 % aller Probleme. Jede Rolle = eine Notfallreparatur, wenn es unterwegs KNARZT.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  const cx = x + w * 0.5,
    cy = y + h * 0.54;
  // Abstehender Streifen mit gezacktem Ende
  ctx.fillStyle = "#c3c9d0";
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.1, cy - h * 0.3);
  ctx.lineTo(cx + w * 0.42, cy - h * 0.44);
  ctx.lineTo(cx + w * 0.38, cy - h * 0.36);
  ctx.lineTo(cx + w * 0.44, cy - h * 0.3);
  ctx.lineTo(cx + w * 0.4, cy - h * 0.22);
  ctx.lineTo(cx + w * 0.12, cy - h * 0.14);
  ctx.closePath();
  ctx.fill();
  // Rolle
  ctx.fillStyle = "#9aa1a9";
  ctx.strokeStyle = "#5f666e";
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Loch in der Mitte
  ctx.fillStyle = "#2b2f36";
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.13, 0, Math.PI * 2);
  ctx.fill();
  // Glanzkante
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.24, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
}
