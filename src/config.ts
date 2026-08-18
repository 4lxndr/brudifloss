/* Globale Konstanten und kleine DOM-Helfer. */

export const FACE_URL = "https://cdn.7tv.app/emote/01KW5E35D61ZQKH314JDR4DZCD/4x.avif";
export const BRUDI_WEIGHT = 85;
export const GOAL_M = 600; // Flussstrecke bis zum Ziel-Steg (Meter)
export const PXPM = 10; // Pixel pro Meter
export const BASE_SPEED = 14; // m/s Flussgeschwindigkeit

export const COLS = 20;
export const ROWS = 10;
export const CELL = 44; // Werkbank-Zellgröße
export const CT = 34; // Zellgröße im Wassertest

// Kachel-Farben der Palette (r,g,b)
export const TINT: Record<string, string> = {
  brett: "170,110,50",
  fass: "160,102,47",
  matratze: "255,120,190",
  ente: "255,210,60",
  wanne: "210,225,240",
  hype: "145,70,255",
  stuhl: "110,110,160",
  mikro: "150,150,165",
  anker: "120,140,170",
  kasten: "230,170,40",
  nudel: "80,220,160",
  topfi: "170,180,200",
  strudel: "235,180,90",
};

export const $ = (id: string) => document.getElementById(id) as HTMLElement;

export const FACE = new Image();
FACE.src = FACE_URL;
