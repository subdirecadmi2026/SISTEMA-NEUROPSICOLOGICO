import type { ReviewedEntry, ValidatorKind } from "../types";

const STORAGE_KEY = "hgp-validadores-reviewed-v1";

function readAll(): Record<string, ReviewedEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ReviewedEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(store: Record<string, ReviewedEntry>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadReviewed(kind: ValidatorKind): Map<string, ReviewedEntry> {
  const prefix = `${kind}|`;
  const map = new Map<string, ReviewedEntry>();
  Object.entries(readAll()).forEach(([key, value]) => {
    if (key.startsWith(prefix) || value.rowKey.startsWith(kind)) {
      map.set(value.rowKey, value);
    }
  });
  return map;
}

export function upsertReviewed(entry: ReviewedEntry) {
  const store = readAll();
  store[entry.rowKey] = entry;
  writeAll(store);
}

export function removeReviewed(rowKey: string) {
  const store = readAll();
  delete store[rowKey];
  writeAll(store);
}
