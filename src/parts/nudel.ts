import type { Ctx2D, PartDef } from "../types";
import { rr } from "../draw-utils";

export const def: PartDef = {
  id: "nudel",
  icon: "🍜",
  name: "Pool-Nudel-Bündel",
  w: 2,
  h: 1,
  weight: 1,
  buoy: 22,
  tough: 1,
  flavor: "Schaumstoff-Hightech von 1998.",
};

export function paint(ctx: Ctx2D, x: number, y: number, w: number, h: number) {
  const colors: [string, string][] = [
    ["#ff6fa5", "#c74a7c"],
    ["#58d68d", "#35a765"],
    ["#5dade2", "#3a7fb0"],
  ];
  colors.forEach(([fill, line], i) => {
    const ny = y + h * (0.12 + i * 0.28);
    rr(ctx, x + w * 0.04, ny, w * 0.92, h * 0.22, h * 0.11, fill, line);
    // Loch am Ende
    ctx.fillStyle = line;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.93, ny + h * 0.11, w * 0.025, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}
