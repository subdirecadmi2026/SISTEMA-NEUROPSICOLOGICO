"use client";

import {
  ArrowRight,
  Database,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AppRole, ProfileRow } from "@/lib/database.types";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { NursingControlApp } from "./nursing-control-app";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  organizationId?: string;
  serviceId?: string | null;
  demo?: boolean;
};

const demoUsers: CurrentUser[] = [
  { id: "demo-admin", name: "Ana Torres", email: "admin@hospital.gob.ec", role: "Administrador", demo: true },
  { id: "demo-supervisor", name: "Alex Naranjo", email: "supervisor@hospital.gob.ec", role: "Supervisor", demo: true },
  { id: "demo-leader", name: "Karina Pilamunga", email: "jefe.uci@hospital.gob.ec", role: "Jefe de enfermería", demo: true },
];

export function AuthenticatedApp() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;

    const loadUser = async (userId: string) => {
      const { data } = await client
        .from("profiles")
        .select("id, organization_id, service_id, full_name, email, role, is_active")
        .eq("id", userId)
        .single<ProfileRow>();

      if (data?.is_active) {
        setCurrentUser({
          id: data.id,
          name: data.full_name,
          email: data.email,
          role: data.role,
          organizationId: data.organization_id,
          serviceId: data.service_id,
        });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    };

    client.auth.getSession().then(({ data }) => {
      if (data.session) void loadUser(data.session.user.id);
      else setLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (session) void loadUser(session.user.id);
      else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    const client = getSupabase();
    if (client && !currentUser?.demo) await client.auth.signOut();
    setCurrentUser(null);
  };

  if (loading) {
    return <div className="auth-loading"><LoaderCircle className="spin" /><span>Conectando de forma segura…</span></div>;
  }

  if (!currentUser) {
    return <LoginScreen onDemoLogin={setCurrentUser} />;
  }

  return <NursingControlApp currentUser={currentUser} onLogout={logout} />;
}

function LoginScreen({ onDemoLogin }: { onDemoLogin: (user: CurrentUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [fullName, setFullName] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const client = getSupabase();
    if (!client) {
      setError("Supabase aún no está configurado. Usa uno de los perfiles de demostración.");
      return;
    }

    setSubmitting(true);
    setError("");
    const result = registering
      ? await client.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      : await client.auth.signInWithPassword({ email, password });
    setSubmitting(false);

    if (result.error) setError(result.error.message);
    else if (registering && !result.data.session) {
      setError("Revisa tu correo para confirmar la cuenta antes de iniciar sesión.");
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand">
          <span><Stethoscope size={27} /></span>
          <div><strong>Control</strong><small>ENFERMERÍA</small></div>
        </div>
        <div className="login-message">
          <span className="login-eyebrow">GESTIÓN HOSPITALARIA</span>
          <h1>Planifica mejor.<br />Cuida mejor.</h1>
          <p>Organiza los horarios del personal de enfermería, garantiza la cobertura y mantén a tu equipo coordinado.</p>
        </div>
        <div className="login-security"><ShieldCheck size={20} /><span><strong>Información protegida</strong><small>Acceso seguro y registro de auditoría</small></span></div>
        <div className="login-orb orb-one" />
        <div className="login-orb orb-two" />
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="mobile-login-brand"><Stethoscope size={22} /><strong>Control Enfermería</strong></div>
          <span className="login-kicker">{registering ? "CONFIGURA TU HOSPITAL" : "BIENVENIDO DE NUEVO"}</span>
          <h2>{registering ? "Crear primera cuenta" : "Iniciar sesión"}</h2>
          <p>{registering ? "La primera cuenta registrada será administradora." : "Ingresa tus credenciales para acceder al sistema."}</p>

          <form className="login-form" onSubmit={submit}>
            {registering && (
              <label><span>Nombre completo</span><div><Stethoscope size={17} /><input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nombres y apellidos" /></div></label>
            )}
            <label><span>Correo institucional</span><div><Mail size={17} /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@hospital.gob.ec" /></div></label>
            <label><span>Contraseña</span><div><LockKeyhole size={17} /><input required minLength={8} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar contraseña">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {error && <div className="auth-error">{error}</div>}
            <button className="login-submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" size={18} /> : <><span>{registering ? "Crear cuenta" : "Ingresar al sistema"}</span><ArrowRight size={18} /></>}</button>
          </form>

          {isSupabaseConfigured ? (
            <button className="register-toggle" onClick={() => { setRegistering(!registering); setError(""); }}>
              {registering ? "Ya tengo una cuenta" : "Configurar la primera cuenta"}
            </button>
          ) : (
            <div className="demo-access">
              <div className="demo-divider"><span>ACCESO DE DEMOSTRACIÓN</span></div>
              <div className="demo-buttons">
                {demoUsers.map((user) => (
                  <button key={user.id} onClick={() => onDemoLogin(user)}>
                    <span className={`demo-role-icon ${user.role === "Administrador" ? "admin" : user.role === "Supervisor" ? "supervisor" : "leader"}`}>
                      {user.role === "Administrador" ? <ShieldCheck size={17} /> : user.role === "Supervisor" ? <Eye size={17} /> : <Stethoscope size={17} />}
                    </span>
                    <span><strong>{user.role}</strong><small>{user.name}</small></span>
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
              <div className="demo-notice"><Database size={15} /><span>Conecta las variables de Supabase para activar datos reales.</span></div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
