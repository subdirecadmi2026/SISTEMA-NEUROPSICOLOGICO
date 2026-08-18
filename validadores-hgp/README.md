# Validadores HGP — Egresos y Emergencia

Herramienta **independiente** de calidad de datos para el Hospital General Puyo
(MSP Ecuador). No forma parte de NeuroSys ni del sistema de horarios.

Trabaja en el navegador: carga un Excel/CSV, valida, marca filas revisadas y
exporta los errores. Los datos no se envían a un servidor.

## Validadores

### Egresos hospitalarios
Revisa historia clínica, cédula, sexo, fechas de ingreso/egreso, estada,
diagnóstico CIE-10, condición de egreso y duplicados.

### Emergencia
Revisa triage, tiempos de llegada/atención/salida, diagnóstico CIE-10,
condición de salida, destino de hospitalización o referencia y duplicados.

## Qué puede hacer

- **Exportar errores a Excel/CSV** con fila, paciente, código, dimensión,
  mensaje, valor y estado de revisión.
- **Marcar filas como revisadas** (con nota opcional). La marca queda en este
  navegador y se incluye en la exportación.
- **Puntaje de calidad de datos** (0–100) según completitud, validez,
  consistencia y unicidad. Marcar revisadas no altera el puntaje: mide el
  archivo de origen.

Clasificación: **Excelente** ≥ 95 · **Bueno** ≥ 85 · **Regular** ≥ 70 ·
**Crítico** &lt; 70.

## Uso

```sh
cd validadores-hgp
npm install
npm run dev
```

1. Elija **Egresos hospitalarios** o **Emergencia**.
2. Descargue la plantilla o cargue su Excel/CSV.
3. Revise el puntaje y la lista de hallazgos.
4. Marque filas revisadas.
5. Exporte errores a Excel o CSV.

`npm test` ejecuta el motor de validación y el puntaje.
`npm run build` genera el sitio estático.

Para Vercel, use `validadores-hgp` como directorio raíz.
