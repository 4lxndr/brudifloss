/* Ein Bauteil = eine Datei: Stats (def) und Zeichnung (paint) nebeneinander.
   Neues Teil hinzufügen: Datei anlegen, hier importieren, in MODULES einreihen. */

import type { PartDef, PartPainter } from "../types";
import * as brett from "./brett";
import * as kasten from "./kasten";
import * as nudel from "./nudel";
import * as fass from "./fass";
import * as matratze from "./matratze";
import * as ente from "./ente";
import * as wanne from "./wanne";
import * as hype from "./hype";
import * as stuhl from "./stuhl";
import * as mikro from "./mikro";
import * as anker from "./anker";
import * as topfi from "./topfi";
import * as strudel from "./strudel";

const MODULES = [
  brett,
  kasten,
  nudel,
  fass,
  matratze,
  ente,
  wanne,
  hype,
  stuhl,
  mikro,
  anker,
  topfi,
  strudel,
];

export const PARTS: PartDef[] = MODULES.map((m) => m.def);
export const PAINTERS: Record<string, PartPainter> = Object.fromEntries(
  MODULES.map((m) => [m.def.id, m.paint]),
);
