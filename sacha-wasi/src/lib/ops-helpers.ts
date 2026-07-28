"use client";

/**
 * Extiende el store demo con compras, mesas y alertas.
 * Este archivo se mantiene pequeño; la lógica principal vive en demo-store.tsx
 */

import {
  createInitialPurchases,
  DEMO_MESAS,
  DEMO_PROVEEDORES,
} from "@/lib/demo-data";
import type { AppAlert, Mesa, PurchaseOrder, PurchaseLine } from "@/types";

export { DEMO_MESAS, DEMO_PROVEEDORES, createInitialPurchases };

export function buildAlerts(input: {
  cashClosed: boolean;
  criticalStockNames: string[];
  lateKitchenCount: number;
}): AppAlert[] {
  const now = new Date().toISOString();
  const alerts: AppAlert[] = [];

  if (input.cashClosed) {
    alerts.push({
      id: "alert-cash",
      level: "warn",
      title: "Caja cerrada",
      body: "No se pueden registrar ventas hasta abrir un nuevo turno.",
      href: "/caja",
      created_at: now,
      read: false,
    });
  }

  if (input.criticalStockNames.length > 0) {
    alerts.push({
      id: "alert-stock",
      level: "critical",
      title: "Stock crítico",
      body: input.criticalStockNames.join(", "),
      href: "/inventario",
      created_at: now,
      read: false,
    });
  }

  if (input.lateKitchenCount > 0) {
    alerts.push({
      id: "alert-kitchen",
      level: "warn",
      title: "Demoras en cocina",
      body: `${input.lateKitchenCount} pedido(s) con más de 12 minutos.`,
      href: "/kds",
      created_at: now,
      read: false,
    });
  }

  return alerts;
}

export function emptyPurchase(
  sucursalId: string,
  userId: string,
  seq: number,
): PurchaseOrder {
  return {
    id: `po-${Date.now()}`,
    numero: `OC-${seq}`,
    proveedor_id: DEMO_PROVEEDORES[0].id,
    sucursal_id: sucursalId,
    status: "borrador",
    lines: [],
    total: 0,
    created_at: new Date().toISOString(),
    created_by: userId,
    notes: null,
  };
}

export function calcPurchaseTotal(lines: PurchaseLine[]) {
  return lines.reduce((s, l) => s + l.cantidad * l.costo_unit, 0);
}

export type { Mesa };
