import ExcelJS from "exceljs";
import type { DataRow, Dataset, ValidatorKind } from "../types";
import { fieldsFor, mapHeaders } from "./headers";
import { formatDate, formatDateTime } from "./dates";
import { makeRowKey, validateEgresos } from "./validateEgresos";
import { validateEmergencia } from "./validateEmergencia";

function cellToString(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    const hasTime = value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0;
    return hasTime ? formatDateTime(value) : formatDate(value);
  }
  if (typeof value === "object") {
    const record = value as { text?: unknown; result?: unknown; richText?: { text: string }[] };
    if (typeof record.text === "string") return record.text.trim();
    if (Array.isArray(record.richText)) {
      return record.richText.map((part) => part.text).join("").trim();
    }
    if ("result" in record) return cellToString(record.result);
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

async function readGrid(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseCsv(await file.text());
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const grid: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      values[col - 1] = cellToString(cell.value);
    });
    grid.push(values.map((value) => value ?? ""));
  });
  return grid;
}

export async function loadDataset(kind: ValidatorKind, file: File): Promise<Dataset> {
  const grid = await readGrid(file);
  if (grid.length < 2) {
    throw new Error("El archivo no tiene filas de datos. Incluya encabezados y al menos un registro.");
  }
  const headers = grid[0].map((header, index) => header || `Columna ${index + 1}`);
  const { mapping } = mapHeaders(kind, headers);
  const mappedCount = new Set(Object.values(mapping)).size;
  if (mappedCount < 3) {
    throw new Error(
      "No se reconocieron las columnas. Descargue la plantilla e indique historia clínica, nombres y fechas.",
    );
  }

  const canonical = fieldsFor(kind);
  const rows: DataRow[] = [];
  grid.slice(1).forEach((record, index) => {
    if (record.every((value) => !value.trim())) return;
    const values: Record<string, string> = {};
    canonical.forEach((field) => {
      values[field] = "";
    });
    headers.forEach((header, col) => {
      const field = mapping[header];
      if (field) values[field] = record[col] ?? "";
    });
    const fallback = String(index + 2);
    rows.push({
      rowNumber: index + 2,
      rowKey: makeRowKey(kind, values, fallback),
      values,
    });
  });

  if (rows.length === 0) {
    throw new Error("No se encontraron registros para validar.");
  }

  const issues =
    kind === "egresos" ? validateEgresos(rows) : validateEmergencia(rows);

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
