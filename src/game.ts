/* ============================================================
   FLOẞ-SIMULATOR – Brudivoeller_TV Edition
   Bauteile zusammenstecken → Form bestimmt die Physik.
   ============================================================ */

interface PartDef {
  id: string;
  icon: string;
  name: string;
  w: number;
  h: number;
  weight: number;
  buoy: number;
  tough: number;
  comfort?: number;
  chaos?: number;
  chaosMsg?: string;
  brokenIcon?: string;
  max?: number;
  flavor: string;
}

interface PlacedPart {
  def: PartDef;
  col: number;
  row: number;
  broken: boolean;
}

interface Structure {
  parts: PlacedPart[];
  minCol: number;
  minRow: number;
  Wpx: number;
  Hpx: number;
  cells: { part: PlacedPart; x: number; hb: number; cap: number }[];
  standX: number;
  standY: number;
  weight: number;
  cmx: number;
  cmy: number;
}

const FACE_URL = "https://cdn.7tv.app/emote/01KW5E35D61ZQKH314JDR4DZCD/4x.avif";
const BRUDI_WEIGHT = 85;
const GOAL_M = 600; // Flussstrecke bis zum Ziel-Steg (Meter)
const PXPM = 10; // Pixel pro Meter
const BASE_SPEED = 14; // m/s Flussgeschwindigkeit

const COLS = 20,
  ROWS = 10;
const CELL = 44; // Werkbank-Zellgröße
const CT = 34; // Zellgröße im Wassertest

const PARTS: PartDef[] = [
  {
    id: "brett",
    icon: "🪵",
    name: "Brett",
    w: 3,
    h: 1,
    weight: 6,
    buoy: 12,
    tough: 2,
    flavor: "Der Grundbaustein. Splittergefahr.",
  },
  {
    id: "kasten",
    icon: "🍺",
    name: "Bierkasten",
    w: 1,
    h: 1,
    weight: 4,
    buoy: 18,
    tough: 2,
    flavor: "Leer. Natürlich leer.",
  },
  {
    id: "nudel",
    icon: "🍜",
    name: "Pool-Nudel-Bündel",
    w: 2,
    h: 1,
    weight: 1,
    buoy: 22,
    tough: 1,
    flavor: "Schaumstoff-Hightech von 1998.",
  },
  {
    id: "fass",
    icon: "🛢️",
    name: "Holzfass",
    w: 2,
    h: 2,
    weight: 25,
    buoy: 90,
    tough: 4,
    flavor: "Klassiker. Riecht leicht nach Met.",
  },
  {
    id: "matratze",
    icon: "🦩",
    name: "Luftmatratze",
    w: 3,
    h: 1,
    weight: 2,
    buoy: 45,
    tough: 1,
    chaos: 0.3,
    chaosMsg: "💥 POP! Die Luftmatratze ist GEPLATZT!",
    flavor: "Sehr rosa. Eventuell undicht.",
  },
  {
    id: "ente",
    icon: "🦆",
    name: "Gummiente XXL",
    w: 2,
    h: 2,
    weight: 6,
    buoy: 70,
    tough: 1,
    chaos: 0.15,
    chaosMsg: "🦆 Die Ente ist GEPLATZT! RIP Quietschie.",
    flavor: "Quietscht bedrohlich. Platzt bei Blickkontakt.",
  },
  {
    id: "wanne",
    icon: "🛁",
    name: "Alte Badewanne",
    w: 3,
    h: 2,
    weight: 45,
    buoy: 120,
    tough: 5,
    chaos: 0.25,
    chaosMsg: "🕳️ Die Badewanne hat ein LOCH!",
    flavor: "Vintage. Gusseisen. Stöpsel fehlt.",
  },
  {
    id: "hype",
    icon: "🚂",
    name: "Hype Train",
    w: 4,
    h: 2,
    weight: 15,
    buoy: 150,
    tough: 4,
    chaos: 0.2,
    chaosMsg: "🚂 Der Hype Train verliert Luft! Choo… choo…",
    flavor: "Level-5-Auftrieb. Industrie-Gummi. Tankt Felsen.",
  },
  {
    id: "stuhl",
    icon: "🪑",
    name: "Gaming-Stuhl",
    w: 1,
    h: 2,
    weight: 30,
    buoy: 2,
    tough: 3,
    comfort: 2,
    flavor: "Null Auftrieb, aber ERGONOMIE.",
  },
  {
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
  },
  {
    id: "anker",
    icon: "⚓",
    name: "Anker",
    w: 1,
    h: 1,
    weight: 70,
    buoy: 0,
    tough: 5,
    flavor: "Wofür?? War im Angebot.",
  },
  {
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
  },
  {
    id: "strudel",
    icon: "🥧",
    name: "Apfelstrudel",
    w: 2,
    h: 1,
    weight: 5,
    buoy: 10,
    tough: 1,
    comfort: 1,
    max: 3,
    chaos: 0.5,
    chaosMsg: "😋 Brudi hat den Apfelstrudel GEGESSEN. Es war es wert.",
    brokenIcon: "😋",
    flavor: "Tragendes Bauteil UND Proviant. Mehr als 3 passen nicht in die Kühlbox.",
  },
];

const TINT = {
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

const $ = (id: string) => document.getElementById(id) as HTMLElement;

const FACE = new Image();
FACE.src = FACE_URL;
FACE.addEventListener("load", () => drawGrid());

// Alle Grafiken werden von Hand auf den Canvas gezeichnet — keine externen Sprites.

/* ============================================================
   BAUPHASE — Werkbank
   ============================================================ */

let placed: PlacedPart[] = [];
let selectedDef: PartDef | null = null;
let eraseMode = false;
let hover: { col: number; row: number } | null = null;

function cellsOf(p) {
  const out = [];
  for (let c = p.col; c < p.col + p.def.w; c++)
    for (let r = p.row; r < p.row + p.def.h; r++) out.push([c, r]);
  return out;
}

function partAt(col, row) {
  return placed.find(
    (p) => col >= p.col && col < p.col + p.def.w && row >= p.row && row < p.row + p.def.h,
  );
}

function touchesStructure(def, col, row) {
  if (placed.length === 0) return true;
  for (let c = col; c < col + def.w; c++)
    for (let r = row; r < row + def.h; r++)
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        if (partAt(c + dc, r + dr)) return true;
  return false;
}

function atMaxCount(def: PartDef): boolean {
  return !!def.max && placed.filter((p) => p.def === def).length >= def.max;
}

function canPlace(def: PartDef, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col + def.w > COLS || row + def.h > ROWS) return false;
  if (atMaxCount(def)) return false;
  for (let c = col; c < col + def.w; c++)
    for (let r = row; r < row + def.h; r++) if (partAt(c, r)) return false;
  return touchesStructure(def, col, row);
}

function anchorFor(def, col, row) {
  return [col - Math.floor(def.w / 2), row - Math.floor(def.h / 2)];
}

// Je mehr verbaut ist, desto interessanter wird das Floß für Raketen.
function topfiCountOf(parts: { def: PartDef }[]): number {
  return parts.filter((p) => p.def.id === "topfi").length;
}

// Monokulturen sind verdächtig: mehr als 5 gleiche Teile (Topfi: mehr als 2)
// treiben das Risiko hoch. Nudel-Farmen und Matratzen-Teppiche inklusive.
function spamPenalty(parts: { def: PartDef }[]): number {
  const counts: Record<string, number> = {};
  for (const p of parts) counts[p.def.id] = (counts[p.def.id] || 0) + 1;
  let pen = 0;
  for (const [id, n] of Object.entries(counts)) {
    const over = n - (id === "topfi" ? 2 : 5);
    if (over > 0) pen += over * (id === "topfi" ? 0.09 : 0.05);
  }
  return pen;
}

// Das am dreistesten gespammte Teil (für die Satelliten-Warnung).
function worstSpam(parts: { def: PartDef }[]): { def: PartDef; over: number } | null {
  const counts = new Map<PartDef, number>();
  for (const p of parts) counts.set(p.def, (counts.get(p.def) || 0) + 1);
  let worst: { def: PartDef; over: number } | null = null;
  for (const [def, n] of counts) {
    const over = n - (def.id === "topfi" ? 2 : 5);
    if (over > 0 && (!worst || over > worst.over)) worst = { def, over };
  }
  return worst;
}

function rocketRisk(parts: { def: PartDef }[]): number {
  const cells = parts.reduce((s, p) => s + p.def.w * p.def.h, 0);
  const base = Math.min(0.35, cells * 0.008);
  return Math.min(0.95, base + spamPenalty(parts));
}

function buildTotals() {
  const weight = BRUDI_WEIGHT + placed.reduce((s, p) => s + p.def.weight, 0);
  const buoy = placed.reduce((s, p) => s + p.def.buoy, 0);
  const comfort = placed.reduce((s, p) => s + (p.def.comfort || 0), 0);
  return { weight, buoy, comfort, margin: buoy - weight };
}

// Wo stellt sich Brudi hin? Oberste Zelle der Spalte, die dem Massezentrum am nächsten ist.
function standCell(parts) {
  if (!parts.length) return null;
  let mx = 0,
    mw = 0;
  for (const p of parts) {
    mx += (p.col + p.def.w / 2) * p.def.weight + (p.col + p.def.w / 2);
    mw += p.def.weight + 1;
  }
  const target = mx / mw;
  const cols = new Map(); // col -> min row
  for (const p of parts)
    for (const [c, r] of cellsOf(p)) cols.set(c, Math.min(cols.get(c) ?? 99, r));
  let best = null;
  for (const [c, r] of cols)
    if (!best || Math.abs(c + 0.5 - target) < Math.abs(best[0] + 0.5 - target)) best = [c, r];
  return best; // [col, topRow]
}

/* ---------- Zeichnen (Werkbank + geteilte Part-Renderer) ---------- */

type Ctx2D = CanvasRenderingContext2D;

function rr(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

// Jedes Bauteil wird von Hand ins Rechteck (x,y,w,h) gezeichnet.
const PART_PAINTERS: Record<string, (ctx: Ctx2D, x: number, y: number, w: number, h: number) => void> = {
  brett(ctx, x, y, w, h) {
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
  },

  fass(ctx, x, y, w, h) {
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
  },

  kasten(ctx, x, y, w, h) {
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
  },

  nudel(ctx, x, y, w, h) {
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
  },

  matratze(ctx, x, y, w, h) {
    // Matratzen-Körper
    rr(ctx, x + w * 0.03, y + h * 0.42, w * 0.68, h * 0.4, h * 0.2, "#ff7fb0", "#c2517f");
    ctx.strokeStyle = "#c2517f";
    ctx.beginPath();
    for (const fx of [0.2, 0.37, 0.54]) {
      ctx.moveTo(x + w * fx, y + h * 0.45);
      ctx.lineTo(x + w * fx, y + h * 0.79);
    }
    ctx.stroke();
    // Flamingo-Hals + Kopf
    ctx.strokeStyle = "#ff7fb0";
    ctx.lineWidth = h * 0.14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.72, y + h * 0.6);
    ctx.quadraticCurveTo(x + w * 0.92, y + h * 0.55, x + w * 0.88, y + h * 0.28);
    ctx.stroke();
    ctx.fillStyle = "#ff7fb0";
    ctx.beginPath();
    ctx.arc(x + w * 0.88, y + h * 0.22, h * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // Schnabel
    ctx.fillStyle = "#2b2b34";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.94, y + h * 0.2);
    ctx.lineTo(x + w * 1.0 - 2, y + h * 0.28);
    ctx.lineTo(x + w * 0.93, y + h * 0.3);
    ctx.closePath();
    ctx.fill();
    // Auge
    ctx.beginPath();
    ctx.arc(x + w * 0.885, y + h * 0.2, h * 0.025, 0, Math.PI * 2);
    ctx.fill();
  },

  ente(ctx, x, y, w, h) {
    // Körper
    ctx.fillStyle = "#ffd23e";
    ctx.strokeStyle = "#c79a1a";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.45, y + h * 0.64, w * 0.38, h * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Schwanz-Zipfel
    ctx.beginPath();
    ctx.moveTo(x + w * 0.12, y + h * 0.52);
    ctx.quadraticCurveTo(x + w * 0.02, y + h * 0.36, x + w * 0.16, y + h * 0.4);
    ctx.closePath();
    ctx.fillStyle = "#ffd23e";
    ctx.fill();
    // Kopf
    ctx.beginPath();
    ctx.arc(x + w * 0.68, y + h * 0.3, h * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Schnabel
    ctx.fillStyle = "#f5871f";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.87, y + h * 0.33, w * 0.1, h * 0.06, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Auge
    ctx.fillStyle = "#2b2b34";
    ctx.beginPath();
    ctx.arc(x + w * 0.71, y + h * 0.25, h * 0.035, 0, Math.PI * 2);
    ctx.fill();
    // Flügel
    ctx.strokeStyle = "#c79a1a";
    ctx.beginPath();
    ctx.arc(x + w * 0.42, y + h * 0.62, w * 0.14, Math.PI * 0.2, Math.PI * 1.1);
    ctx.stroke();
  },

  wanne(ctx, x, y, w, h) {
    rr(ctx, x + w * 0.04, y + h * 0.3, w * 0.92, h * 0.44, h * 0.2, "#eef2f5", "#93a1ac");
    // Innenkante
    ctx.strokeStyle = "#b7c2cb";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.08, y + h * 0.38);
    ctx.lineTo(x + w * 0.92, y + h * 0.38);
    ctx.stroke();
    // Füße
    ctx.fillStyle = "#93a1ac";
    for (const fx of [0.2, 0.8]) {
      ctx.beginPath();
      ctx.arc(x + w * fx, y + h * 0.8, h * 0.07, 0, Math.PI);
      ctx.fill();
    }
    // Wasserhahn
    ctx.strokeStyle = "#7d8a94";
    ctx.lineWidth = h * 0.06;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.12, y + h * 0.28);
    ctx.lineTo(x + w * 0.12, y + h * 0.14);
    ctx.lineTo(x + w * 0.2, y + h * 0.14);
    ctx.lineTo(x + w * 0.2, y + h * 0.2);
    ctx.stroke();
    // Tropfen
    ctx.fillStyle = "#5dade2";
    ctx.beginPath();
    ctx.arc(x + w * 0.2, y + h * 0.26, h * 0.03, 0, Math.PI * 2);
    ctx.fill();
  },

  hype(ctx, x, y, w, h) {
    // Kessel
    rr(ctx, x + w * 0.04, y + h * 0.34, w * 0.56, h * 0.36, h * 0.14, "#9146ff", "#5d2ba8");
    // Führerhaus
    rr(ctx, x + w * 0.6, y + h * 0.16, w * 0.32, h * 0.54, h * 0.08, "#7a35d6", "#5d2ba8");
    rr(ctx, x + w * 0.65, y + h * 0.22, w * 0.22, h * 0.2, h * 0.05, "#cfe8ff", "#5d2ba8");
    // Schornstein + Dampf
    rr(ctx, x + w * 0.12, y + h * 0.12, w * 0.09, h * 0.24, w * 0.02, "#5d2ba8");
    ctx.fillStyle = "rgba(230,230,240,0.8)";
    ctx.beginPath();
    ctx.arc(x + w * 0.19, y + h * 0.08, h * 0.06, 0, Math.PI * 2);
    ctx.arc(x + w * 0.25, y + h * 0.05, h * 0.045, 0, Math.PI * 2);
    ctx.fill();
    // Frontlicht
    ctx.fillStyle = "#ffe17a";
    ctx.beginPath();
    ctx.arc(x + w * 0.05, y + h * 0.5, h * 0.06, 0, Math.PI * 2);
    ctx.fill();
    // Räder
    for (const fx of [0.16, 0.42, 0.72]) {
      ctx.fillStyle = "#2b2b34";
      ctx.beginPath();
      ctx.arc(x + w * fx, y + h * 0.78, h * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6b6b7a";
      ctx.beginPath();
      ctx.arc(x + w * fx, y + h * 0.78, h * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  stuhl(ctx, x, y, w, h) {
    // Rückenlehne
    rr(ctx, x + w * 0.16, y + h * 0.06, w * 0.3, h * 0.5, w * 0.1, "#2b2b34", "#141419");
    rr(ctx, x + w * 0.24, y + h * 0.1, w * 0.14, h * 0.4, w * 0.06, "#c0392b");
    // Sitzfläche
    rr(ctx, x + w * 0.14, y + h * 0.54, w * 0.62, h * 0.12, w * 0.05, "#2b2b34", "#141419");
    // Gasfeder + Fußkreuz
    ctx.strokeStyle = "#6b6b7a";
    ctx.lineWidth = w * 0.08;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.45, y + h * 0.66);
    ctx.lineTo(x + w * 0.45, y + h * 0.82);
    ctx.stroke();
    ctx.lineWidth = w * 0.06;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.18, y + h * 0.92);
    ctx.lineTo(x + w * 0.45, y + h * 0.82);
    ctx.lineTo(x + w * 0.72, y + h * 0.92);
    ctx.stroke();
    // Rollen
    ctx.fillStyle = "#141419";
    for (const fx of [0.18, 0.72]) {
      ctx.beginPath();
      ctx.arc(x + w * fx, y + h * 0.94, w * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  mikro(ctx, x, y, w, h) {
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
  },

  anker(ctx, x, y, w, h) {
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
  },

  topfi(ctx, x, y, w, h) {
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
      ctx.arc(x + w * (0.5 + side * 0.36), y + h * 0.5, w * 0.08, Math.PI * 0.5, Math.PI * 1.5, side > 0);
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
  },

  strudel(ctx, x, y, w, h) {
    // Teigrolle
    rr(ctx, x + w * 0.06, y + h * 0.34, w * 0.88, h * 0.44, h * 0.2, "#d9a441", "#a3742a");
    // Querkerben mit Füllung
    for (const fx of [0.26, 0.46, 0.66]) {
      ctx.strokeStyle = "#a3742a";
      ctx.beginPath();
      ctx.moveTo(x + w * fx, y + h * 0.36);
      ctx.quadraticCurveTo(x + w * (fx + 0.04), y + h * 0.56, x + w * fx, y + h * 0.76);
      ctx.stroke();
      ctx.fillStyle = "#8f5b23";
      ctx.beginPath();
      ctx.arc(x + w * (fx + 0.05), y + h * 0.56, h * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
    // Puderzucker
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const [px, py] of [
      [0.2, 0.4],
      [0.4, 0.38],
      [0.58, 0.42],
      [0.78, 0.4],
      [0.32, 0.46],
      [0.68, 0.46],
    ]) {
      ctx.beginPath();
      ctx.arc(x + w * px, y + h * py, h * 0.025, 0, Math.PI * 2);
      ctx.fill();
    }
    // Dampf
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = h * 0.04;
    for (const fx of [0.35, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(x + w * fx, y + h * 0.28);
      ctx.quadraticCurveTo(x + w * (fx - 0.04), y + h * 0.18, x + w * fx, y + h * 0.08);
      ctx.stroke();
    }
  },
};

function drawPartRect(ctx: Ctx2D, def: PartDef, x: number, y: number, cs: number, broken?: boolean) {
  const w = def.w * cs,
    h = def.h * cs;
  ctx.save();
  if (broken) ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1.5, cs * 0.05);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const painter = PART_PAINTERS[def.id];
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

function drawGrid() {
  const c = $("grid") as HTMLCanvasElement;
  if (!c) return;
  const W = COLS * CELL,
    H = ROWS * CELL;
  const dpr = devicePixelRatio || 1;
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.width = W + "px";
  c.style.height = H + "px";
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = "#12122400";
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#141428";
  ctx.fillRect(0, 0, W, H);

  // Wasserlinien-Hinweis (untere Zone liegt tiefer im Wasser)
  const wlY = (ROWS - 3) * CELL;
  const grad = ctx.createLinearGradient(0, wlY, 0, H);
  grad.addColorStop(0, "rgba(0,140,255,0.06)");
  grad.addColorStop(1, "rgba(0,140,255,0.16)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, wlY, W, H - wlY);
  ctx.strokeStyle = "rgba(0,180,255,0.35)";
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, wlY);
  ctx.lineTo(W, wlY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(120,200,255,0.5)";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("≈ Wasserlinie (grobe Schätzung, ehrlich)", W - 8, wlY - 4);

  // Raster
  ctx.strokeStyle = "#23233c";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, H);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(W, y * CELL + 0.5);
    ctx.stroke();
  }

  // Teile
  for (const p of placed) drawPartRect(ctx, p.def, p.col * CELL, p.row * CELL, CELL, false);

  // Ghost-Vorschau
  if (hover && !eraseMode && selectedDef) {
    const [ac, ar] = anchorFor(selectedDef, hover.col, hover.row);
    const ok = canPlace(selectedDef, ac, ar);
    ctx.globalAlpha = 0.5;
    drawPartRect(ctx, selectedDef, ac * CELL, ar * CELL, CELL, false);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ok ? "#3dd68c" : "#ff5c5c";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(
      ac * CELL + 1,
      ar * CELL + 1,
      selectedDef.w * CELL - 2,
      selectedDef.h * CELL - 2,
    );
  }
  if (hover && eraseMode) {
    const p = partAt(hover.col, hover.row);
    if (p) {
      ctx.strokeStyle = "#ff5c5c";
      ctx.lineWidth = 3;
      ctx.strokeRect(p.col * CELL + 1, p.row * CELL + 1, p.def.w * CELL - 2, p.def.h * CELL - 2);
    }
  }
}

/* ---------- Palette + Stats ---------- */

function showInfo(def) {
  if (!def) {
    $("info-bar").innerHTML =
      "👆 Wähl oben ein Bauteil und klick es aufs Raster. Qualität der Knoten: fragwürdig.";
    return;
  }
  $("info-bar").innerHTML =
    `${def.icon} <b>${def.name}</b> (${def.w}×${def.h}) · 🎈 Auftrieb <b>${def.buoy}</b> · ⚖️ Gewicht <b>${def.weight}</b>` +
    ` · 🛡️ Festigkeit <b>${"★".repeat(def.tough)}${"☆".repeat(5 - def.tough)}</b>` +
    (def.comfort ? ` · 🛋️ Komfort <b>+${def.comfort}</b>` : "") +
    ` — <i>${def.flavor}</i>`;
}

function renderPalette() {
  const pal = $("palette");
  pal.innerHTML = "";
  for (const def of PARTS) {
    const tile = document.createElement("div");
    const maxed = atMaxCount(def);
    tile.className =
      "part-tile" + (selectedDef === def ? " selected" : "") + (maxed ? " maxed" : "");
    const tint = TINT[def.id] || "255,255,255";
    tile.style.background = `linear-gradient(160deg, rgba(${tint},0.26), rgba(${tint},0.07))`;
    tile.style.borderColor = `rgba(${tint},0.4)`;
    const badge = def.max
      ? `${placed.filter((p) => p.def === def).length}/${def.max}`
      : `${def.w}×${def.h}`;
    tile.innerHTML = `<span class="size">${badge}</span><canvas class="icon-canvas" width="60" height="40"></canvas><span class="name">${def.name}</span>`;
    const icv = tile.querySelector("canvas") as HTMLCanvasElement;
    const ictx = icv.getContext("2d") as CanvasRenderingContext2D;
    const ics = Math.min(60 / def.w, 40 / def.h);
    drawPartRect(ictx, def, (60 - def.w * ics) / 2, (40 - def.h * ics) / 2, ics);
    tile.addEventListener("click", () => {
      selectedDef = selectedDef === def ? null : def;
      eraseMode = false;
      updateEraseBtn();
      renderPalette();
      showInfo(selectedDef);
      drawGrid();
    });
    tile.addEventListener("mouseenter", () => showInfo(def));
    tile.addEventListener("mouseleave", () => showInfo(selectedDef));
    pal.appendChild(tile);
  }
}

function renderStats() {
  const t = buildTotals();
  $("stat-weight").textContent = t.weight + " kg";
  $("stat-buoy").textContent = t.buoy + " kg";
  $("stat-comfort").textContent = t.comfort ? "+" + t.comfort : "0";
  $("stat-rocket").textContent =
    topfiCountOf(placed) >= 10 ? "☢️ DEFCON 1" : Math.round(rocketRisk(placed) * 100) + " %";
}

function renderBuild() {
  renderPalette();
  renderStats();
  drawGrid();
}

function updateEraseBtn() {
  const btn = $("erase-btn");
  btn.textContent = eraseMode ? "🧨 Abreißen: AN" : "🧨 Abreißen: AUS";
  btn.classList.toggle("active", eraseMode);
}

function removePartAt(col, row) {
  const p = partAt(col, row);
  if (!p) return;
  placed.splice(placed.indexOf(p), 1);
  renderBuild();
}

function initBuilderInput() {
  const c = $("grid");
  const cellFromEvent = (e) => {
    const rect = c.getBoundingClientRect();
    return {
      col: Math.floor((e.clientX - rect.left) / CELL),
      row: Math.floor((e.clientY - rect.top) / CELL),
    };
  };
  c.addEventListener("mousemove", (e) => {
    hover = cellFromEvent(e);
    drawGrid();
  });
  c.addEventListener("mouseleave", () => {
    hover = null;
    drawGrid();
  });
  c.addEventListener("click", (e) => {
    const { col, row } = cellFromEvent(e);
    if (eraseMode) {
      removePartAt(col, row);
      return;
    }
    if (!selectedDef) return;
    const [ac, ar] = anchorFor(selectedDef, col, row);
    if (!canPlace(selectedDef, ac, ar)) return;
    placed.push({ def: selectedDef, col: ac, row: ar, broken: false });
    renderBuild();
  });
  c.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const { col, row } = cellFromEvent(e as MouseEvent);
    removePartAt(col, row);
  });

  $("erase-btn").addEventListener("click", () => {
    eraseMode = !eraseMode;
    if (eraseMode) selectedDef = null;
    updateEraseBtn();
    renderPalette();
    drawGrid();
  });
  $("clear-btn").addEventListener("click", () => {
    placed = [];
    renderBuild();
  });
}

/* ============================================================
   SCHWIMMTEST — Physik aus der gebauten Form
   ============================================================ */

const sim: any = {
  running: false,
  phase: "drop",
  t: 0,
  lastTs: 0,
  main: null,
  drifters: [],
  freeBrudi: null,
  swamp: 0,
  tilt: 0,
  dEq: 0,
  sinkDepth: 0,
  dropY: 0,
  chaosEvents: [],
  particles: [],
  comfort: 0,
  sinkAt: 0,
  bannerTimeout: null,
};

function showBanner(text, chaos, ms) {
  if (sim.ended) return;
  const b = $("banner");
  b.textContent = text;
  b.className = "banner" + (chaos ? " chaos" : "");
  clearTimeout(sim.bannerTimeout);
  if (ms) sim.bannerTimeout = setTimeout(() => b.classList.add("hidden"), ms);

  // …und in den Ereignis-Verlauf an der Seite
  const log = $("event-log");
  const ev = document.createElement("div");
  ev.className = "ev" + (chaos ? " chaos" : "");
  ev.innerHTML = `<span class="m">${Math.round(sim.dist || 0)} m</span>`;
  ev.appendChild(document.createTextNode(text));
  log.appendChild(ev);
  while (log.children.length > 9) log.removeChild(log.firstChild);
}

// Wie viele Zellkanten teilt ein Teil mit dem Rest? (1 = nur ein Knoten = wackelig)
function contactCount(part, parts) {
  let n = 0;
  for (const [c, r] of cellsOf(part))
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (
        parts.some(
          (p) =>
            p !== part &&
            c + dc >= p.col &&
            c + dc < p.col + p.def.w &&
            r + dr >= p.row &&
            r + dr < p.row + p.def.h,
        )
      )
        n++;
  return n;
}

// Zerlege die gebauten Teile in zusammenhängende Gruppen (Flood-Fill über Nachbarschaft).
function components(parts) {
  const groups = [];
  const seen = new Set();
  const adjacent = (a, b) => {
    for (const [c1, r1] of cellsOf(a))
      for (const [c2, r2] of cellsOf(b))
        if (Math.abs(c1 - c2) + Math.abs(r1 - r2) === 1) return true;
    return false;
  };
  for (const p of parts) {
    if (seen.has(p)) continue;
    const group = [p];
    seen.add(p);
    for (let i = 0; i < group.length; i++)
      for (const q of parts)
        if (!seen.has(q) && adjacent(group[i], q)) {
          seen.add(q);
          group.push(q);
        }
    groups.push(group);
  }
  return groups;
}

// Baut das Physik-Modell der Hauptstruktur.
function buildStructure(parts: PlacedPart[]): Structure {
  let minCol = 99,
    maxCol = -1,
    minRow = 99,
    maxRow = -1;
  for (const p of parts)
    for (const [c, r] of cellsOf(p)) {
      minCol = Math.min(minCol, c);
      maxCol = Math.max(maxCol, c);
      minRow = Math.min(minRow, r);
      maxRow = Math.max(maxRow, r);
    }
  const Wpx = (maxCol - minCol + 1) * CT;
  const Hpx = (maxRow - minRow + 1) * CT;

  const cells = [];
  for (const p of parts)
    for (const [c, r] of cellsOf(p))
      cells.push({
        part: p,
        x: (c - minCol + 0.5) * CT,
        hb: Hpx - (r - minRow + 1) * CT, // Höhe der Zell-Unterkante über Strukturboden
        cap: p.def.buoy / (p.def.w * p.def.h),
      });

  const sc = standCell(parts);
  const standX = (sc[0] - minCol + 0.5) * CT;
  const standY = (sc[1] - minRow) * CT; // localY (von oben) der Standfläche

  const weight = BRUDI_WEIGHT + parts.reduce((s, p) => s + p.def.weight, 0);
  let mx = BRUDI_WEIGHT * standX,
    my = BRUDI_WEIGHT * (standY - 30);
  for (const p of parts) {
    mx += p.def.weight * ((p.col - minCol + p.def.w / 2) * CT);
    my += p.def.weight * ((p.row - minRow + p.def.h / 2) * CT);
  }
  return {
    parts,
    minCol,
    minRow,
    Wpx,
    Hpx,
    cells,
    standX,
    standY,
    weight,
    cmx: mx / weight,
    cmy: my / weight,
  };
}

// Kollision mit einem Felsen: Teile fliegen ab, alles wackelt.
function rockCrash(rock, raftX, waterBase) {
  rock.hit = true;
  sim.rockHits++;
  sim.shake = Math.max(sim.shake, 1.3);
  sim.tilt += (Math.random() - 0.5) * 0.4;
  spawnSplash(raftX + 30, waterBase, 40, true);

  const st = sim.main;
  if (!st) return;
  // Die getroffenen Teile würfeln gegen ihre Festigkeit
  const candidates = st.parts.filter((p) => p.def.id !== "topfi");
  const n = Math.min(candidates.length, 1 + (Math.random() < 0.4 ? 1 : 0));
  const lost = [],
    tanked = [];
  for (let i = 0; i < n; i++) {
    const pick = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
    if (!pick || !sim.main || !sim.main.parts.includes(pick)) continue;
    if (Math.random() < (pick.def.tough || 1) / 6) {
      tanked.push(pick.def.name);
    } else {
      detachPart(pick, raftX, waterBase, true);
      lost.push(pick.def.name);
    }
  }
  let msg;
  if (lost.length) {
    msg = [
      `KLONK! 🪨 „${lost.join("“ und „")}“ ist AB!`,
      `VOLL GEGEN DEN FELSEN! 🪨 ${lost.join(" und ")}: weg.`,
    ][Math.floor(Math.random() * 2)];
  } else if (tanked.length) {
    msg = `KLONK! 🪨 ${tanked.join(" und ")} hat den Felsen einfach WEGGETANKT! 💪`;
  } else {
    msg = "KLONK! 🪨 Der Felsen stand da schon IMMER, Brudi.";
  }
  showBanner(msg, true, 2600);
}

// Die Rakete schlägt ein. Übertrieben? Ja. Absicht? Auch.
function rocketImpact(raftX, waterBase) {
  const r = sim.rocket;
  r.exploded = true;
  sim.rocketHit = true;
  sim.shake = 3;
  sim.explosion = { x: raftX, y: waterBase - 40, r: 12, life: 1 };
  spawnSplash(raftX, waterBase, 90, true);
  showBanner("💥 DIREKTER RAKETENEINSCHLAG. Klar. Warum auch nicht.", true, 3400);

  const st = sim.main;
  if (st) {
    // Auch hier hilft Festigkeit — gegen eine Rakete allerdings nur bedingt.
    // Topfi ist unzerstörbar, aber sein KNOTEN nicht: Er kann abgerissen werden.
    const doomed = st.parts.filter((p) => Math.random() < 1 - (p.def.tough || 1) * 0.07);
    const potsGone = doomed.filter((p) => p.def.id === "topfi").length;
    for (const p of doomed) {
      if (sim.main && sim.main.parts.includes(p)) detachPart(p, raftX, waterBase, true);
    }
    if (potsGone) {
      setTimeout(
        () => showBanner("Die Topfis überleben natürlich – schwimmen jetzt nur woanders. 🍲👋", false, 2600),
        2200,
      );
    }
  }
  sim.tilt += (Math.random() < 0.5 ? -1 : 1) * 0.3;
}

// Die Bombe. Verdampft alles — außer Topfi. Topfi ist ewig.
function nukeDetonate(raftX: number, waterBase: number) {
  const nk = sim.nuke;
  nk.detonated = true;
  sim.nukeHit = true;
  sim.shake = 5;
  sim.nukeFlash = 1.8;
  sim.explosion = { x: raftX, y: waterBase - 70, r: 40, life: 2.4 };
  spawnSplash(raftX, waterBase, 150, true);
  showBanner("☢️ ATOMPILZ. ÜBER EINEM FLOẞ.", true, 3200);

  const st = sim.main;
  if (st) {
    for (const p of st.parts) {
      if (p.def.id === "topfi") {
        // Topfi übersteht auch das. Selbstverständlich.
        sim.drifters.push({
          def: p.def,
          dx: (p.col - st.minCol + 0.5) * CT - st.cmx,
          vx: (Math.random() - 0.5) * 80,
          wob: Math.random() * 10,
        });
      } else {
        sim.brokeOff.push(p.def.name);
      }
    }
    sim.main = null;
  }
  sim.phase = "soloswim";
  sim.sinkAt = sim.t;
  sim.freeBrudi = { x: raftX, y: waterBase - 50, vx: 0, vy: 0, inWater: false, since: -1.2 };
  setTimeout(() => showBanner("🍲 Die Topfis haben überlebt. Alle.", false, 2600), 2400);
}

// Die Staatsgewalt trifft. Festigkeit hilft — Beamte zielen aber gut.
function policeHit(raftX: number, waterBase: number) {
  const po = sim.police;
  po.done = true;
  sim.policeHit = true;
  sim.shake = 2.5;
  sim.explosion = { x: raftX, y: waterBase - 30, r: 10, life: 1 };
  spawnSplash(raftX, waterBase, 70, true);
  showBanner("🚔💥 SIE HABEN WIRKLICH GESCHOSSEN!", true, 3200);
  const st = sim.main;
  if (st) {
    // Auch Topfi-Knoten halten einer Bordkanone nicht stand (der Topf selbst schon).
    const doomed = st.parts.filter((p: PlacedPart) => Math.random() < 1 - p.def.tough * 0.09);
    const potsGone = doomed.filter((p) => p.def.id === "topfi").length;
    for (const p of doomed) {
      if (sim.main && sim.main.parts.includes(p)) detachPart(p, raftX, waterBase, true);
    }
    if (potsGone) {
      setTimeout(
        () => showBanner("Die Topfis? Unversehrt. Nur… weg. 🍲👋", false, 2400),
        2200,
      );
    }
  }
  sim.tilt += (Math.random() < 0.5 ? -1 : 1) * 0.25;
}

// Ein Teil löst sich vom Floß: wird zu Treibgut, Struktur wird neu berechnet.
function detachPart(part: PlacedPart, raftX: number, waterBase: number, silent?: boolean) {
  const st = sim.main;
  if (!st || !st.parts.includes(part)) return;

  const sc = standCell(st.parts);
  const stoodOnIt =
    sc &&
    sc[0] >= part.col &&
    sc[0] < part.col + part.def.w &&
    sc[1] >= part.row &&
    sc[1] < part.row + part.def.h;

  const toDrifter = (p) =>
    sim.drifters.push({
      def: p.def,
      dx: (p.col - st.minCol + p.def.w / 2) * CT - st.cmx,
      vx: ((p.col - st.minCol + p.def.w / 2) * CT < st.cmx ? -1 : 1) * (30 + Math.random() * 35),
      wob: Math.random() * 10,
    });

  toDrifter(part);
  sim.brokeOff.push(part.def.name);
  for (const ce of sim.chaosEvents) if (ce.part === part) ce.done = true;
  spawnSplash(raftX + (part.col - st.minCol + part.def.w / 2) * CT - st.cmx, waterBase, 25, true);

  if (!silent) {
    const msgs = [
      `„${part.def.name}“ hat sich VERABSCHIEDET! 🪢`,
      `${part.def.name} war offenbar nur DEKO-verknotet! 🫠`,
      `Und tschüss, ${part.def.name}! Einfach weggeschwommen!`,
    ];
    showBanner(msgs[Math.floor(Math.random() * msgs.length)], true, 2800);
  }

  const remaining = st.parts.filter((p) => p !== part);
  if (!remaining.length) {
    sim.main = null;
    sim.phase = "soloswim";
    sim.sinkAt = sim.t;
    sim.freeBrudi = { x: raftX, y: waterBase - 50, vx: 0, vy: 0, inWater: false, since: 0 };
    setTimeout(() => showBanner("Das Floß hat sich KOMPLETT ZERLEGT! 🧨", true, 3000), 1400);
    return;
  }

  // Hängt der Rest noch zusammen? Kleinere Bruchstücke treiben ebenfalls davon.
  const groups = components(remaining).sort(
    (a, b) =>
      b.reduce((s, p) => s + p.def.w * p.def.h, 0) - a.reduce((s, p) => s + p.def.w * p.def.h, 0),
  );
  for (const p of groups.slice(1).flat()) {
    toDrifter(p);
    sim.brokeOff.push(p.def.name);
  }
  if (groups.length > 1)
    setTimeout(() => showBanner("…und der Rest gleich MIT! 🧨", true, 2400), 1000);

  if (stoodOnIt)
    setTimeout(() => showBanner("Brudis STANDFLÄCHE! Umsteigen, SCHNELL! 😱", true, 2400), 500);

  const brokenSet = new Set(st.parts.filter((p) => p.broken));
  sim.main = buildStructure(groups[0]);
  for (const p of sim.main.parts) if (brokenSet.has(p)) p.broken = true;
}

function capAt(st, d) {
  let cap = 0,
    cbx = 0;
  for (const c of st.cells) {
    const eff = c.part.broken ? c.cap * 0.08 : c.cap;
    const frac = Math.max(0, Math.min(1, (d - c.hb) / CT));
    cap += eff * frac;
    cbx += eff * frac * c.x;
  }
  return { cap, cbx: cap > 0 ? cbx / cap : st.Wpx / 2 };
}

// Eintauchtiefe im Gleichgewicht (oder null, wenn's nicht reicht).
function solveDepth(st) {
  const { cap } = capAt(st, st.Hpx + 0.1);
  if (cap < st.weight) return null;
  let lo = 0,
    hi = st.Hpx;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (capAt(st, mid).cap < st.weight) lo = mid;
    else hi = mid;
  }
  return hi;
}

function startTest() {
  const groups = components(placed);
  groups.sort(
    (a, b) =>
      b.reduce((s, p) => s + p.def.w * p.def.h, 0) - a.reduce((s, p) => s + p.def.w * p.def.h, 0),
  );
  const mainParts = groups[0] ? groups[0].map((p) => ({ ...p, broken: false })) : [];
  const drifterGroups = groups.slice(1);

  const main = mainParts.length ? buildStructure(mainParts) : null;

  // Abgetrennte Teile treiben davon
  const mainCenterCol = main ? main.minCol + main.Wpx / CT / 2 : COLS / 2;
  const drifters = drifterGroups.flat().map((p) => ({
    def: p.def,
    dx: (p.col + p.def.w / 2 - mainCenterCol) * CT,
    vx: (p.col + p.def.w / 2 < mainCenterCol ? -1 : 1) * (25 + Math.random() * 30),
    wob: Math.random() * 10,
  }));

  Object.assign(sim, {
    running: true,
    ended: false,
    phase: "drop",
    t: 0,
    lastTs: 0,
    main,
    drifters,
    freeBrudi: null,
    swamp: 0,
    tilt: 0,
    dEq: 0,
    sinkDepth: 0,
    dropY: -340,
    particles: [],
    sinkAt: 0,
    comfort: mainParts.reduce((s, p) => s + (p.def.comfort || 0), 0),
    dist: 0,
    speed: BASE_SPEED,
    shake: 0,
    explosion: null,
    rockHits: 0,
    rocketHit: false,
  });

  // ---- Der Flusslauf: Stromschnellen, Felsen, ggf. eine Rakete. Normal. ----
  sim.zones = [];
  let zm = 100 + Math.random() * 50;
  while (zm < GOAL_M - 120) {
    sim.zones.push({ s: zm, e: zm + 55 + Math.random() * 45, announced: false });
    zm += 180 + Math.random() * 90;
  }
  sim.rocks = [];
  let rm = 70 + Math.random() * 40;
  while (rm < GOAL_M - 60) {
    sim.rocks.push({
      m: rm,
      size: 24 + Math.random() * 22,
      inLine: Math.random() < 0.55,
      hit: false,
      nearMissed: false,
    });
    rm += 55 + Math.random() * 60;
  }
  // Erst ab einer EXTREMEN Topfi-Sammlung (10+) wird nicht mehr verhandelt.
  const tc = topfiCountOf(mainParts);
  sim.nuke =
    tc >= 10
      ? {
          atM: 200 + Math.random() * 220,
          warned: false,
          bomber: 0,
          bomberSeen: false,
          dropped: false,
          bombProg: 0,
          detonated: false,
        }
      : null;
  sim.nukeHit = false;
  sim.nukeTopfis = tc;
  sim.nukeFlash = 0;

  // Große Flöße ziehen militärische Aufmerksamkeit auf sich. Ist so.
  sim.rocket =
    !sim.nuke && Math.random() < rocketRisk(mainParts)
      ? {
          atM: 180 + Math.random() * (GOAL_M - 300),
          warned: false,
          fired: false,
          prog: 0,
          exploded: false,
        }
      : null;

  // Die Wasserschutzpolizei patrouilliert hier. Manchmal. Mit Bordkanone.
  // Auffällige Monokulturen mag sie gar nicht. (Bei DEFCON 1 hält sie sich raus.)
  const policeChance = Math.min(0.9, 0.12 + spamPenalty(mainParts) * 0.8);
  sim.police =
    !sim.nuke && Math.random() < policeChance
      ? {
          atM: 140 + Math.random() * (GOAL_M - 320),
          announced: false,
          approach: 0,
          hailed: false,
          holdT: 0,
          shot: false,
          shotProg: 0,
          done: false,
        }
      : null;
  sim.policeHit = false;

  sim.chaosEvents = (main ? main.parts : [])
    .filter((p) => p.def.chaos && Math.random() < p.def.chaos)
    .map((p) => ({ part: p, at: 6 + Math.random() * 26, done: false }));

  // Schlampig verknotete Teile (wenig Kontaktfläche) verabschieden sich — Qualität halt.
  sim.breakEvents = [];
  sim.brokeOff = [];
  if (main && main.parts.length > 1) {
    const sc = standCell(main.parts);
    for (const p of main.parts) {
      if (p.def.id === "topfi") continue; // Topfi verlässt Brudi nie.
      const contacts = contactCount(p, main.parts);
      let prob = contacts <= 1 ? 0.9 : contacts === 2 ? 0.55 : 0.25;
      // Das Teil, auf dem Brudi rumtrampelt, leidet zusätzlich
      if (
        sc &&
        sc[0] >= p.col &&
        sc[0] < p.col + p.def.w &&
        sc[1] >= p.row &&
        sc[1] < p.row + p.def.h
      )
        prob += 0.15;
      if (Math.random() < prob)
        sim.breakEvents.push({ part: p, at: 5 + Math.random() * 32, warned: false, done: false });
    }
  }

  sim.gull = Math.random() < 0.35 ? { at: 8 + Math.random() * 22, landed: false } : null;

  const QUOTES = [
    "Brudi: „Die Route hab ich auf Google Maps gecheckt.“",
    "Brudi: „Stromschnellen sind nur schnelles Wasser, Bro.“",
    "Brudi: „Das ist zu 100% safe, Chat.“",
    "Brudi: „Wer braucht schon ein Paddel.“",
    "Brudi: „Läuft doch su– was war das für ein Geräusch?“",
    "Brudi: „Ich spüre kaum Wasser in den Schuhen.“",
    "Brudi: „TÜV? Kenn ich nicht.“",
  ];
  const shuffled = QUOTES.sort(() => Math.random() - 0.5);
  sim.quotes = [6, 17, 30].map((base, i) => ({
    at: base + Math.random() * 5,
    text: shuffled[i],
    done: false,
  }));
  const spam = worstSpam(mainParts);
  if (spam && spam.over >= 2) {
    sim.quotes.push({
      at: 4,
      text: `⚠️ Satellit erfasst verdächtige ${spam.def.name}-Ansammlung… ${spam.def.icon}🛰️`,
      done: false,
    });
  }

  $("build-screen").classList.add("hidden");
  $("end-screen").classList.add("hidden");
  $("test-screen").classList.remove("hidden");
  $("event-log").innerHTML = "";
  showBanner("3… 2… 1… WASSERUNG! 🌊", false, 2600);
  if (drifters.length) {
    setTimeout(() => showBanner("Moment… da war was nicht festgebunden?! 🪢", true, 2800), 2800);
  }

  resizeCanvas();
  requestAnimationFrame(loop);
}

const canvas = () => $("sea") as HTMLCanvasElement;
function resizeCanvas() {
  const c = canvas();
  c.width = c.clientWidth * devicePixelRatio;
  c.height = c.clientHeight * devicePixelRatio;
}
window.addEventListener("resize", () => {
  if (sim.running) resizeCanvas();
});

function inRapids(m) {
  return sim.zones && sim.zones.some((z) => m >= z.s && m <= z.e);
}
function waveAmp() {
  if (sim.phase === "drop") return 5;
  const base = 6 + Math.min(1, sim.dist / GOAL_M) * 9;
  return base * (inRapids(sim.dist) ? 2.2 : 1);
}
function waveAt(x, time) {
  const a = waveAmp();
  const wx = x + (sim.dist || 0) * PXPM * 0.6; // Wellen ziehen mit der Strömung vorbei
  return (
    Math.sin(wx * 0.012 + time * 1.6) * a * 0.6 +
    Math.sin(wx * 0.027 - time * 2.3) * a * 0.3 +
    Math.sin(wx * 0.005 + time * 0.7) * a * 0.4
  );
}

function spawnSplash(x, y, n, big) {
  for (let i = 0; i < n; i++) {
    sim.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * (big ? 260 : 120),
      vy: -Math.random() * (big ? 320 : 160) - 40,
      life: 0.9 + Math.random() * 0.5,
      r: 2 + Math.random() * (big ? 5 : 3),
      type: "drop",
    });
  }
}
function spawnBubble(x, y) {
  sim.particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 20,
    vy: -30 - Math.random() * 40,
    life: 1.5,
    r: 2 + Math.random() * 4,
    type: "bubble",
  });
}

function loop(ts) {
  if (!sim.running) return;
  if (!sim.lastTs) sim.lastTs = ts;
  const dt = Math.min(0.05, (ts - sim.lastTs) / 1000);
  sim.lastTs = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  const c = canvas();
  const W = c.width / devicePixelRatio,
    H = c.height / devicePixelRatio;
  const waterBase = H * 0.62;
  const raftX = W * 0.44;
  let st = sim.main;

  if (sim.phase === "drop") {
    sim.dropY += dt * 500;
    if (sim.dropY >= 0) {
      sim.dropY = 0;
      spawnSplash(raftX, waterBase, 45, true);
      if (!st) {
        sim.phase = "soloswim";
        sim.freeBrudi = { x: raftX, y: waterBase - 60, vx: 0, vy: 80, inWater: false, since: 0 };
        showBanner("Kein Floß. Er ist einfach REINGELAUFEN. 🫠", true, 3000);
      } else if (solveDepth(st) === null) {
        sim.phase = "sinking";
        sim.sinkAt = 0;
        showBanner("Ähm. Das sinkt SOFORT. 🫠", true, 3000);
      } else {
        sim.phase = "float";
      }
    }
    return;
  }

  sim.t += dt;

  // Chaos-Events
  for (const ev of sim.chaosEvents) {
    if (!ev.done && sim.t >= ev.at && sim.phase === "float") {
      ev.done = true;
      ev.part.broken = true;
      showBanner(ev.part.def.chaosMsg, true, 3200);
      spawnSplash(raftX + (Math.random() - 0.5) * 100, waterBase, 25, true);
    }
  }

  // Bau-Qualität: schlecht verknotete Teile verabschieden sich
  for (const ev of sim.breakEvents) {
    if (ev.done || sim.phase !== "float") continue;
    if (!ev.warned && sim.t >= ev.at - 1.3) {
      ev.warned = true;
      showBanner("*KNARZ* … das klingt nicht gut. 😬", true, 1200);
    }
    if (sim.t >= ev.at) {
      ev.done = true;
      detachPart(ev.part, raftX, waterBase);
    }
  }

  // Möwe. Einfach so.
  if (sim.gull && !sim.gull.landed && sim.phase === "float" && sim.t >= sim.gull.at) {
    sim.gull.landed = true;
    if (sim.main) sim.main.weight += 2;
    showBanner("Eine Möwe ist gelandet. +2 kg. Warum auch nicht. 🕊️", false, 2600);
  }

  // Brudi-Kommentare
  for (const q of sim.quotes) {
    if (!q.done && sim.phase === "float" && sim.t >= q.at) {
      q.done = true;
      showBanner(q.text, false, 2300);
    }
  }

  if (sim.phase === "float") {
    // Fahrt flussabwärts
    sim.speed = BASE_SPEED * (inRapids(sim.dist) ? 1.7 : 1);
    sim.dist += sim.speed * dt;

    for (const z of sim.zones) {
      if (!z.announced && sim.dist >= z.s - 15) {
        z.announced = true;
        showBanner("STROMSCHNELLEN! 🌊 FESTHALTEN!", true, 2000);
      }
    }

    // Felsen: manche stehen genau in der Fahrrinne
    const halfW = st.Wpx / 2;
    for (const rock of sim.rocks) {
      const rel = (rock.m - sim.dist) * PXPM;
      if (!rock.hit && rock.inLine && Math.abs(rel) < halfW + rock.size * 0.4) {
        rockCrash(rock, raftX, waterBase);
        if (sim.phase !== "float") break;
      } else if (!rock.inLine && !rock.nearMissed && Math.abs(rel) < halfW + 30) {
        rock.nearMissed = true;
        if (Math.random() < 0.5) showBanner("Puh. Knapp. 🪨", false, 1100);
      }
    }
    if (sim.phase !== "float") return;

    // Die Rakete. Frag nicht.
    if (sim.rocket && !sim.rocket.exploded) {
      const r = sim.rocket;
      if (!r.warned && sim.dist > r.atM - 90) {
        r.warned = true;
        showBanner("⚠️ …pfeift da was?", true, 1800);
      }
      if (!r.fired && sim.dist > r.atM) {
        r.fired = true;
        showBanner("EINE RAKETE?! WARUM IST DA EINE RAKETE?! 🚀", true, 2400);
      }
      if (r.fired) {
        r.prog += dt / 3.5;
        if (r.prog >= 1) {
          rocketImpact(raftX, waterBase);
          if (sim.phase !== "float") return;
        }
      }
    }

    // DEFCON 1: Bomber fliegt ein, Bombe fällt, Physik endet.
    if (sim.nuke && !sim.nuke.detonated) {
      const nk = sim.nuke;
      if (!nk.warned && sim.dist > nk.atM - 100) {
        nk.warned = true;
        showBanner("🛰️ DEFCON 1. Topf-Ansammlung bestätigt.", true, 2400);
      }
      if (sim.dist > nk.atM) {
        nk.bomber = Math.min(1, nk.bomber + dt / 3);
        if (!nk.bomberSeen && nk.bomber > 0.05) {
          nk.bomberSeen = true;
          showBanner("✈️ Ein Bomber. Es ist ein BOMBER.", true, 2200);
        }
        if (!nk.dropped && nk.bomber >= 0.55) {
          nk.dropped = true;
          showBanner("💣 Bombe ausgeklinkt. War schön mit euch.", true, 2000);
        }
        if (nk.dropped) {
          nk.bombProg += dt / 2.2;
          if (nk.bombProg >= 1) {
            nukeDetonate(raftX, waterBase);
            if (sim.phase !== "float") return;
          }
        }
      }
    }

    // Wasserschutzpolizei: erst Blaulicht, dann Ansage, dann… Bordkanone.
    if (sim.police && !sim.police.done) {
      const po = sim.police;
      if (!po.announced && sim.dist > po.atM - 60) {
        po.announced = true;
        showBanner("🚨 Blaulicht hinter euch…", true, 1800);
      }
      if (sim.dist > po.atM) {
        po.approach = Math.min(1, po.approach + dt / 2.5);
        if (!po.hailed && po.approach >= 1) {
          po.hailed = true;
          showBanner("🚔 WASSERSCHUTZPOLIZEI! SOFORT ANHALTEN!", true, 2200);
          setTimeout(
            () => showBanner("Brudi: „NIEMALS! Das ist ein FLOẞ, kein Boot!“", false, 2000),
            2300,
          );
        }
        if (po.hailed) {
          po.holdT += dt;
          if (!po.shot && po.holdT > 5) {
            po.shot = true;
            showBanner("🚔 Sie laden die Bordkanone durch. Oh nein.", true, 1600);
          }
          if (po.shot) {
            po.shotProg += dt / 1.4;
            if (po.shotProg >= 1) {
              policeHit(raftX, waterBase);
              if (sim.phase !== "float") return;
            }
          }
        }
      }
    }

    st = sim.main; // Crashs können die Struktur umgebaut haben
    if (!st) return;

    const d = solveDepth(st);
    if (d === null) {
      sim.phase = "sinking";
      sim.sinkAt = sim.t;
      sim.dEq = st.Hpx;
      showBanner("Der Auftrieb ist WEG! 😱", true, 3000);
    } else {
      sim.dEq += (d - sim.dEq) * Math.min(1, dt * 3);

      // Neigung: Massezentrum vs. Auftriebszentrum + Wellen-Schaukeln
      const { cbx } = capAt(st, sim.dEq);
      const cmHeight = st.Hpx - st.cmy;
      const topHeavy = 1 + (cmHeight / Math.max(CT, st.Wpx)) * 1.4;
      const slope = (waveAt(raftX + 50, sim.t) - waveAt(raftX - 50, sim.t)) / 100;
      const target =
        Math.max(-0.9, Math.min(0.9, (st.cmx - cbx) * 0.0045 * topHeavy)) +
        slope * (0.8 + topHeavy * 0.4);
      sim.tilt += (target - sim.tilt) * Math.min(1, dt * 1.6);

      if (Math.abs(sim.tilt) > 0.5) {
        sim.phase = "capsize";
        sim.sinkAt = sim.t;
        showBanner("KENTERUNG! ⚠️ Physik 1 : 0 Brudi", true, 3200);
        const side = Math.sign(sim.tilt);
        sim.freeBrudi = {
          x: raftX + side * 40,
          y: waterBase - (st.Hpx - sim.dEq) - 70,
          vx: side * 110,
          vy: -60,
          inWater: false,
          since: 0,
        };
        spawnSplash(raftX + side * 60, waterBase, 30, true);
      }

      // Wellen schwappen über die Standfläche
      const freeboard = st.Hpx - sim.dEq - st.standY;
      const excess = waveAmp() - (freeboard * 0.65 + 8);
      if (excess > 0) {
        sim.swamp += dt * excess * 0.02;
        if (Math.random() < 0.15)
          spawnSplash(
            raftX + (Math.random() - 0.5) * st.Wpx,
            waterBase + waveAt(raftX, sim.t),
            3,
            false,
          );
      } else {
        sim.swamp = Math.max(0, sim.swamp - dt * 0.05);
      }
      if (sim.phase === "float" && sim.swamp >= 1) {
        sim.phase = "sinking";
        sim.sinkAt = sim.t;
        showBanner("Zu viel Wasser im Floß! 🌊😱", true, 3000);
      }

      if (sim.phase === "float" && sim.dist >= GOAL_M) {
        sim.phase = "won";
        showBanner("DER STEG! ANGEKOMMEN! 🏁 EIN WUNDER!", false, 4000);
        setTimeout(() => endTest(true), 3000);
      }
    }
  } else if (sim.phase === "sinking") {
    sim.sinkDepth += dt * 45;
    sim.tilt += dt * 0.15 * Math.sign(sim.tilt || 1);
    if (Math.random() < 0.5)
      spawnBubble(
        raftX + (Math.random() - 0.5) * (st ? st.Wpx : 80),
        waterBase + sim.sinkDepth * 0.5,
      );
    if (sim.sinkDepth > 240) {
      sim.phase = "sunk";
      setTimeout(() => endTest(false), 1600);
    }
  } else if (sim.phase === "capsize") {
    sim.tilt += dt * 2.2 * Math.sign(sim.tilt);
    sim.sinkDepth += dt * 35;
    if (Math.abs(sim.tilt) > 1.6) sim.tilt = 1.6 * Math.sign(sim.tilt);
  } else if (sim.phase === "soloswim") {
    // nichts – freeBrudi wird unten animiert
  }

  // Frei schwimmender Brudi (Kenterung / kein Floß)
  if (sim.freeBrudi) {
    const b = sim.freeBrudi;
    const surf = waterBase + waveAt(b.x, sim.t);
    if (!b.inWater) {
      b.vy += 550 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y >= surf - 14) {
        b.inWater = true;
        spawnSplash(b.x, surf, 35, true);
      }
    } else {
      b.since += dt;
      b.y += (surf + 4 - b.y) * Math.min(1, dt * 4);
      b.x += Math.sin(sim.t * 3) * 10 * dt;
      if (Math.random() < 0.3) spawnBubble(b.x + (Math.random() - 0.5) * 20, b.y + 20);
      if (b.since > 2.6 && sim.phase !== "sunk") {
        sim.phase = "sunk";
        setTimeout(() => endTest(false), 800);
      }
    }
  }

  // Treibende Einzelteile fallen hinter das fahrende Floß zurück
  for (const dr of sim.drifters) dr.dx += (dr.vx - sim.speed * PXPM * 0.5) * dt;

  // Screen-Shake, Blitz & Explosion abklingen lassen
  sim.shake = Math.max(0, sim.shake - dt * 2.2);
  sim.nukeFlash = Math.max(0, (sim.nukeFlash || 0) - dt * 0.9);
  if (sim.explosion) {
    sim.explosion.r += dt * 420;
    sim.explosion.life -= dt * 1.1;
    if (sim.explosion.life <= 0) sim.explosion = null;
  }

  // Partikel
  for (const p of sim.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === "drop") p.vy += 600 * dt;
  }
  sim.particles = sim.particles.filter((p) => p.life > 0);

  // HUD
  st = sim.main;
  const cap = st ? capAt(st, st.Hpx + 0.1).cap : 0;
  $("hud").innerHTML =
    `📍 Noch <b>${Math.max(0, GOAL_M - sim.dist).toFixed(0)} m</b> bis zum Steg${inRapids(sim.dist) ? " · 🌊 <b>STROMSCHNELLEN</b>" : ""}<br>` +
    `🎈 Auftrieb: <b>${Math.round(cap)}</b> / ⚖️ <b>${st ? st.weight : BRUDI_WEIGHT} kg</b><br>` +
    `↺ Neigung: <b>${Math.round(Math.abs(sim.tilt) * 57)}°</b> · 🌊 Wasser im Floß: <b>${Math.round(Math.min(1, sim.swamp) * 100)}%</b>`;
}

/* ---------- Zeichnen ---------- */

function draw() {
  const c = canvas(),
    ctx = c.getContext("2d");
  const W = c.width / devicePixelRatio,
    H = c.height / devicePixelRatio;
  const shx = (Math.random() - 0.5) * sim.shake * 16;
  const shy = (Math.random() - 0.5) * sim.shake * 16;
  ctx.setTransform(
    devicePixelRatio,
    0,
    0,
    devicePixelRatio,
    shx * devicePixelRatio,
    shy * devicePixelRatio,
  );

  const time = sim.t;
  const waterBase = H * 0.62;
  const raftX = W * 0.44;

  // Himmel
  const sky = ctx.createLinearGradient(0, 0, 0, waterBase);
  sky.addColorStop(0, "#2a6ac7");
  sky.addColorStop(1, "#a8d8f0");
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, W + 40, waterBase + 60);

  // Sonne, Wolken, Möwe
  ctx.fillStyle = "#ffe17a";
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.13, 34, 0, Math.PI * 2);
  ctx.fill();
  const cloudAt = (cx: number, cy: number, s: number) => {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(cx + s * 0.22, cy, s * 0.2, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.48, cy - s * 0.14, s * 0.26, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.74, cy - s * 0.02, s * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(220,230,240,0.9)";
    ctx.beginPath();
    ctx.ellipse(cx + s * 0.48, cy + s * 0.1, s * 0.44, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  cloudAt(((performance.now() / 120) % (W + 260)) - 130, H * 0.12, 110);
  cloudAt(((performance.now() / 180 + 300) % (W + 260)) - 130, H * 0.22, 85);
  cloudAt(((performance.now() / 150 + 600) % (W + 260)) - 130, H * 0.07, 65);
  ctx.font = "22px serif";
  ctx.fillText(
    "🕊️",
    ((performance.now() / 60) % (W + 100)) - 50,
    H * 0.3 + Math.sin(performance.now() / 400) * 12,
  );

  // Ufer: Hügel + Bäume ziehen vorbei (Parallaxe)
  const scroll = (sim.dist || 0) * PXPM;
  ctx.fillStyle = "#2e6b45";
  ctx.beginPath();
  ctx.moveTo(-20, waterBase + 10);
  for (let x = -20; x <= W + 20; x += 16) {
    ctx.lineTo(
      x,
      waterBase -
        42 +
        Math.sin((x + scroll * 0.35) * 0.008) * 16 +
        Math.sin((x + scroll * 0.35) * 0.02) * 6,
    );
  }
  ctx.lineTo(W + 20, waterBase + 10);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const treeGap = 110,
    treeOff = scroll * 0.35;
  for (let x = -(treeOff % treeGap) - treeGap; x < W + treeGap; x += treeGap) {
    const idx = Math.round((x + treeOff) / treeGap);
    const size = 30 + ((idx * 37) % 22);
    const tx = x + ((idx * 53) % 30);
    const ty = waterBase - 22 + ((idx * 29) % 10);
    const green = ["#2f7d4a", "#3c9159", "#27693e"][((idx % 3) + 3) % 3];
    // Stamm
    ctx.fillStyle = "#6e4a2a";
    ctx.fillRect(tx - size * 0.06, ty - size * 0.24, size * 0.12, size * 0.26);
    ctx.fillStyle = green;
    if (idx % 2 === 0) {
      // Tanne: drei gestaffelte Dreiecke
      for (let i = 0; i < 3; i++) {
        const ly = ty - size * (0.2 + i * 0.3);
        const lw = size * (0.5 - i * 0.11);
        ctx.beginPath();
        ctx.moveTo(tx - lw, ly);
        ctx.lineTo(tx + lw, ly);
        ctx.lineTo(tx, ly - size * 0.42);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Laubbaum: Kronen-Kreise
      ctx.beginPath();
      ctx.arc(tx, ty - size * 0.62, size * 0.34, 0, Math.PI * 2);
      ctx.arc(tx - size * 0.2, ty - size * 0.45, size * 0.24, 0, Math.PI * 2);
      ctx.arc(tx + size * 0.2, ty - size * 0.45, size * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Struktur + Brudi + Treibgut (vor dem Wasser gezeichnet → schimmert durch)
  drawStructure(ctx, raftX, waterBase, time);
  drawDrifters(ctx, raftX, waterBase, time);
  if (sim.freeBrudi) {
    ctx.save();
    ctx.translate(sim.freeBrudi.x, sim.freeBrudi.y);
    drawBrudi(ctx, 0, 20, time, true);
    ctx.restore();
  }

  // Wasser
  for (const [alpha, speed, off] of [
    [0.75, 1, 0],
    [0.45, 1.5, 30],
  ]) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      ctx.lineTo(x, waterBase + off * 0.3 + waveAt(x + off * 40, time * speed));
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, waterBase, 0, H);
    grad.addColorStop(0, `rgba(30, 120, 200, ${alpha})`);
    grad.addColorStop(1, `rgba(8, 40, 90, ${alpha})`);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Felsen ragen aus dem Wasser (fest verankert — Felsen wackeln nicht)
  for (const rock of sim.rocks || []) {
    const sx = raftX + (rock.m - sim.dist) * PXPM;
    if (sx < -120 || sx > W + 120) continue;
    const sy = waterBase + 8;
    ctx.fillStyle = rock.hit ? "#565b63" : "#6d737d";
    ctx.beginPath();
    ctx.moveTo(sx - rock.size, sy + 14);
    ctx.quadraticCurveTo(
      sx - rock.size * 0.6,
      sy - rock.size,
      sx + rock.size * 0.15,
      sy - rock.size * 0.95,
    );
    ctx.quadraticCurveTo(sx + rock.size * 0.8, sy - rock.size * 0.6, sx + rock.size, sy + 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#464b52";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 8, rock.size * 1.1, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Das Polizeiboot nähert sich von hinten
  if (sim.police && sim.police.announced) {
    const po = sim.police;
    const bx = -180 + (raftX - 250 + 180) * po.approach;
    const by = waterBase + waveAt(bx, time) * 0.6;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(Math.sin(time * 2.2) * 0.03);
    ctx.lineJoin = "round";

    // Bugwelle & Heckgischt
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.ellipse(70, 12, 14 + Math.sin(time * 8) * 3, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(-66, 12, 10 + Math.cos(time * 7) * 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rumpf: dunkelblau mit spitzem Bug
    ctx.fillStyle = "#243a5e";
    ctx.strokeStyle = "#16233a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-62, -8);
    ctx.lineTo(52, -8);
    ctx.quadraticCurveTo(72, -7, 78, 2);
    ctx.quadraticCurveTo(70, 14, 50, 15);
    ctx.lineTo(-50, 15);
    ctx.quadraticCurveTo(-64, 12, -62, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Weißer Zierstreifen mit Schriftzug
    ctx.fillStyle = "#e8edf5";
    ctx.beginPath();
    ctx.moveTo(-58, -6);
    ctx.lineTo(56, -6);
    ctx.quadraticCurveTo(66, -5, 70, 0);
    ctx.lineTo(-59, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#16233a";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("POLIZEI", -6, -3);

    // Kajüte mit schräger Scheibe
    ctx.fillStyle = "#dde4ec";
    ctx.strokeStyle = "#9aa7b5";
    ctx.beginPath();
    ctx.moveTo(-38, -8);
    ctx.lineTo(-38, -30);
    ctx.lineTo(6, -30);
    ctx.lineTo(18, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Fenster
    ctx.fillStyle = "#8fd0e8";
    ctx.beginPath();
    ctx.moveTo(-2, -26);
    ctx.lineTo(10, -10);
    ctx.lineTo(-2, -10);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-32, -26, 22, 12);
    // Antenne
    ctx.strokeStyle = "#16233a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-32, -30);
    ctx.lineTo(-36, -44);
    ctx.stroke();

    // Blaulichtbalken mit Glow
    const blue = Math.floor(performance.now() / 200) % 2 === 0;
    ctx.fillStyle = "#16233a";
    ctx.fillRect(-20, -36, 22, 5);
    ctx.fillStyle = blue ? "#2ea8ff" : "#ff4d4d";
    ctx.fillRect(blue ? -20 : -9, -36, 11, 5);
    const glow = ctx.createRadialGradient(-9, -34, 2, -9, -34, 26);
    glow.addColorStop(0, blue ? "rgba(46,168,255,0.5)" : "rgba(255,77,77,0.5)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(-9, -34, 26, 0, Math.PI * 2);
    ctx.fill();

    // Bordkanone auf Drehsockel
    ctx.fillStyle = "#16233a";
    ctx.beginPath();
    ctx.arc(34, -8, 6, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(34, -12);
    ctx.lineTo(54, -22);
    ctx.stroke();
    // Mündung
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(50, -20);
    ctx.lineTo(55, -22.5);
    ctx.stroke();
    ctx.restore();

    // Das Geschoss fliegt im Bogen aufs Floß
    if (po.shot && !po.done) {
      const p = Math.min(1, po.shotProg);
      const sx0 = bx + 46,
        sy0 = by - 18;
      const sx = sx0 + (raftX - sx0) * p;
      const sy = sy0 + (waterBase - 45 - sy0) * p - Math.sin(Math.PI * p) * 90;
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,180,60,0.6)";
      ctx.beginPath();
      ctx.arc(sx - 8, sy + 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Gischt in Stromschnellen
  for (const z of sim.zones || []) {
    const zs = raftX + (z.s - sim.dist) * PXPM;
    const ze = raftX + (z.e - sim.dist) * PXPM;
    if (ze < 0 || zs > W) continue;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let x = Math.max(0, zs); x < Math.min(W, ze); x += 18) {
      if (Math.random() < 0.6) {
        ctx.beginPath();
        ctx.arc(
          x + Math.random() * 12,
          waterBase + waveAt(x, time) + Math.random() * 6,
          2 + Math.random() * 4,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  // Der Ziel-Steg
  const goalX = raftX + (GOAL_M - sim.dist) * PXPM;
  if (goalX < W + 260) {
    const gy = waterBase - 26;
    ctx.fillStyle = "#6e4620";
    for (const px of [goalX + 20, goalX + 90, goalX + 160]) ctx.fillRect(px, gy, 10, 60);
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(goalX, gy - 12, 220, 14);
    ctx.strokeStyle = "#5c3a18";
    ctx.strokeRect(goalX, gy - 12, 220, 14);
    ctx.font = "30px serif";
    ctx.textAlign = "center";
    ctx.fillText("🏁", goalX + 30, gy - 20);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("ZIEL-STEG", goalX + 120, gy - 22);
  }

  // Rakete im Anflug
  if (sim.rocket && sim.rocket.fired && !sim.rocket.exploded) {
    const p = Math.min(1, sim.rocket.prog);
    const rx = raftX + 950 * (1 - p);
    const ry = -60 + p * (waterBase - 20);
    ctx.save();
    ctx.translate(rx, ry);
    // Flugrichtung: von rechts oben aufs Floß (Zeichnung mit Nase nach oben)
    ctx.rotate(Math.atan2(waterBase + 40, -950) + Math.PI / 2);
    // Flamme
    ctx.fillStyle = "#ff9b2f";
    ctx.beginPath();
    ctx.moveTo(-6, 22);
    ctx.quadraticCurveTo(0, 40 + Math.random() * 8, 6, 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffe17a";
    ctx.beginPath();
    ctx.moveTo(-3, 22);
    ctx.quadraticCurveTo(0, 32 + Math.random() * 5, 3, 22);
    ctx.closePath();
    ctx.fill();
    // Finnen
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.moveTo(-8, 10);
    ctx.lineTo(-16, 24);
    ctx.lineTo(-8, 22);
    ctx.closePath();
    ctx.moveTo(8, 10);
    ctx.lineTo(16, 24);
    ctx.lineTo(8, 22);
    ctx.closePath();
    ctx.fill();
    // Körper
    ctx.fillStyle = "#e8edf2";
    ctx.strokeStyle = "#8a95a1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.quadraticCurveTo(9, -12, 9, 4);
    ctx.lineTo(9, 22);
    ctx.lineTo(-9, 22);
    ctx.lineTo(-9, 4);
    ctx.quadraticCurveTo(-9, -12, 0, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Spitze
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.quadraticCurveTo(8, -15, 9, -6);
    ctx.lineTo(-9, -6);
    ctx.quadraticCurveTo(-8, -15, 0, -26);
    ctx.closePath();
    ctx.fill();
    // Bullauge
    ctx.fillStyle = "#9fd4e8";
    ctx.strokeStyle = "#8a95a1";
    ctx.beginPath();
    ctx.arc(0, 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `rgba(255,${140 + Math.random() * 80},40,${0.5 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(
        rx + 24 + Math.random() * 26,
        ry - 24 - Math.random() * 26,
        3 + Math.random() * 6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // Bomber + fallende Bombe
  if (sim.nuke && sim.nuke.bomber > 0 && !sim.nuke.detonated) {
    const nk = sim.nuke;
    const bx = -120 + (W + 240) * nk.bomber;
    const by = H * 0.1 + Math.sin(time * 1.5) * 4;
    // Prozeduraler Bomber (Nase nach rechts)
    ctx.save();
    ctx.translate(bx, by);
    // Seitenleitwerk
    ctx.fillStyle = "#4c5243";
    ctx.strokeStyle = "#343a2e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-30, -7);
    ctx.lineTo(-52, -26);
    ctx.lineTo(-42, -26);
    ctx.lineTo(-20, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Rumpf
    ctx.fillStyle = "#59604f";
    ctx.beginPath();
    ctx.moveTo(-48, 0);
    ctx.quadraticCurveTo(-52, -8, -36, -9);
    ctx.lineTo(28, -9);
    ctx.quadraticCurveTo(50, -8, 56, 0);
    ctx.quadraticCurveTo(48, 8, 28, 8);
    ctx.lineTo(-38, 8);
    ctx.quadraticCurveTo(-52, 7, -48, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Cockpit-Glas
    ctx.fillStyle = "#9fd4e8";
    ctx.beginPath();
    ctx.moveTo(34, -9);
    ctx.quadraticCurveTo(48, -8, 53, -2);
    ctx.lineTo(38, -2);
    ctx.closePath();
    ctx.fill();
    // Tragfläche (leicht nach vorn-unten gepfeilt)
    ctx.fillStyle = "#515746";
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.lineTo(-24, 14);
    ctx.lineTo(-8, 16);
    ctx.lineTo(18, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Triebwerk unter der Tragfläche
    ctx.fillStyle = "#2e332a";
    ctx.beginPath();
    ctx.roundRect(-8, 10, 20, 8, 4);
    ctx.fill();
    // Heck-Kennung
    ctx.fillStyle = "#d8dcc9";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("404", -30, 0);
    // Rotes Blinklicht auf dem Leitwerk
    if (Math.floor(performance.now() / 280) % 2) {
      ctx.fillStyle = "#ff4d4d";
      ctx.beginPath();
      ctx.arc(-47, -28, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (nk.dropped) {
      const p = Math.min(1, nk.bombProg);
      const bombX = raftX + Math.sin(p * 9) * 6;
      const bombY = H * 0.13 + (waterBase - 50 - H * 0.13) * (p * p);
      ctx.save();
      ctx.translate(bombX, bombY);
      ctx.fillStyle = "#1b1b1b";
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#444";
      ctx.fillRect(-6, -20, 12, 6);
      ctx.restore();
    }
  }

  // Atompilz nach der Detonation
  if (sim.nukeHit && sim.explosion) {
    const ex = sim.explosion;
    const grow = Math.min(1, (2.4 - ex.life) / 1.4);
    const alpha = Math.max(0, ex.life / 2.4);
    ctx.globalAlpha = alpha * 0.9;
    // Stiel
    ctx.fillStyle = "#b9a08a";
    ctx.beginPath();
    ctx.moveTo(ex.x - 26 * grow, waterBase);
    ctx.quadraticCurveTo(ex.x - 14 * grow, ex.y - 60 * grow, ex.x - 34 * grow, ex.y - 110 * grow);
    ctx.lineTo(ex.x + 34 * grow, ex.y - 110 * grow);
    ctx.quadraticCurveTo(ex.x + 14 * grow, ex.y - 60 * grow, ex.x + 26 * grow, waterBase);
    ctx.closePath();
    ctx.fill();
    // Pilzkappe
    for (const [ox, oy, r] of [
      [0, -150, 62],
      [-52, -132, 40],
      [52, -132, 40],
      [-24, -160, 46],
      [24, -160, 46],
    ]) {
      const gradN = ctx.createRadialGradient(
        ex.x + ox * grow,
        ex.y + oy * grow,
        2,
        ex.x + ox * grow,
        ex.y + oy * grow,
        r * grow,
      );
      gradN.addColorStop(0, "#ffd27a");
      gradN.addColorStop(0.5, "#e8934a");
      gradN.addColorStop(1, "#8d6b52");
      ctx.fillStyle = gradN;
      ctx.beginPath();
      ctx.arc(ex.x + ox * grow, ex.y + oy * grow, r * grow, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Explosion
  if (sim.explosion) {
    const ex = sim.explosion;
    const alpha = Math.max(0, ex.life);
    const grad2 = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.r);
    grad2.addColorStop(0, `rgba(255,240,150,${alpha})`);
    grad2.addColorStop(0.5, `rgba(255,120,30,${alpha * 0.8})`);
    grad2.addColorStop(1, "rgba(255,60,0,0)");
    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
    ctx.fill();
    // Gezackter Explosions-Stern (zwei Lagen, leicht rotierend)
    const burst = (r: number, color: string, rot: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 20; i++) {
        const ang = (i / 20) * Math.PI * 2 + rot;
        const rad = i % 2 === 0 ? r : r * 0.55;
        const px = ex.x + Math.cos(ang) * rad;
        const py = ex.y + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };
    ctx.globalAlpha = Math.max(0, Math.min(1, ex.life));
    const bs = 24 + ex.r * 0.35;
    burst(bs, "#ff7c1f", performance.now() / 900);
    burst(bs * 0.62, "#ffd23e", -performance.now() / 700);
    ctx.globalAlpha = 1;
  }

  // Partikel
  for (const p of sim.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    if (p.type === "bubble") {
      ctx.strokeStyle = "#bfe6ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#cfeaff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Nuklearer Weißblitz
  if (sim.nukeFlash > 0) {
    ctx.globalAlpha = Math.min(1, sim.nukeFlash);
    ctx.fillStyle = "#fff";
    ctx.fillRect(-40, -40, W + 80, H + 80);
    ctx.globalAlpha = 1;
  }
}

function drawStructure(ctx, raftX, waterBase, time) {
  const st = sim.main;
  if (!st) return;

  const surfaceY = waterBase + waveAt(raftX, time);
  const d =
    sim.phase === "sinking" || sim.phase === "sunk" || sim.phase === "capsize"
      ? sim.dEq + sim.sinkDepth
      : sim.dEq;

  const pivotX = raftX;
  const pivotY = sim.phase === "drop" ? waterBase - 40 + sim.dropY : surfaceY;

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(sim.phase === "drop" ? Math.sin(performance.now() / 200) * 0.05 : sim.tilt);

  // lokales Koordinatensystem: (0,0) = Drehpunkt (Massezentrum-x auf Wasserlinie)
  const offX = -st.cmx;
  const offY = sim.phase === "drop" ? -st.Hpx + 20 : d - st.Hpx;

  for (const p of st.parts) {
    const x = offX + (p.col - st.minCol) * CT;
    const y = offY + (p.row - st.minRow) * CT;
    drawPartRect(ctx, p.def, x, y, CT, p.broken);
  }

  // Brudi auf der Standfläche (fällt bei Kenterung separat)
  if (!sim.freeBrudi) {
    drawBrudi(ctx, offX + st.standX, offY + st.standY, time, false);
  }

  // Möwe, sein neuer Mitbewohner
  if (sim.gull && sim.gull.landed) {
    ctx.font = "24px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("🕊️", offX + st.standX + 42, offY + st.standY + Math.sin(time * 3) * 2);
  }

  ctx.restore();
}

function drawDrifters(ctx, raftX, waterBase, time) {
  for (const dr of sim.drifters) {
    const x = raftX + dr.dx;
    const y = sim.phase === "drop" ? waterBase - 40 + sim.dropY : waterBase + waveAt(x, time);
    const cs = CT * 0.8;
    const w = dr.def.w * cs,
      h = dr.def.h * cs;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 2 + dr.wob) * 0.18);
    // Halb eingetaucht davontreiben — als richtige Zeichnung, nicht als Emoji
    drawPartRect(ctx, dr.def, -w / 2, -h + h * 0.3, cs);
    ctx.restore();
  }
}

function drawBrudi(ctx, x, footY, time, forcePanic) {
  const panic =
    forcePanic || sim.phase === "sinking" || sim.phase === "sunk" || sim.phase === "capsize";
  const won = sim.phase === "won";
  const flail = panic ? Math.sin(performance.now() / 60) * 0.9 : Math.sin(time * 2) * 0.12;

  ctx.save();
  ctx.translate(x, footY);
  if (panic) ctx.rotate(Math.sin(performance.now() / 150) * 0.15);

  // Beine
  ctx.strokeStyle = "#26263c";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(-6, -22);
  ctx.moveTo(7, 0);
  ctx.lineTo(6, -22);
  ctx.stroke();

  // Torso (Twitch-lila Hoodie)
  ctx.fillStyle = "#9146ff";
  ctx.beginPath();
  ctx.roundRect(-14, -56, 28, 36, 8);
  ctx.fill();

  // Arme
  ctx.strokeStyle = "#9146ff";
  ctx.lineWidth = 7;
  const armY = -48;
  ctx.beginPath();
  if (panic || won) {
    ctx.moveTo(-12, armY);
    ctx.lineTo(-24, armY - 20 + flail * 8);
    ctx.moveTo(12, armY);
    ctx.lineTo(24, armY - 20 - flail * 8);
  } else {
    ctx.moveTo(-12, armY);
    ctx.lineTo(-22, armY + 16 + flail * 20);
    ctx.moveTo(12, armY);
    ctx.lineTo(22, armY + 16 - flail * 20);
  }
  ctx.stroke();

  // Kopf: 7tv-Gesicht
  const headR = 24;
  const headY = -56 - headR + 4;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (FACE.complete && FACE.naturalWidth) {
    if (panic) {
      ctx.translate(0, headY);
      ctx.rotate(Math.sin(performance.now() / 90) * 0.25);
      ctx.translate(0, -headY);
    }
    ctx.drawImage(FACE, -headR, headY - headR, headR * 2, headR * 2);
  } else {
    ctx.fillStyle = "#9146ff";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("B", 0, headY + 9);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.strokeStyle = panic ? "#ff5c5c" : "#26263c";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Sprechblase
  if (panic || won) {
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#26263c";
    ctx.lineWidth = 4;
    const msg = won ? "EZ Clap 😎" : "ICH KANN NICHT SCHWIMMEN!!";
    ctx.strokeText(msg, 0, headY - headR - 12);
    ctx.fillText(msg, 0, headY - headR - 12);
  }

  ctx.restore();
}

/* ---------- Endscreen ---------- */

function endTest(won) {
  if (sim.ended) return;
  sim.ended = true;
  sim.running = false;
  clearTimeout(sim.bannerTimeout);
  $("banner").classList.add("hidden");
  const st = sim.main;
  const meters = Math.min(GOAL_M, Math.round(sim.dist));
  const score = Math.max(
    0,
    Math.round(meters * 2 + (st ? st.parts.length * 15 : 0) + sim.comfort * 40 + (won ? 500 : 0)),
  );

  const card = document.querySelector(".end-card");
  card.className = "end-card " + (won ? "won" : "lost");
  $("end-title").textContent = won
    ? "🏁 ANGEKOMMEN!"
    : sim.nukeHit
      ? "☢️ ATOMISIERT!"
      : sim.policeHit
        ? "🚔 VERSENKT!"
        : sim.rocketHit
          ? "🚀 ABGESCHOSSEN!"
          : sim.phase === "sunk" && Math.abs(sim.tilt) > 0.5 && sim.freeBrudi
            ? "🙃 GEKENTERT!"
            : "🫧 ABGESOFFEN!";

  let text;
  if (won) {
    const abzug = sim.brokeOff.length ? ` Unterwegs verloren: „${sim.brokeOff.join("“, „")}“.` : "";
    if (sim.policeHit || sim.rocketHit) {
      const was = [sim.rocketHit ? "RAKETENEINSCHLAG" : "", sim.policeHit ? "POLIZEI-BESCHUSS" : ""]
        .filter(Boolean)
        .join(" und ");
      text = `${GOAL_M} m überstanden – inklusive ${was}. Absolute Legende.${abzug}`;
    } else if (sim.rockHits >= 2) {
      text = `${GOAL_M} m Wildwasser, ${sim.rockHits} Felsen frontal mitgenommen – und TROTZDEM angekommen.${abzug} Absoluter Ehrenmann, das Floß.`;
    } else {
      text = `${GOAL_M} m Wildwasser überstanden! Der Steg hat gehalten. Das Floß… so halb.${abzug}`;
    }
  } else if (sim.nukeHit) {
    text = `Bei Meter ${meters} wurde das Floß per taktischem Nuklearschlag neutralisiert. Grund: ${sim.nukeTopfis} Topfis. Verluste: alles. Überlebende: Brudi (knapp) und sämtliche Topfis (selbstverständlich).`;
  } else if (sim.policeHit) {
    text = `Die Wasserschutzpolizei hat das Floß bei Meter ${meters} versenkt. Begründung: „Keine Zulassung.“ Als ob ein FLOẞ eine Zulassung bräuchte.`;
  } else if (sim.rocketHit) {
    text = `Bei Meter ${meters} von einer RAKETE getroffen. Auf einem Fluss. Statistisch nahezu unmöglich. Brudi hat's trotzdem geschafft.`;
  } else if (!st && !sim.brokeOff.length) {
    text =
      "Es gab… kein Floß. Brudi ist einfach in den Fluss gelaufen. Der Bademeister hat es kommen sehen.";
  } else if (!st && sim.brokeOff.length) {
    text = `Das Floß hat sich bei Meter ${meters} in seine EINZELTEILE zerlegt. Baumarkt-Bewertung: ⭐ „Kam als Bausatz an. Blieb einer.“`;
  } else if (Math.abs(sim.tilt) > 0.5 && sim.freeBrudi) {
    text = `Bei Meter ${meters} gekentert – der Schwerpunkt saß schief. Vielleicht das schwere Zeug nächstes Mal in die MITTE?`;
  } else if (meters < 15) {
    text =
      "Das Floß ist ungefähr so schwimmfähig wie eine Waschmaschine. Sofort abgesoffen. Peinlich.";
  } else if (sim.rockHits >= 2) {
    text = `Felsen: ${sim.rockHits}, Floß: 0. Bei Meter ${meters} war der TÜV dann doch fällig.`;
  } else if (sim.brokeOff.length) {
    text = `Erst ging „${sim.brokeOff.join("“, „")}“ über Bord, dann die Hoffnung. Bei Meter ${meters} war Schluss. Mehr Knoten nächstes Mal?`;
  } else if (sim.chaosEvents.some((e) => e.done)) {
    const broken = sim.chaosEvents
      .filter((e) => e.done)
      .map((e) => e.part.def.name)
      .join(", ");
    text = `Bei Meter ${meters} war Schluss – Schuld: ${broken}. War abzusehen, ehrlich.`;
  } else {
    text = `${meters} m gekämpft, dann haben die Wellen gewonnen. Tipp: Höher bauen oder mehr Auftrieb unten rein.`;
  }
  $("end-text").textContent = text;
  $("end-score").textContent = String(score);
  $("end-screen").classList.remove("hidden");
}

/* ---------- Init ---------- */

$("start-btn").addEventListener("click", startTest);
$("retry-btn").addEventListener("click", () => {
  $("end-screen").classList.add("hidden");
  $("test-screen").classList.add("hidden");
  $("build-screen").classList.remove("hidden");
  sim.running = false;
  renderBuild();
});

initBuilderInput();
renderBuild();

// Debug-Zugang nur mit ?debugflos in der URL (für Entwicklung/Tests)
if (location.search.includes("debugflos")) {
  (window as any).__flos = {
    sim,
    PARTS,
    get placed() {
      return placed;
    },
  };
}
