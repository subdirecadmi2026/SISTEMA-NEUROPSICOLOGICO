export type PatientStatus =
  | "Activo"
  | "Seguimiento"
  | "Evaluación"
  | "Alta"
  | "Inactivo";

export type Patient = {
  id: string;
  recordNumber: string;
  initials: string;
  name: string;
  document: string;
  age: number;
  diagnosis: string;
  professional: string;
  lastVisit: string;
  nextVisit: string;
  status: PatientStatus;
  color: string;
};

export const patients: Patient[] = [
  {
    id: "NW-2026-00124",
    recordNumber: "NW-2026-00124",
    initials: "MG",
    name: "Mateo Guerrero",
    document: "1750234198",
    age: 9,
    diagnosis: "TDAH, presentación combinada",
    professional: "Dra. Ana Pérez",
    lastVisit: "14 jul 2026",
    nextVisit: "17 jul, 09:00",
    status: "Activo",
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "NW-2026-00108",
    recordNumber: "NW-2026-00108",
    initials: "SA",
    name: "Sofía Andrade",
    document: "1726381045",
    age: 7,
    diagnosis: "Trastorno del espectro autista",
    professional: "Ps. Carlos Mena",
    lastVisit: "15 jul 2026",
    nextVisit: "20 jul, 10:30",
    status: "Activo",
    color: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    id: "NW-2026-00096",
    recordNumber: "NW-2026-00096",
    initials: "JT",
    name: "Julián Torres",
    document: "1751034872",
    age: 12,
    diagnosis: "Trastorno del desarrollo del lenguaje",
    professional: "Lic. María León",
    lastVisit: "10 jul 2026",
    nextVisit: "16 jul, 11:00",
    status: "Seguimiento",
    color: "bg-amber-100 text-amber-700",
  },
  {
    id: "NW-2026-00081",
    recordNumber: "NW-2026-00081",
    initials: "VR",
    name: "Valentina Ruiz",
    document: "1729046317",
    age: 28,
    diagnosis: "Evaluación cognitiva en curso",
    professional: "Dra. Ana Pérez",
    lastVisit: "8 jul 2026",
    nextVisit: "15 jul, 11:30",
    status: "Evaluación",
    color: "bg-violet-100 text-violet-700",
  },
  {
    id: "NW-2026-00067",
    recordNumber: "NW-2026-00067",
    initials: "EM",
    name: "Emilia Morales",
    document: "1752094381",
    age: 6,
    diagnosis: "Dificultades de regulación emocional",
    professional: "Ps. Carlos Mena",
    lastVisit: "7 jul 2026",
    nextVisit: "21 jul, 08:30",
    status: "Activo",
    color: "bg-emerald-100 text-emerald-700",
  },
];

export const featuredPatient = {
  ...patients[0],
  birthDate: "18 de marzo de 2017",
  bloodType: "O+",
  phone: "+593 99 428 1620",
  email: "familia.guerrero@correo.com",
  guardian: "María Elena Guerrero (madre)",
  insurance: "Particular",
  allergies: "Ninguna registrada",
  medications: "Metilfenidato 10 mg",
  attendance: 94,
};
