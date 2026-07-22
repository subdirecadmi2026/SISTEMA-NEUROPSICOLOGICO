# Sistema de Horarios — Hospital General Puyo

Aplicación web para elaborar el **cuadro de trabajo mensual** del Hospital General Puyo (MSP Ecuador), alineada a las plantillas institucionales.

## Plantillas

### Enfermería (Gestión de Cuidados de Enfermería)
Claves: **A1, A2, E2, E5, D1, N1, EN, HA, M, T, MN, MT** + ausencias (V, F, PS, CD, HL, CM, L, P).

Columnas: N°, FUN, Nombres, Relación laboral, Código, días 1–31, turnos, horas planificadas, vacaciones, horas médicas, violencia doméstica, lactancia, extras, **total horas pagadas**.

### Médico (Talento Humano / cuadro de trabajo)
Claves: **X, PT1, PT2, CE, HA, HM, HD, HE, A2** · Áreas **H, E, QX, GD, IN** · Ausencias **C, V, INC, CAP, CO, L, IND, P, F**.

## Pestañas (como la plantilla Sheets)

| Pestaña | Contenido |
|---------|-----------|
| **HORARIO** | Cuadro mensual editable |
| **CLAVES** | Tabla completa de códigos y horarios |
| **DISTRIBUCIÓN** | Cobertura diaria (personal y horas) |
| **CONTINGENCIA** | Plan y personal de respaldo |

## Funciones

- Pintar turnos con claves oficiales
- Guardar / cargar horarios en el navegador (`localStorage`)
- Exportar Excel con hojas **HORARIO**, **CLAVES** y **DISTRIBUCION**
- Imprimir en horizontal (landscape)
- Logo MSP en encabezado
- Firmas institucionales editables

## Uso

```bash
cd horarios-hgp
npm install
npm run dev
```
