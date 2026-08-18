export type Ctx2D = CanvasRenderingContext2D;

export interface PartDef {
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

export interface PlacedPart {
  def: PartDef;
  col: number;
  row: number;
  broken: boolean;
}

export interface Structure {
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

export type PartPainter = (ctx: Ctx2D, x: number, y: number, w: number, h: number) => void;
