import type { Ctx2D, PartDef } from "./types";
import { TINT } from "./config";
import { rr } from "./draw-utils";
import { PAINTERS } from "./parts/index";

// Zeichnet ein Bauteil ins Raster-Rechteck — überall gleich: Palette, Werkbank, Fluss, Treibgut.
export function drawPartRect(
  ctx: Ctx2D,
  def: PartDef,
  x: number,
  y: number,
  cs: number,
  broken?: boolean,
) {
  const w = def.w * cs,
    h = def.h * cs;
  ctx.save();
  if (broken) ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1.5, cs * 0.05);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const painter = PAINTERS[def.id];
  if (painter) {
    painter(ctx, x, y, w, h);
  } else {
    // Fallback: getintete Kachel mit Emoji
    const tint = TINT[def.id] || "255,255,255";
    rr(ctx, x + 2, y + 2, w - 4, h - 4, 8, `rgba(${tint},0.28)`, `rgba(${tint},0.75)`);
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.min(w, h) * 0.72}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.icon, x + w / 2, y + h / 2 + 2);
  }
  ctx.restore();
  if (broken) {
    ctx.font = `${Math.min(w, h) * 0.6}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.brokenIcon || "💥", x + w / 2, y + h / 2);
  }
}
