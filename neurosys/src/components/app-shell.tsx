"use client";

import {
  Bell,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  ClipboardPlus,
  FileChartColumn,
  HeartPulse,
  LayoutDashboard,
  Menu,
  MessageCircleMore,
  MoreHorizontal,
  Search,
  Settings,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { label: "Inicio", icon: LayoutDashboard, href: "/" },
  { label: "Pacientes", icon: Users, href: "/pacientes" },
  { label: "Agenda", icon: CalendarDays, href: "/agenda", count: "8" },
  { label: "Historia clínica", icon: ClipboardPlus, href: "/historia-clinica" },
  { label: "Evaluaciones", icon: BrainCircuit, href: "/evaluaciones" },
  { label: "Terapias", icon: HeartPulse, href: "/terapias" },
  { label: "Informes", icon: FileChartColumn, href: "/informes" },
  {
    label: "Comunicaciones",
    icon: MessageCircleMore,
    href: "/comunicaciones",
  },
  { label: "Caja y facturación", icon: WalletCards, href: "/facturacion" },
];

function Brand() {
  return (
    <Link href="/" className="flex h-20 items-center gap-3 px-5">
      <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200">
        <BrainCircuit size={23} strokeWidth={2.1} />
      </div>
      <div>
        <p className="text-[17px] font-bold tracking-tight text-slate-950">
          NeuroSys
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-500">
          Clinical ERP
        </p>
      </div>
    </Link>
  );
}

function Sidebar({
  mobileOpen,
  close,
}: {
  mobileOpen: boolean;
  close: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between pr-4">
          <Brand />
          <button
            aria-label="Cerrar menú"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={close}
          >
            <X size={19} />
          </button>
        </div>

        <button className="mx-4 mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-white text-xs font-bold text-indigo-600 shadow-sm">
              NW
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-slate-800">
                Centro Ñampi Wasi
              </span>
              <span className="mt-0.5 block text-[10px] text-slate-500">
                Sede principal
              </span>
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </span>
        </button>

        <nav className="flex-1 overflow-y-auto px-3">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">
            Espacio de trabajo
          </p>
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={close}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={active ? "text-indigo-600" : "text-slate-400"}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.count && (
                    <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
            <Settings size={18} className="text-slate-400" />
            Configuración
          </button>
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-200 text-xs font-bold text-indigo-700">
              DR
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                Dr. Diego Romero
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Director clínico
              </p>
            </div>
            <MoreHorizontal size={16} className="text-slate-400" />
          </div>
        </div>
      </aside>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <Sidebar mobileOpen={mobileOpen} close={() => setMobileOpen(false)} />
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir menú"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={19} />
            </button>
            <div className="relative hidden sm:block">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                aria-label="Buscar en NeuroSys"
                placeholder="Buscar paciente, historia o documento..."
                className="h-10 w-72 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 md:w-80"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/pacientes?nuevo=1"
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 sm:flex"
            >
              <UserPlus size={16} />
              Nuevo paciente
            </Link>
            <button
              aria-label="Notificaciones"
              className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm hover:text-indigo-600"
            >
              <Bell size={17} />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
