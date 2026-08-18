import type { Ctx2D, PartDef } from "../types";

export const def: PartDef = {
  id: "anker",
  icon: "⚓",
  name: "Anker",
  w: 1,
  h: 1,
  weight: 70,
  buoy: 0,
  tough: 5,
  flavor: "Wofür?? War im Angebot.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2;
  ctx.strokeStyle = "#35507a";
  ctx.lineWidth = w * 0.1;
  ctx.lineCap = "round";
  // Ring
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.14, w * 0.09, 0, Math.PI * 2);
  ctx.stroke();
  // Schaft
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.24);
  ctx.lineTo(cx, y + h * 0.8);
  ctx.stroke();
  // Querstock
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.22, y + h * 0.34);
  ctx.lineTo(cx + w * 0.22, y + h * 0.34);
  ctx.stroke();
  // Arme
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.55, w * 0.3, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  // Flunken
  ctx.fillStyle = "#35507a";
  for (const side of [-1, 1]) {
    const fx = cx + side * w * 0.285;
    ctx.beginPath();
    ctx.moveTo(fx, y + h * 0.68);
    ctx.lineTo(fx + side * w * 0.1, y + h * 0.56);
    ctx.lineTo(fx - side * w * 0.06, y + h * 0.56);
    ctx.closePath();
    ctx.fill();
  }
}
