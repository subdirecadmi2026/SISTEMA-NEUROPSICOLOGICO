import * as XLSX from "xlsx";
import type { DataRow, Dataset, ValidatorKind } from "../types";
import { composePatientName, fieldsFor, mapHeaders } from "./headers";
import { makeRowKey } from "./validateEgresos";
import { validateEgresos } from "./validateEgresos";
import { validateEmergencia } from "./validateEmergencia";

function cellToString(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const hasTime = value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0;
    const day = `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
    return hasTime
      ? `${day} ${pad(value.getHours())}:${pad(value.getMinutes())}`
      : day;
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 20000 && value < 80000) {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const pad = (n: number) => String(n).padStart(2, "0");
      const day = `${pad(date.d)}/${pad(date.m)}/${date.y}`;
      if (date.H || date.M || date.S) {
        return `${day} ${pad(date.H)}:${pad(date.M)}`;
      }
      return day;
    }
  }
  return String(value).trim();
}

function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const counts = {
    ";": (firstLine.match(/;/g) ?? []).length,
    ",": (firstLine.match(/,/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
  };
  const delimiter =
    counts[";"] >= counts[","] && counts[";"] >= counts["\t"]
      ? ";"
      : counts["\t"] >= counts[","]
        ? "\t"
        : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
      if (ch === "\r") i += 1;
      continue;
    }
    if (ch !== "\r") cell += ch;
  }
  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function sheetToGrid(sheet: XLSX.WorkSheet): string[][] {
  const raw = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });
  return raw.map((row) => row.map((cell) => cellToString(cell)));
}

function pickGrid(kind: ValidatorKind, grids: string[][][]): string[][] {
  let best = grids[0] ?? [];
  let bestScore = -1;
  grids.forEach((grid) => {
    const limit = Math.min(grid.length, 25);
    for (let i = 0; i < limit; i += 1) {
      const score = mapHeaders(kind, grid[i] ?? []).score;
      if (score > bestScore) {
        bestScore = score;
        best = grid;
      }
    }
  });
  return best;
}

function findHeaderIndex(kind: ValidatorKind, grid: string[][]): number {
  let best = 0;
  let bestScore = -1;
  const limit = Math.min(grid.length, 25);
  for (let i = 0; i < limit; i += 1) {
    const score = mapHeaders(kind, grid[i] ?? []).score;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

async function readGrid(kind: ValidatorKind, file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseCsv(new TextDecoder("utf-8").decode(buffer));
  }
  try {
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      cellNF: false,
    });
    const grids = workbook.SheetNames.map((sheetName) =>
      sheetToGrid(workbook.Sheets[sheetName]!),
    ).filter((grid) => grid.length > 0);
    if (grids.length === 0) return [];
    return pickGrid(kind, grids);
  } catch (error) {
    const message = error instanceof Error ? error.message : "archivo ilegible";
    throw new Error(
      `No se pudo leer ${file.name} (${message}). Ábralo en Excel y guárdelo como .xlsx o CSV.`,
    );
  }
}

export async function loadDataset(kind: ValidatorKind, file: File): Promise<Dataset> {
  const grid = await readGrid(kind, file);
  if (grid.length < 2) {
    throw new Error(
      "El archivo no tiene filas de datos. La primera fila reconocible debe ser el encabezado.",
    );
  }
  const headerIndex = findHeaderIndex(kind, grid);
  const headers = (grid[headerIndex] ?? []).map(
    (header, index) => header || `Columna ${index + 1}`,
  );
  const { mapping, score } = mapHeaders(kind, headers);
  if (score < 3) {
    throw new Error(
      `No se reconocieron las columnas de ${kind === "egresos" ? "egresos" : "emergencia"}. Use la plantilla o ponga historia clínica, nombres y fechas en la primera fila de datos.`,
    );
  }

  const canonical = fieldsFor(kind);
  const rows: DataRow[] = [];
  grid.slice(headerIndex + 1).forEach((record, index) => {
    if (record.every((value) => !String(value).trim())) return;
    const values: Record<string, string> = {};
    canonical.forEach((field) => {
      values[field] = "";
    });
    headers.forEach((header, col) => {
      const field = mapping[header];
      if (field) values[field] = record[col] ?? "";
    });
    if (!values.apellidosNombres) {
      values.apellidosNombres = composePatientName(headers, record);
    }
    const excelRow = headerIndex + index + 2;
    rows.push({
      rowNumber: excelRow,
      rowKey: makeRowKey(kind, values, String(excelRow)),
      values,
    });
  });

  if (rows.length === 0) {
    throw new Error("No se encontraron registros para validar debajo del encabezado.");
  }

  const issues = kind === "egresos" ? validateEgresos(rows) : validateEmergencia(rows);

  return {
    kind,
    fileName: file.name,
    loadedAt: new Date().toISOString(),
    headers: [...canonical],
    rows,
    issues,
  };
}

export { parseCsv };
