import * as XLSX from "xlsx";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "archivos");

const EGRESOS_HEADERS = [
  "Historia clínica",
  "Cédula",
  "Apellidos y nombres",
  "Sexo",
  "Fecha de nacimiento",
  "Edad",
  "Fecha de ingreso",
  "Fecha de egreso",
  "Días de estada",
  "Especialidad",
  "Servicio",
  "Diagnóstico principal",
  "Diagnósticos secundarios",
  "Condición de egreso",
  "Tipo de egreso",
  "Procedimiento",
  "Médico",
  "Establecimiento",
];

const EMERGENCIA_HEADERS = [
  "Historia clínica",
  "Cédula",
  "Apellidos y nombres",
  "Sexo",
  "Edad",
  "Fecha/hora de llegada",
  "Fecha/hora de atención",
  "Fecha/hora de salida",
  "Triage",
  "Motivo de consulta",
  "Diagnóstico",
  "Condición de salida",
  "Destino",
  "Especialidad",
  "Médico",
  "Establecimiento",
];

const HOSPITAL = "Hospital General Puyo";

const egresoBase = {
  historiaClinica: "HC-16001",
  cedula: "1600123457",
  apellidosNombres: "GUERRERO TAPIA MATEO",
  sexo: "H",
  fechaNacimiento: "18/03/2017",
  edad: "9",
  fechaIngreso: "02/07/2026",
  fechaEgreso: "06/07/2026",
  diasEstada: "4",
  especialidad: "Pediatría",
  servicio: "Hospitalización Pediatría",
  diagnosticoPrincipal: "J18.9",
  diagnosticosSecundarios: "J06.9",
  condicionEgreso: "Vivo",
  tipoEgreso: "Alta médica",
  procedimiento: "",
  medico: "Dra. Ana Pérez",
  establecimiento: HOSPITAL,
};

const emergenciaBase = {
  historiaClinica: "HC-EM-100",
  cedula: "1600123457",
  apellidosNombres: "GUERRERO TAPIA MATEO",
  sexo: "H",
  edad: "9",
  fechaHoraLlegada: "15/07/2026 08:10",
  fechaHoraAtencion: "15/07/2026 08:25",
  fechaHoraSalida: "15/07/2026 10:40",
  triage: "Amarillo",
  motivoConsulta: "Fiebre y dificultad respiratoria",
  diagnostico: "J06.9",
  condicionSalida: "Alta",
  destino: "",
  especialidad: "Emergencia",
  medico: "Dr. Carlos Mena",
  establecimiento: HOSPITAL,
};

const EGRESOS_KEYS = [
  "historiaClinica",
  "cedula",
  "apellidosNombres",
  "sexo",
  "fechaNacimiento",
  "edad",
  "fechaIngreso",
  "fechaEgreso",
  "diasEstada",
  "especialidad",
  "servicio",
  "diagnosticoPrincipal",
  "diagnosticosSecundarios",
  "condicionEgreso",
  "tipoEgreso",
  "procedimiento",
  "medico",
  "establecimiento",
];

const EMERGENCIA_KEYS = [
  "historiaClinica",
  "cedula",
  "apellidosNombres",
  "sexo",
  "edad",
  "fechaHoraLlegada",
  "fechaHoraAtencion",
  "fechaHoraSalida",
  "triage",
  "motivoConsulta",
  "diagnostico",
  "condicionSalida",
  "destino",
  "especialidad",
  "medico",
  "establecimiento",
];

async function writeSheet(fileName, sheetName, headers, keys, rows) {
  const workbook = XLSX.utils.book_new();
  const data = [headers, ...rows.map((row) => keys.map((key) => row[key] ?? ""))];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  const target = path.join(outDir, fileName);
  XLSX.writeFile(workbook, target);
  return target;
}

const egresosRows = [
  { ...egresoBase },
  {
    ...egresoBase,
    historiaClinica: "HC-16002",
    cedula: "1600345670",
    apellidosNombres: "ANDRADE LOPEZ SOFIA",
    sexo: "M",
    fechaNacimiento: "10/01/2019",
    edad: "7",
    diagnosticoPrincipal: "F84.0",
  },
  {
    ...egresoBase,
    historiaClinica: "HC-16003",
    cedula: "1600123458",
    apellidosNombres: "TORRES JULIAN",
    fechaNacimiento: "15/04/2014",
    edad: "12",
    diagnosticoPrincipal: "G40.9",
  },
  {
    ...egresoBase,
    historiaClinica: "HC-16004",
    cedula: "1600345670",
    apellidosNombres: "RUIZ VALENTINA",
    sexo: "M",
    fechaIngreso: "10/07/2026",
    fechaEgreso: "08/07/2026",
    diagnosticoPrincipal: "N39.0",
  },
  {
    ...egresoBase,
    historiaClinica: "HC-16005",
    apellidosNombres: "MORALES EMILIA",
    sexo: "M",
    diagnosticoPrincipal: "",
  },
  {
    ...egresoBase,
    historiaClinica: "HC-16006",
    apellidosNombres: "SALAZAR PEDRO",
    sexo: "H",
    fechaNacimiento: "02/02/1992",
    edad: "34",
    diagnosticoPrincipal: "O80",
    especialidad: "Ginecología",
  },
  {
    ...egresoBase,
    historiaClinica: "HC-16007",
    apellidosNombres: "MENA CARLOS",
    diagnosticoPrincipal: "GRIPE",
  },
  { ...egresoBase },
  {
    ...egresoBase,
    historiaClinica: "HC-16008",
    fechaEgreso: "20/08/2027",
    apellidosNombres: "CASTILLO LUCIA",
    sexo: "M",
  },
  {
    ...egresoBase,
    historiaClinica: "HC-16009",
    apellidosNombres: "Paredes Diego",
    fechaNacimiento: "11/11/1957",
    edad: "68",
    condicionEgreso: "Fallecido",
    diagnosticoPrincipal: "I21.9",
    especialidad: "Medicina Interna",
  },
  {
    ...egresoBase,
    historiaClinica: "HC-16010",
    apellidosNombres: "",
    sexo: "H",
    fechaIngreso: "01/01/2026",
    fechaEgreso: "03/01/2026",
    diagnosticoPrincipal: "A09",
    condicionEgreso: "Vivo",
  },
  {
    ...egresoBase,
    historiaClinica: "HC-16011",
    apellidosNombres: "VARGAS ELENA",
    sexo: "M",
    fechaIngreso: "01/01/2025",
    fechaEgreso: "20/02/2026",
    diasEstada: "12",
    diagnosticoPrincipal: "I10",
  },
  {
    ...egresoBase,
    historiaClinica: "HC-16012",
    apellidosNombres: "NAPO WILSON",
    sexo: "X",
    diagnosticoPrincipal: "K29.7",
  },
  {
    ...egresoBase,
    historiaClinica: "HC-16013",
    cedula: "",
    apellidosNombres: "SHIGUANGO MARIA",
    sexo: "M",
    diagnosticoPrincipal: "E11.9",
  },
];

const emergenciaRows = [
  { ...emergenciaBase },
  {
    ...emergenciaBase,
    historiaClinica: "HC-EM-101",
    cedula: "1600345670",
    apellidosNombres: "ANDRADE LOPEZ SOFIA",
    sexo: "M",
    triage: "Verde",
    diagnostico: "K59.1",
  },
  {
    ...emergenciaBase,
    historiaClinica: "HC-EM-102",
    cedula: "0999999999",
    apellidosNombres: "TORRES JULIAN",
    triage: "Naranja",
    diagnostico: "S06.0",
  },
  {
    ...emergenciaBase,
    historiaClinica: "HC-EM-103",
    apellidosNombres: "RUIZ VALENTINA",
    sexo: "M",
    fechaHoraLlegada: "16/07/2026 21:00",
    fechaHoraAtencion: "16/07/2026 20:10",
    fechaHoraSalida: "16/07/2026 22:00",
    diagnostico: "N39.0",
  },
  {
    ...emergenciaBase,
    historiaClinica: "HC-EM-104",
    apellidosNombres: "MORALES EMILIA",
    sexo: "M",
    diagnostico: "",
    triage: "Rojo",
  },
  {
    ...emergenciaBase,
    historiaClinica: "HC-EM-105",
    apellidosNombres: "SALAZAR PEDRO",
    sexo: "H",
    edad: "34",
    diagnostico: "O80",
    triage: "Amarillo",
  },
  {
    ...emergenciaBase,
    historiaClinica: "HC-EM-106",
    fechaHoraLlegada: "12/07/2026 01:00",
    fechaHoraAtencion: "12/07/2026 01:20",
    fechaHoraSalida: "14/07/2026 09:00",
    triage: "Amarillo",
    diagnostico: "R10.4",
  },
  {
    ...emergenciaBase,
    historiaClinica: "HC-EM-107",
    condicionSalida: "Hospitalización",
    destino: "",
    triage: "Naranja",
    diagnostico: "J18.1",
  },
  { ...emergenciaBase },
  {
    ...emergenciaBase,
    historiaClinica: "HC-EM-108",
    triage: "Violeta",
    diagnostico: "R55",
  },
  {
    ...emergenciaBase,
    historiaClinica: "HC-EM-109",
    fechaHoraLlegada: "10/07/2026 07:00",
    fechaHoraAtencion: "10/07/2026 07:15",
    fechaHoraSalida: "13/07/2026 12:00",
    triage: "Rojo",
    diagnostico: "I46.9",
    condicionSalida: "Fallecido",
  },
  {
    ...emergenciaBase,
    historiaClinica: "HC-EM-110",
    apellidosNombres: "",
    diagnostico: "M54.5",
    triage: "Verde",
  },
];

await mkdir(outDir, { recursive: true });

const written = await Promise.all([
  writeSheet("plantilla-egresos-hgp.xlsx", "Egresos", EGRESOS_HEADERS, EGRESOS_KEYS, []),
  writeSheet(
    "plantilla-emergencia-hgp.xlsx",
    "Emergencia",
    EMERGENCIA_HEADERS,
    EMERGENCIA_KEYS,
    [],
  ),
  writeSheet(
    "demo-egresos-hgp.xlsx",
    "Egresos",
    EGRESOS_HEADERS,
    EGRESOS_KEYS,
    egresosRows,
  ),
  writeSheet(
    "demo-emergencia-hgp.xlsx",
    "Emergencia",
    EMERGENCIA_HEADERS,
    EMERGENCIA_KEYS,
    emergenciaRows,
  ),
]);

console.log(written.map((file) => path.relative(root, file)).join("\n"));
