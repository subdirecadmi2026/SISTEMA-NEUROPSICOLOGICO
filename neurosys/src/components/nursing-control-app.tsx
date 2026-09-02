"use client";

import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Edit3,
  Eye,
  FileDown,
  Grid2X2,
  Hospital,
  KeyRound,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

type ModuleId =
  | "inicio"
  | "horarios"
  | "personal"
  | "usuarios"
  | "servicios"
  | "claves";

type ModalType = Exclude<ModuleId, "inicio">;

type Staff = {
  id: number;
  name: string;
  document: string;
  position: string;
  service: string;
  status: "Activo" | "Vacaciones";
};

type User = {
  id: number;
  name: string;
  email: string;
  role: "Administrador" | "Supervisor" | "Jefe de enfermería";
  service: string;
  status: "Activo" | "Inactivo";
};

type Service = {
  id: number;
  name: string;
  leader: string;
  staff: number;
  coverage: string;
  status: "Activo" | "Inactivo";
};

type Shift = {
  id: number;
  code: string;
  name: string;
  time: string;
  hours: number;
  color: string;
};

type Schedule = {
  id: number;
  name: string;
  service: string;
  period: string;
  status: "Borrador" | "En revisión" | "Aprobado";
  coverage: number;
};

type FormState = Record<string, string>;

const navigation: { id: ModuleId; label: string; icon: LucideIcon }[] = [
  { id: "inicio", label: "Inicio", icon: Grid2X2 },
  { id: "horarios", label: "Horarios", icon: CalendarDays },
  { id: "personal", label: "Personal", icon: Stethoscope },
  { id: "usuarios", label: "Usuarios y roles", icon: UserCog },
  { id: "servicios", label: "Servicios", icon: Hospital },
  { id: "claves", label: "Claves de turno", icon: KeyRound },
];

const initialStaff: Staff[] = [
  { id: 1, name: "Maritza Pilamunga", document: "0604125892", position: "Enfermera", service: "UCI", status: "Activo" },
  { id: 2, name: "Jessica Camale", document: "0603784510", position: "Enfermera", service: "UCI", status: "Activo" },
  { id: 3, name: "Anderson Pacy", document: "0605217398", position: "Enfermero", service: "UCI", status: "Activo" },
  { id: 4, name: "Johanna Colcha", document: "0604892173", position: "Enfermera", service: "Emergencia", status: "Vacaciones" },
  { id: 5, name: "Luis Chocaza", document: "0603198457", position: "Auxiliar", service: "UCI", status: "Activo" },
  { id: 6, name: "Katherine Andalle", document: "0604412785", position: "Responsable", service: "UCI", status: "Activo" },
];

const initialUsers: User[] = [
  { id: 1, name: "Ana Torres", email: "ana.torres@hospital.gob.ec", role: "Administrador", service: "Todos", status: "Activo" },
  { id: 2, name: "Alex Naranjo", email: "alex.naranjo@hospital.gob.ec", role: "Supervisor", service: "Todos", status: "Activo" },
  { id: 3, name: "Karina Pilamunga", email: "karina.p@hospital.gob.ec", role: "Jefe de enfermería", service: "UCI", status: "Activo" },
  { id: 4, name: "Irma Naveda", email: "irma.naveda@hospital.gob.ec", role: "Supervisor", service: "Emergencia", status: "Inactivo" },
];

const initialServices: Service[] = [
  { id: 1, name: "Unidad de Cuidados Intensivos", leader: "Karina Pilamunga", staff: 14, coverage: "24 horas", status: "Activo" },
  { id: 2, name: "Emergencia", leader: "María Guamán", staff: 22, coverage: "24 horas", status: "Activo" },
  { id: 3, name: "Hospitalización", leader: "Lucía Chicaiza", staff: 18, coverage: "24 horas", status: "Activo" },
  { id: 4, name: "Consulta externa", leader: "Diana Paredes", staff: 8, coverage: "07:00 — 17:00", status: "Activo" },
];

const initialShifts: Shift[] = [
  { id: 1, code: "D", name: "Turno diurno", time: "07:00 — 19:30", hours: 12, color: "#dceeff" },
  { id: 2, code: "N1", name: "Turno nocturno", time: "19:00 — 07:30", hours: 12, color: "#e9e2ff" },
  { id: 3, code: "A1", name: "Turno administrativo", time: "08:00 — 16:00", hours: 8, color: "#daf4e8" },
  { id: 4, code: "L", name: "Libre", time: "Descanso", hours: 0, color: "#f1f4f6" },
  { id: 5, code: "V", name: "Vacaciones", time: "Día completo", hours: 0, color: "#ffe5ef" },
  { id: 6, code: "EB", name: "Enfermedad", time: "Justificado", hours: 0, color: "#fff0cf" },
];

const initialSchedules: Schedule[] = [
  { id: 1, name: "Horario UCI — Agosto 2026", service: "UCI", period: "Agosto 2026", status: "En revisión", coverage: 96 },
  { id: 2, name: "Horario Emergencia — Agosto 2026", service: "Emergencia", period: "Agosto 2026", status: "Aprobado", coverage: 100 },
  { id: 3, name: "Horario Hospitalización — Septiembre 2026", service: "Hospitalización", period: "Septiembre 2026", status: "Borrador", coverage: 74 },
];

const rota = [
  ["L", "L", "A1", "A1", "A1", "A1", "L", "L", "A1", "A1", "A1", "A1", "L", "L", "A1", "A1", "A1", "A1", "L", "L", "A1", "A1", "A1", "A1", "L", "L", "A1", "A1", "A1", "L", "L"],
  ["L", "D", "L", "N1", "N1", "L", "L", "D", "D", "L", "N1", "N1", "L", "L", "D", "D", "L", "N1", "N1", "L", "L", "D", "D", "L", "N1", "N1", "L", "L", "D", "D", "L"],
  ["N1", "L", "L", "D", "D", "L", "N1", "N1", "L", "L", "D", "D", "L", "N1", "N1", "L", "L", "D", "D", "L", "N1", "N1", "L", "L", "D", "D", "L", "N1", "N1", "L", "L"],
  ["D", "D", "L", "L", "N1", "N1", "L", "D", "D", "L", "L", "N1", "N1", "L", "D", "D", "L", "L", "N1", "N1", "L", "D", "D", "L", "L", "N1", "N1", "L", "D", "D", "L"],
  ["L", "N1", "N1", "L", "L", "D", "D", "L", "N1", "N1", "L", "L", "D", "D", "L", "N1", "N1", "L", "L", "D", "D", "L", "N1", "N1", "L", "L", "D", "D", "L", "N1", "N1"],
  ["D", "L", "L", "N1", "N1", "L", "D", "D", "L", "L", "N1", "N1", "L", "D", "D", "L", "L", "N1", "N1", "L", "D", "D", "L", "L", "N1", "N1", "L", "D", "D", "L", "L"],
];

const moduleCopy: Record<ModuleId, { title: string; eyebrow: string; description: string }> = {
  inicio: { eyebrow: "Resumen general", title: "Buenos días, Ana", description: "Aquí tienes el estado de la planificación de enfermería." },
  horarios: { eyebrow: "Planificación", title: "Gestión de horarios", description: "Crea, revisa y aprueba la cobertura mensual de cada servicio." },
  personal: { eyebrow: "Talento humano", title: "Personal de enfermería", description: "Administra enfermeras, enfermeros, auxiliares y responsables." },
  usuarios: { eyebrow: "Seguridad", title: "Usuarios y roles", description: "Controla el acceso de administradores, supervisores y jefes." },
  servicios: { eyebrow: "Configuración", title: "Servicios hospitalarios", description: "Organiza las áreas, sus responsables y capacidad operativa." },
  claves: { eyebrow: "Catálogo", title: "Claves de turno", description: "Define jornadas, horas, colores y novedades del horario." },
};

const fieldConfig: Record<ModalType, { key: string; label: string; type?: string; options?: string[] }[]> = {
  horarios: [
    { key: "name", label: "Nombre del horario" },
    { key: "service", label: "Servicio", options: ["UCI", "Emergencia", "Hospitalización", "Consulta externa"] },
    { key: "period", label: "Periodo" },
    { key: "status", label: "Estado", options: ["Borrador", "En revisión", "Aprobado"] },
  ],
  personal: [
    { key: "name", label: "Nombres y apellidos" },
    { key: "document", label: "Documento" },
    { key: "position", label: "Cargo", options: ["Enfermera", "Enfermero", "Auxiliar", "Responsable"] },
    { key: "service", label: "Servicio", options: ["UCI", "Emergencia", "Hospitalización", "Consulta externa"] },
    { key: "status", label: "Estado", options: ["Activo", "Vacaciones"] },
  ],
  usuarios: [
    { key: "name", label: "Nombre completo" },
    { key: "email", label: "Correo institucional", type: "email" },
    { key: "role", label: "Perfil", options: ["Administrador", "Supervisor", "Jefe de enfermería"] },
    { key: "service", label: "Servicio", options: ["Todos", "UCI", "Emergencia", "Hospitalización", "Consulta externa"] },
    { key: "status", label: "Estado", options: ["Activo", "Inactivo"] },
  ],
  servicios: [
    { key: "name", label: "Nombre del servicio" },
    { key: "leader", label: "Jefe responsable" },
    { key: "staff", label: "Número de colaboradores", type: "number" },
    { key: "coverage", label: "Horario de cobertura" },
    { key: "status", label: "Estado", options: ["Activo", "Inactivo"] },
  ],
  claves: [
    { key: "code", label: "Clave" },
    { key: "name", label: "Descripción" },
    { key: "time", label: "Horario" },
    { key: "hours", label: "Horas computables", type: "number" },
    { key: "color", label: "Color", type: "color" },
  ],
};

export function NursingControlApp() {
  const [active, setActive] = useState<ModuleId>("inicio");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState(initialStaff);
  const [users, setUsers] = useState(initialUsers);
  const [services, setServices] = useState(initialServices);
  const [shifts, setShifts] = useState(initialShifts);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [modal, setModal] = useState<{ type: ModalType; item?: FormState } | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const switchModule = (id: ModuleId) => {
    setActive(id);
    setSidebarOpen(false);
    setSearch("");
  };

  const openCreate = (type = active as ModalType) => setModal({ type });
  const openEdit = (type: ModalType, item: object) =>
    setModal({ type, item: Object.fromEntries(Object.entries(item).map(([key, value]) => [key, String(value)])) });

  const removeItem = (type: ModalType, id: number) => {
    if (!window.confirm("¿Deseas eliminar este registro? Esta acción no se puede deshacer.")) return;
    if (type === "personal") setStaff((items) => items.filter((item) => item.id !== id));
    if (type === "usuarios") setUsers((items) => items.filter((item) => item.id !== id));
    if (type === "servicios") setServices((items) => items.filter((item) => item.id !== id));
    if (type === "claves") setShifts((items) => items.filter((item) => item.id !== id));
    if (type === "horarios") setSchedules((items) => items.filter((item) => item.id !== id));
    showToast("Registro eliminado correctamente");
  };

  const saveItem = (form: FormState) => {
    if (!modal) return;
    const id = Number(form.id) || Date.now();
    if (modal.type === "personal") {
      const item = { ...form, id } as unknown as Staff;
      setStaff((items) => form.id ? items.map((old) => old.id === id ? item : old) : [item, ...items]);
    }
    if (modal.type === "usuarios") {
      const item = { ...form, id } as unknown as User;
      setUsers((items) => form.id ? items.map((old) => old.id === id ? item : old) : [item, ...items]);
    }
    if (modal.type === "servicios") {
      const item = { ...form, id, staff: Number(form.staff) } as unknown as Service;
      setServices((items) => form.id ? items.map((old) => old.id === id ? item : old) : [item, ...items]);
    }
    if (modal.type === "claves") {
      const item = { ...form, id, hours: Number(form.hours) } as unknown as Shift;
      setShifts((items) => form.id ? items.map((old) => old.id === id ? item : old) : [item, ...items]);
    }
    if (modal.type === "horarios") {
      const item = { ...form, id, coverage: form.id ? Number(form.coverage) : 0 } as unknown as Schedule;
      setSchedules((items) => form.id ? items.map((old) => old.id === id ? item : old) : [item, ...items]);
    }
    setModal(null);
    showToast(form.id ? "Cambios guardados correctamente" : "Registro creado correctamente");
  };

  const content = moduleCopy[active];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Stethoscope size={22} /></div>
          <div><strong>Control</strong><span>Enfermería</span></div>
        </div>
        <button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú"><X /></button>
        <nav className="main-nav" aria-label="Navegación principal">
          <span className="nav-caption">MENÚ PRINCIPAL</span>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={active === id ? "active" : ""} onClick={() => switchModule(id)}>
              <Icon size={19} strokeWidth={1.9} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card">
            <ShieldCheck size={23} />
            <strong>Acceso seguro</strong>
            <span>Los cambios quedan registrados en auditoría.</span>
          </div>
          <button className="user-panel">
            <span className="avatar">AT</span>
            <span><strong>Ana Torres</strong><small>Administrador</small></span>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú" />}

      <main className="main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Menu /></button>
          <div className="top-search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en este módulo..." />
            <kbd>⌘ K</kbd>
          </div>
          <div className="top-actions">
            <button className="notification" aria-label="Notificaciones"><Bell size={20} /><i /></button>
            <span className="top-divider" />
            <button className="hospital-selector"><span><small>Hospital General</small><strong>Riobamba</strong></span><ChevronDown size={16} /></button>
          </div>
        </header>

        <div className="page">
          <section className="page-heading">
            <div><span className="eyebrow">{content.eyebrow}</span><h1>{content.title}</h1><p>{content.description}</p></div>
            {active !== "inicio" && (
              <button className="primary-button" onClick={() => openCreate()}><Plus size={18} /> Crear nuevo</button>
            )}
          </section>

          {active === "inicio" && (
            <Dashboard
              schedules={schedules}
              users={users}
              services={services}
              onNavigate={switchModule}
              onCreate={() => { setActive("horarios"); setModal({ type: "horarios" }); }}
            />
          )}
          {active === "horarios" && (
            <SchedulesModule schedules={schedules} shifts={shifts} staff={staff} search={search} onEdit={(item) => openEdit("horarios", item)} onDelete={(id) => removeItem("horarios", id)} />
          )}
          {active === "personal" && (
            <StaffModule items={staff} search={search} onEdit={(item) => openEdit("personal", item)} onDelete={(id) => removeItem("personal", id)} />
          )}
          {active === "usuarios" && (
            <UsersModule items={users} search={search} onEdit={(item) => openEdit("usuarios", item)} onDelete={(id) => removeItem("usuarios", id)} />
          )}
          {active === "servicios" && (
            <ServicesModule items={services} search={search} onEdit={(item) => openEdit("servicios", item)} onDelete={(id) => removeItem("servicios", id)} />
          )}
          {active === "claves" && (
            <ShiftsModule items={shifts} search={search} onEdit={(item) => openEdit("claves", item)} onDelete={(id) => removeItem("claves", id)} />
          )}
        </div>
      </main>

      {modal && <EntityModal type={modal.type} item={modal.item} onClose={() => setModal(null)} onSave={saveItem} />}
      {toast && <div className="toast"><span><Check size={16} /></span>{toast}</div>}
    </div>
  );
}

function Dashboard({ schedules, users, services, onNavigate, onCreate }: {
  schedules: Schedule[]; users: User[]; services: Service[];
  onNavigate: (id: ModuleId) => void; onCreate: () => void;
}) {
  const cards = [
    { label: "Personal activo", value: "62", detail: "4 servicios", icon: Users, tone: "blue" },
    { label: "Horarios del mes", value: String(schedules.length), detail: "1 pendiente de revisión", icon: CalendarDays, tone: "violet" },
    { label: "Cobertura general", value: "94%", detail: "+2.4% vs. mes anterior", icon: ClipboardCheck, tone: "green" },
    { label: "Horas planificadas", value: "7.448", detail: "Agosto 2026", icon: Clock3, tone: "orange" },
  ];
  const roles = [
    { name: "Administrador", description: "Configuración total, usuarios y catálogos", count: users.filter((user) => user.role === "Administrador").length, icon: ShieldCheck },
    { name: "Supervisor", description: "Revisa, valida y aprueba horarios", count: users.filter((user) => user.role === "Supervisor").length, icon: Eye },
    { name: "Jefe de enfermería", description: "Crea horarios y gestiona su servicio", count: users.filter((user) => user.role === "Jefe de enfermería").length, icon: Stethoscope },
  ];

  return (
    <>
      <div className="stat-grid">
        {cards.map(({ label, value, detail, icon: Icon, tone }) => (
          <article className="stat-card" key={label}>
            <div className={`stat-icon ${tone}`}><Icon size={21} /></div>
            <span>{label}</span><strong>{value}</strong><small>{detail}</small>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel schedule-summary">
          <div className="panel-heading">
            <div><h2>Horarios recientes</h2><p>Estado de la planificación actual</p></div>
            <button className="text-button" onClick={() => onNavigate("horarios")}>Ver todos <ChevronRight size={16} /></button>
          </div>
          <div className="schedule-list">
            {schedules.map((schedule) => (
              <button key={schedule.id} onClick={() => onNavigate("horarios")}>
                <div className="date-block"><strong>{schedule.period.slice(0, 3).toUpperCase()}</strong><span>26</span></div>
                <div className="schedule-info"><strong>{schedule.service}</strong><span>{schedule.name}</span></div>
                <StatusBadge value={schedule.status} />
                <div className="coverage"><span>{schedule.coverage}% cobertura</span><i><b style={{ width: `${schedule.coverage}%` }} /></i></div>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
          <button className="outline-button full" onClick={onCreate}><Plus size={17} /> Crear horario mensual</button>
        </section>
        <section className="panel roles-panel">
          <div className="panel-heading"><div><h2>Perfiles del sistema</h2><p>Accesos y responsabilidades</p></div></div>
          <div className="role-list">
            {roles.map(({ name, description, count, icon: Icon }) => (
              <button key={name} onClick={() => onNavigate("usuarios")}>
                <span className="role-icon"><Icon size={20} /></span>
                <span><strong>{name}</strong><small>{description}</small></span>
                <b>{count}</b>
              </button>
            ))}
          </div>
          <div className="service-note"><Hospital size={18} /><span><strong>{services.length} servicios configurados</strong><small>Todos con responsables asignados</small></span></div>
        </section>
      </div>
      <section className="panel activity-panel">
        <div className="panel-heading"><div><h2>Actividad reciente</h2><p>Últimos cambios realizados en el sistema</p></div><button className="filter-button">Esta semana <ChevronDown size={15} /></button></div>
        <div className="activity-row">
          <span className="activity-avatar purple">KP</span><div><strong>Karina Pilamunga</strong> actualizó el horario de <b>UCI — Agosto 2026</b><small>Hace 18 minutos</small></div>
          <StatusBadge value="En revisión" />
        </div>
        <div className="activity-row">
          <span className="activity-avatar green">AN</span><div><strong>Alex Naranjo</strong> aprobó el horario de <b>Emergencia</b><small>Hoy, 09:42</small></div>
          <StatusBadge value="Aprobado" />
        </div>
      </section>
    </>
  );
}

function SchedulesModule({ schedules, shifts, staff, search, onEdit, onDelete }: {
  schedules: Schedule[]; shifts: Shift[]; staff: Staff[]; search: string;
  onEdit: (item: Schedule) => void; onDelete: (id: number) => void;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const filtered = schedules.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  if (view === "list") {
    return (
      <section className="panel">
        <Toolbar view={view} onView={setView} label="Agosto 2026" />
        <DataTable headers={["Horario", "Servicio", "Periodo", "Cobertura", "Estado", "Acciones"]}>
          {filtered.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.service}</td><td>{item.period}</td><td>{item.coverage}%</td><td><StatusBadge value={item.status} /></td><Actions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} /></tr>)}
        </DataTable>
      </section>
    );
  }
  return (
    <section className="panel planner">
      <Toolbar view={view} onView={setView} label="Agosto 2026" />
      <div className="planner-meta">
        <div><span>Servicio</span><strong>Unidad de Cuidados Intensivos (UCI)</strong></div>
        <div><span>Estado</span><StatusBadge value="En revisión" /></div>
        <div className="planner-actions"><button className="outline-button"><FileDown size={16} /> Exportar</button><button className="approve-button"><Check size={16} /> Enviar a aprobación</button></div>
      </div>
      <div className="schedule-grid-wrap">
        <table className="schedule-grid">
          <thead><tr><th className="name-cell">Personal de enfermería</th>{Array.from({ length: 31 }, (_, index) => <th key={index}><b>{index + 1}</b><span>{["S", "D", "L", "M", "M", "J", "V"][(index + 5) % 7]}</span></th>)}<th>Total</th></tr></thead>
          <tbody>
            {staff.map((person, rowIndex) => (
              <tr key={person.id}><td className="name-cell"><strong>{person.name}</strong><span>{person.position}</span></td>
                {rota[rowIndex % rota.length].map((code, index) => {
                  const shift = shifts.find((item) => item.code === code);
                  return <td key={index}><button title={shift?.name} style={{ background: shift?.color }}>{code}</button></td>;
                })}
                <td className="total-cell">{rota[rowIndex % rota.length].reduce((total, code) => total + (shifts.find((shift) => shift.code === code)?.hours || 0), 0)}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="legend"><strong>Claves:</strong>{shifts.slice(0, 6).map((shift) => <span key={shift.id}><i style={{ background: shift.color }} /> <b>{shift.code}</b> {shift.name}</span>)}</div>
    </section>
  );
}

function Toolbar({ view, onView, label }: { view: "grid" | "list"; onView: (value: "grid" | "list") => void; label: string }) {
  return (
    <div className="module-toolbar">
      <div className="period-control"><button><ChevronLeft size={18} /></button><strong>{label}</strong><button><ChevronRight size={18} /></button></div>
      <div className="view-toggle"><button className={view === "grid" ? "selected" : ""} onClick={() => onView("grid")}><Grid2X2 size={16} /> Cuadrícula</button><button className={view === "list" ? "selected" : ""} onClick={() => onView("list")}><Menu size={16} /> Lista</button></div>
    </div>
  );
}

function StaffModule({ items, search, onEdit, onDelete }: { items: Staff[]; search: string; onEdit: (item: Staff) => void; onDelete: (id: number) => void }) {
  const filtered = filterRows(items, search);
  return (
    <section className="panel table-panel">
      <TableIntro count={filtered.length} label="colaboradores registrados" />
      <DataTable headers={["Colaborador", "Documento", "Cargo", "Servicio", "Estado", "Acciones"]}>
        {filtered.map((item) => <tr key={item.id}><td><PersonCell name={item.name} subtitle={`${item.position} · ${item.service}`} /></td><td>{item.document}</td><td>{item.position}</td><td><span className="soft-tag">{item.service}</span></td><td><StatusBadge value={item.status} /></td><Actions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} /></tr>)}
      </DataTable>
    </section>
  );
}

function UsersModule({ items, search, onEdit, onDelete }: { items: User[]; search: string; onEdit: (item: User) => void; onDelete: (id: number) => void }) {
  const filtered = filterRows(items, search);
  return (
    <>
      <div className="permission-grid">
        <PermissionCard icon={ShieldCheck} title="Administrador" text="Acceso total al sistema, usuarios, servicios y catálogos." tone="navy" />
        <PermissionCard icon={Eye} title="Supervisor" text="Revisa, valida y aprueba los horarios de todos los servicios." tone="purple" />
        <PermissionCard icon={Stethoscope} title="Jefe de enfermería" text="Gestiona personal y crea horarios para su servicio asignado." tone="teal" />
      </div>
      <section className="panel table-panel">
        <TableIntro count={filtered.length} label="usuarios con acceso" />
        <DataTable headers={["Usuario", "Perfil", "Servicio", "Estado", "Último acceso", "Acciones"]}>
          {filtered.map((item) => <tr key={item.id}><td><PersonCell name={item.name} subtitle={item.email} /></td><td><RoleBadge value={item.role} /></td><td>{item.service}</td><td><StatusBadge value={item.status} /></td><td>Hoy, 10:24</td><Actions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} /></tr>)}
        </DataTable>
      </section>
    </>
  );
}

function ServicesModule({ items, search, onEdit, onDelete }: { items: Service[]; search: string; onEdit: (item: Service) => void; onDelete: (id: number) => void }) {
  const filtered = filterRows(items, search);
  return (
    <div className="service-grid">
      {filtered.map((item) => (
        <article className="service-card" key={item.id}>
          <div className="service-card-head"><span><Hospital size={21} /></span><StatusBadge value={item.status} /><button><MoreHorizontal /></button></div>
          <h2>{item.name}</h2><p>Responsable: <strong>{item.leader}</strong></p>
          <div className="service-stats"><div><span>Personal</span><strong>{item.staff}</strong></div><div><span>Cobertura</span><strong>{item.coverage}</strong></div></div>
          <div className="card-actions"><button onClick={() => onEdit(item)}><Edit3 size={16} /> Editar</button><button className="delete" onClick={() => onDelete(item.id)}><Trash2 size={16} /> Eliminar</button></div>
        </article>
      ))}
    </div>
  );
}

function ShiftsModule({ items, search, onEdit, onDelete }: { items: Shift[]; search: string; onEdit: (item: Shift) => void; onDelete: (id: number) => void }) {
  const filtered = filterRows(items, search);
  return (
    <section className="panel table-panel">
      <TableIntro count={filtered.length} label="claves configuradas" />
      <DataTable headers={["Clave", "Descripción", "Horario", "Horas", "Vista previa", "Acciones"]}>
        {filtered.map((item) => <tr key={item.id}><td><span className="shift-code" style={{ background: item.color }}>{item.code}</span></td><td><strong>{item.name}</strong></td><td>{item.time}</td><td>{item.hours} horas</td><td><span className="shift-preview" style={{ background: item.color }}><i />{item.code} · {item.name}</span></td><Actions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} /></tr>)}
      </DataTable>
    </section>
  );
}

function EntityModal({ type, item, onClose, onSave }: { type: ModalType; item?: FormState; onClose: () => void; onSave: (form: FormState) => void }) {
  const fields = fieldConfig[type];
  const defaults = Object.fromEntries(fields.map((field) => [field.key, item?.[field.key] || field.options?.[0] || (field.type === "color" ? "#dceeff" : "")]));
  const [form, setForm] = useState<FormState>({ ...defaults, ...(item || {}) });
  const titles: Record<ModalType, string> = { horarios: "horario", personal: "colaborador", usuarios: "usuario", servicios: "servicio", claves: "clave de turno" };
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(form);
  };
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><div><span>{item ? "Editar registro" : "Nuevo registro"}</span><h2 id="modal-title">{item ? "Editar" : "Crear"} {titles[type]}</h2></div><button onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {fields.map((field) => (
              <label key={field.key} className={field.key === "name" || field.key === "email" ? "wide" : ""}>
                <span>{field.label}</span>
                {field.options ? (
                  <select value={form[field.key]} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}>
                    {field.options.map((option) => <option key={option}>{option}</option>)}
                  </select>
                ) : (
                  <input required type={field.type || "text"} value={form[field.key]} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} />
                )}
              </label>
            ))}
          </div>
          <div className="modal-footer"><button type="button" className="cancel-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button"><Check size={17} /> {item ? "Guardar cambios" : "Crear registro"}</button></div>
        </form>
      </div>
    </div>
  );
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <td className="actions"><button onClick={onEdit} title="Editar"><Edit3 size={17} /></button><button className="delete" onClick={onDelete} title="Eliminar"><Trash2 size={17} /></button></td>;
}

function StatusBadge({ value }: { value: string }) {
  const kind = value === "Aprobado" || value === "Activo" ? "success" : value === "En revisión" ? "review" : value === "Inactivo" ? "inactive" : "draft";
  return <span className={`status ${kind}`}><i />{value}</span>;
}

function RoleBadge({ value }: { value: User["role"] }) {
  const icon = value === "Administrador" ? <ShieldCheck size={14} /> : value === "Supervisor" ? <Eye size={14} /> : <Stethoscope size={14} />;
  return <span className={`role-badge ${value.startsWith("Admin") ? "admin" : value.startsWith("Super") ? "supervisor" : "leader"}`}>{icon}{value}</span>;
}

function PersonCell({ name, subtitle }: { name: string; subtitle: string }) {
  const initials = name.split(" ").slice(0, 2).map((word) => word[0]).join("");
  return <div className="person-cell"><span>{initials}</span><div><strong>{name}</strong><small>{subtitle}</small></div></div>;
}

function PermissionCard({ icon: Icon, title, text, tone }: { icon: LucideIcon; title: string; text: string; tone: string }) {
  return <article className={`permission-card ${tone}`}><span><Icon size={22} /></span><div><h3>{title}</h3><p>{text}</p></div><ChevronRight size={19} /></article>;
}

function TableIntro({ count, label }: { count: number; label: string }) {
  return <div className="table-intro"><div><h2>Listado general</h2><p>{count} {label}</p></div><button className="filter-button">Todos los estados <ChevronDown size={15} /></button></div>;
}

function filterRows<T extends object>(items: T[], search: string) {
  const query = search.toLowerCase();
  return items.filter((item) => Object.values(item).some((value) => String(value).toLowerCase().includes(query)));
}
