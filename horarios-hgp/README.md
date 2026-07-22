# Sistema de Horarios — Hospital General Puyo

Aplicación web para elaborar el **cuadro de trabajo mensual** del Hospital General Puyo (MSP Ecuador), alineada a las plantillas institucionales.

## Plantillas

### Enfermería (Gestión de Cuidados de Enfermería)
Claves: **A1, A2, E2, E5, D1, N1, EN, HA, M, T, MN, MT** + ausencias (V, F, PS, CD, HL, CM, L, P).

Columnas: N°, FUN, Nombres, Relación laboral, Código, días 1–31, turnos planificados, horas planificadas, vacaciones.

Secciones: Enfermeras/os, Internos, Auxiliares.

### Médico (Talento Humano / cuadro de trabajo)
Claves de duración: **X, PT1, PT2, CE, HA, HM, HD, HE, A2**.  
Áreas: **H, E, QX, GD, IN**.  
Ausencias: **C, V, INC, CAP, CO, L, IND, P, F**.

Exportación Excel con hojas **HORARIO** y **CLAVES** (como la plantilla Google Sheets).

## Uso

```bash
cd horarios-hgp
npm install
npm run dev
```

1. Elija **Enfermería** o **Médico**
2. Configure mes, año, servicio y jefe
3. Seleccione una clave y pinte el calendario
4. Exporte a Excel o imprima

Firmas por defecto según plantillas HGP (Dirección Asistencial, Subdirección Médica, Talento Humano).
