# Protocolo de pérdida / indisponibilidad de Historia Clínica

**Establecimiento:** Centro Neuroterapéutico Integral Ñampi Wasi  
**Sistema:** NeuroSys (historia clínica electrónica)  
**Código de expediente:** `NW-AAAA-#####`  
**Soporte principal:** electrónico (base de datos Supabase / PostgreSQL)  
**Versión:** 1.0  
**Fecha de elaboración:** 2026-07-22  

### Base normativa
- Constitución: Arts. 66.11, 66.19, 92, 362  
- Ley Orgánica de Salud: Art. 7 lit. f)  
- Acuerdo MSP **00115-2021** (HCU): Arts. 13–19 (eventos adversos)  
- Acuerdo MSP **00005216-A** (información confidencial): Arts. 8, 11, 14–20, 28–37  
- Normas de Control Interno CGE: Plan de Contingencias **410-11**  
- Acuerdo MSP **4934** (código único de HCU)

---

## 1. Objetivo

Garantizar la **disponibilidad, integridad y confidencialidad** de la historia clínica electrónica ante pérdida, borrado indebido, corrupción, indisponibilidad del sistema o evento adverso, sin interrumpir la atención y respetando los derechos del paciente.

## 2. Alcance

Aplica a todo el Centro Ñampi Wasi y al sistema NeuroSys, incluyendo:

- Expedientes de pacientes (`patients` / N.º `NW-…`)
- Notas clínicas firmadas y borradores (`clinical_notes`)
- Evaluaciones, planes terapéuticos, informes clínicos
- Citas, comunicaciones con consentimiento y auditoría (`audit_logs`)
- Respaldos (PITR / copias diarias de Supabase) y entornos de restauración

**No contempla archivo físico central.** Si existiera documentación papel auxiliar (consentimientos firmados en físico, informes impresos), se trata como anexo y se registra en el Acta 03.

## 3. Definiciones operativas

| Término | Definición en Ñampi Wasi |
|---|---|
| **Pérdida unitaria** | Un expediente o nota no localizable / borrada lógicamente (`deleted_at`) / inaccesible |
| **Pérdida parcial** | Varios expedientes o un módulo afectado (p. ej. solo notas) |
| **Pérdida / caída total** | Sistema NeuroSys o base de datos no disponible; restauración desde respaldo |
| **Archivo recuperado** | Conjunto de registros restaurados desde backup/PITR o soft-delete revertido |
| **Reapertura de registro** | Continuidad asistencial con nota administrativa de reconstrucción mientras se restaura |
| **Custodio institucional** | El Centro; durante la atención, el profesional de la cadena sanitaria |

## 4. Responsables

| Rol | Quién (Ñampi Wasi) | Responsabilidad |
|---|---|---|
| Autoridad del establecimiento | Dirección clínica / Gerencia | Autoriza restauración, aprueba actas e informe final |
| Custodia de HCU electrónica | Dirección clínica + Admin NeuroSys | Inventario, soft-delete, acceso, confidencialidad |
| Tecnología / contingencia | Responsable TI / Admin Supabase | Backup, PITR, restore, RPO/RTO (CGE 410-11) |
| Continuidad asistencial | Profesionales tratantes | Registro clínico en modo contingencia |
| Calidad y seguridad | Comité de Calidad y Seguridad del Paciente (o quien haga sus veces) | Activa plan, seguimiento correctivo |
| Investigación administrativa | Talento Humano / Asesoría | Responsabilidades y sanciones (Art. 37 Acdo. 5216-A) |

## 5. Prevención (obligatoria)

1. Respaldos Supabase activos (diario + PITR) y **prueba de restauración** al menos trimestral.  
2. Notas firmadas **inmutables**; correcciones solo con nueva nota.  
3. Soft-delete (no borrado duro) de datos clínicos.  
4. Accesos por roles (RLS); claves personales; sin registro público.  
5. Revisión periódica de `audit_logs` por Dirección.  
6. Cláusula de confidencialidad en contratos del personal.  
7. Documentos impresos con leyenda **CONFIDENCIAL**; no dejarlos a la vista.

---

## 6. Clasificación del evento

| Código | Tipo | Ejemplo |
|---|---|---|
| **E1** | Extravío / indisponibilidad unitaria | No se encuentra `NW-2026-00124` o una evolución firmada |
| **E2** | Borrado lógico / error de usuario | Paciente o nota con `deleted_at` |
| **E3** | Corrupción o fallo parcial de datos | Módulo de notas o informes inconsistente |
| **E4** | Indisponibilidad del sistema | Caída de NeuroSys / Supabase / Vercel |
| **E5** | Evento adverso mayor | Desastre, ataque, pérdida total de instancia |

---

## 7. Procedimiento operativo

### 7.1 Detección y contención (inmediato — 0 a 30 min)

1. Quien detecte el evento completa el **Acta 01 – Detección** y notifica a:
   - Dirección clínica  
   - Admin NeuroSys / TI  
2. **No** recrear el expediente ni “arreglar” datos hasta autorización.  
3. Contener: restringir accesos sospechosos; conservar evidencias (`audit_logs`, capturas, hora UTC/America/Guayaquil).  
4. Si hay atención en curso: activar **modo contingencia** (sección 7.4).

### 7.2 Activación del plan (Art. 13 Acdo. 00115-2021)

1. Dirección activa el plan de contingencia.  
2. Se convoca al Comité de Calidad y Seguridad del Paciente (o equivalente).  
3. TI clasifica el evento (E1–E5) y estima RPO/RTO.  
4. Se abre expediente interno con N.º de incidente:  
   `INC-HC-AAAA-###` (ej. `INC-HC-2026-001`).

### 7.3 Diagnóstico e inventario (Arts. 16–17)

1. Completar **Acta 02 – Diagnóstico e inventario**.  
2. Verificar en NeuroSys / Supabase:
   - Existencia del paciente y `clinical_record_number`
   - Notas (`draft` / `signed`) y `deleted_at`
   - Informes, evaluaciones, planes, citas
   - Últimos movimientos en `audit_logs`
3. Clasificar registros: **disponible / recuperable / perdido / deteriorado (corrupto)**.  
4. Conformar listado de **archivo recuperado** (registros restaurables).

### 7.4 Continuidad de la atención (Art. 15)

Mientras el sistema o el expediente no esté disponible:

1. Atender al paciente con identificación por cédula/pasaporte (Acuerdo 4934).  
2. Registrar la atención en **Anexo A – Formulario de contingencia** (papel o documento digital temporal **CONFIDENCIAL**).  
3. Al recuperar el sistema, transcribir a NeuroSys como nueva evolución, citando el N.º de incidente y adjuntando referencia al formulario.  
4. No inventar datos clínicos; marcar lagunas expresamente.

### 7.5 Recuperación técnica (Arts. 17–19 + CGE 410-11)

| Situación | Acción |
|---|---|
| Soft-delete (E2) | Revertir `deleted_at` con autorización de Dirección; dejar nota en audit / Acta 03 |
| Pérdida parcial (E1/E3) | Restaurar tablas/registros desde backup puntual o PITR a entorno de staging, validar, promover |
| Caída total (E4/E5) | Restore completo desde último backup íntegro; el sistema **continúa desde el estado restaurado** (equivalente Art. 18/19 electrónico) |
| Datos no recuperables | Reconstrucción documental (sección 7.6) + reapertura con nota administrativa |

Completar **Acta 03 – Recuperación / restauración**.

**Regla de numeración electrónica (Ñampi Wasi):**  
No se reinicia la serie `NW-`. Se mantiene la secuencia. Solo si un expediente es irrecuperable y se debe abrir uno nuevo por mandato de Dirección, se genera el siguiente `NW-AAAA-#####` correlativo y se deja **cruzado** el número anterior en el Acta 03 y en la primera nota administrativa.

### 7.6 Reconstrucción documental

Fuentes permitidas (verificables):

- Copias certificadas o informes entregados al paciente/familiar (Arts. 28–32 Acdo. 5216-A)  
- Referencias, resultados de apoyo diagnóstico externos  
- Formularios de contingencia (Anexo A)  
- Facturación / agenda / comunicaciones con consentimiento  
- Declaración del profesional tratante (hechos de su conocimiento directo)

Completar **Acta 04 – Reconstrucción**.

### 7.7 Comunicación al paciente (cuando aplique)

Si se afectó el derecho de acceso o hubo riesgo a datos personales (CRE 66.19 / 92):

1. Informar al titular o representante, en entorno privado.  
2. Registrar en **Acta 05 – Notificación al usuario**.  
3. Entregar copia certificada de lo recuperado en máximo **48 horas** desde la solicitud (Art. 30 Acdo. 5216-A), salvo emergencia.

### 7.8 Cierre y mejora

1. **Acta 06 – Informe de cierre** con causas, alcance, pacientes, acciones, plazos.  
2. Medidas correctivas: accesos, backups, capacitación, controles.  
3. Si hay responsabilidad: proceso interno + Art. 37 Acdo. 5216-A.  
4. Archivar el expediente `INC-HC-…` (digital, carpeta restringida) mínimo el tiempo que indique la política documental institucional / MSP.

---

## 8. Tiempos máximos de respuesta

| Fase | Tiempo máximo |
|---|---|
| Contención y notificación interna | 30 minutos |
| Clasificación E1–E5 y activación | 2 horas |
| Modo contingencia asistencial | Inmediato si hay paciente en atención |
| Restore E4 (indisponibilidad) | Según RTO definido (meta sugerida ≤ 4 h laborables) |
| Inventario E1–E3 | 1 día hábil |
| Informe de cierre | 5 días hábiles desde resolución técnica |
| Copia al paciente (si solicita) | 48 horas |

---

## 9. Flujograma resumido

```text
Detección → Acta 01 → Contención + Contingencia asistencial
        → Activación Art.13 → Acta 02 (inventario)
        → ¿Recuperable?
              Sí → Restore / undelete → Acta 03 → Validación clínica
              No → Reconstrucción → Acta 04 → Reapertura NW
        → Notificación usuario (si aplica) → Acta 05
        → Cierre → Acta 06 → Acciones correctivas
```

---

# ANEXOS — FORMATOS DE ACTA (listos para usar)

> Imprimir a doble cara o completar en PDF. Marcar **CONFIDENCIAL** en el margen superior.  
> Conservar firmas (físicas o electrónicas) en el expediente del incidente.

---

## ACTA 01 — Detección y notificación de pérdida / indisponibilidad

```
CONFIDENCIAL
────────────────────────────────────────────────────────────
CENTRO NEUROTERAPÉUTICO INTEGRAL ÑAMPI WASI
Acta 01 – Detección y notificación
Protocolo de pérdida de Historia Clínica (NeuroSys)
────────────────────────────────────────────────────────────
N.º incidente: INC-HC-________-______     Fecha: __/__/______
Hora detección: __:__   (zona: America/Guayaquil)

1. QUIEN DETECTA
Nombre: ________________________________  Cargo: ______________
Cédula: ____________________  Firma: _________________________

2. TIPO DE EVENTO (marcar)
[ ] E1 Unitaria   [ ] E2 Soft-delete   [ ] E3 Parcial
[ ] E4 Sistema caído   [ ] E5 Evento mayor / total
Descripción breve:
_______________________________________________________________
_______________________________________________________________

3. EXPEDIENTE(S) AFECTADO(S) CONOCIDO(S)
N.º HC (NW-…): ________________  Paciente (iniciales o código*): ______
*En enfermedades sensibles, usar solo cédula/código (Art. 13 Acdo. 5216-A).
Otros N.º: _____________________________________________________

4. ÚLTIMO ESTADO CONOCIDO
Última atención / nota: ______________  Profesional: ______________
¿Había préstamo, exportación o impresión? [ ] Sí [ ] No
Detalle: _______________________________________________________

5. CONTENCIÓN INMEDIATA REALIZADA
[ ] Área/acceso restringido  [ ] Captura de evidencia  [ ] No se alteró data
[ ] Modo contingencia asistencial activado
[ ] Otro: ______________________________________________________

6. NOTIFICACIONES
Dirección clínica: ______ hora __:__   Nombre: ________________
TI / Admin NeuroSys: ____ hora __:__   Nombre: ________________
Comité Calidad: _________ hora __:__   Nombre: ________________

7. OBSERVACIONES
_______________________________________________________________

Firmas:
Detecta: _____________   Dirección: _____________   TI: _____________
────────────────────────────────────────────────────────────
```

---

## ACTA 02 — Diagnóstico e inventario del estado de la HCU

```
CONFIDENCIAL
────────────────────────────────────────────────────────────
CENTRO NEUROTERAPÉUTICO INTEGRAL ÑAMPI WASI
Acta 02 – Diagnóstico e inventario
N.º incidente: INC-HC-________-______     Fecha: __/__/______
────────────────────────────────────────────────────────────

1. EQUIPO EVALUADOR
Dirección: __________________  TI: __________________
Admisiones/Admin HC: __________________  Profesional: __________

2. ALCANCE REVISADO
[ ] Pacientes   [ ] Notas clínicas   [ ] Evaluaciones
[ ] Planes terapéuticos   [ ] Informes   [ ] Citas
[ ] Audit logs   [ ] Respaldos / PITR

3. HALLAZGOS POR EXPEDIENTE
| N.º NW | Estado* | Módulos afectados | Último audit | Observación |
|--------|---------|-------------------|--------------|-------------|
|        |         |                   |              |             |
|        |         |                   |              |             |
|        |         |                   |              |             |
*Estado: D=Disponible  R=Recuperable  P=Perdido  C=Corrupto  S=Soft-delete

4. RESPALDOS DISPONIBLES
Último backup diario: __/__/______  __:__
PITR disponible desde: __/__/______  __:__  hasta: __/__/______
¿Prueba de restore en staging? [ ] Sí [ ] No  Resultado: __________

5. CLASIFICACIÓN FINAL DEL EVENTO
Confirmado como: E__     RPO estimado: ______  RTO estimado: ______

6. AUTORIZACIÓN DE INGRESO / INTERVENCIÓN TÉCNICA
[ ] Autorizo diagnóstico profundo / restore en staging
Nombre autoridad: ________________  Firma: ________  Fecha: ______

7. CONCLUSIONES
_______________________________________________________________
_______________________________________________________________

Firmas del equipo: ____________________________________________
────────────────────────────────────────────────────────────
```

---

## ACTA 03 — Recuperación / restauración

```
CONFIDENCIAL
────────────────────────────────────────────────────────────
CENTRO NEUROTERAPÉUTICO INTEGRAL ÑAMPI WASI
Acta 03 – Recuperación / restauración
N.º incidente: INC-HC-________-______     Fecha: __/__/______
────────────────────────────────────────────────────────────

1. MÉTODO APLICADO
[ ] Reversión soft-delete (deleted_at → null)
[ ] Restore puntual de registro(s)
[ ] Restore PITR a punto en el tiempo: __/__/______ __:__
[ ] Restore completo de instancia
[ ] Otro: ________________________________________________

2. ENTORNO
[ ] Staging validado antes de producción
[ ] Restore directo a producción (justificar): ________________

3. RESULTADO POR EXPEDIENTE
| N.º NW anterior | N.º NW vigente | Resultado** | Validado por |
|-----------------|----------------|-------------|--------------|
|                 |                |             |              |
|                 |                |             |              |
** OK = recuperado íntegro | PARCIAL | NUEVO (reapertura) | FALLIDO

4. CONTINUIDAD DE NUMERACIÓN
[ ] Se mantiene serie NW sin reinicio (regla electrónica Ñampi Wasi)
[ ] Se aperturó nuevo NW por irrecuperabilidad: ______________
    Cruce con NW anterior documentado en nota administrativa: [ ] Sí

5. INTEGRIDAD Y CONFIDENCIALIDAD
[ ] Notas firmadas intactas / inmutabilidad respetada
[ ] Sin exposición a terceros no autorizados
[ ] Audit log de la operación registrado / adjunto

6. DOCUMENTACIÓN PAPEL AUXILIAR (si aplica)
[ ] No aplica
[ ] Inventariada / digitalizada / anexada  Detalle: ____________

7. CIERRE TÉCNICO
Responsable TI: ______________ Firma: ________ Fecha/hora: ______
Vo.Bo. Dirección: ____________ Firma: ________ Fecha/hora: ______
Validación clínica: __________ Firma: ________ Fecha/hora: ______
────────────────────────────────────────────────────────────
```

---

## ACTA 04 — Reconstrucción documental de HCU

```
CONFIDENCIAL
────────────────────────────────────────────────────────────
CENTRO NEUROTERAPÉUTICO INTEGRAL ÑAMPI WASI
Acta 04 – Reconstrucción documental
N.º incidente: INC-HC-________-______     Fecha: __/__/______
N.º HC: NW-____________  (anterior, si hubo: NW-____________)
────────────────────────────────────────────────────────────

1. MOTIVO
[ ] Datos no recuperables desde backup
[ ] Recuperación parcial – completar lagunas
[ ] Otro: ________________________________________________

2. FUENTES UTILIZADAS (marcar y anexar)
[ ] Formulario de contingencia (Anexo A) – N.º: ____________
[ ] Informes / epicrisis en poder del paciente
[ ] Resultados externos (lab/imagen)
[ ] Agenda / facturación / comunicaciones autorizadas
[ ] Declaración del profesional tratante
[ ] Otra: ________________________________________________
¡Prohibido consignar datos no verificables!

3. CONTENIDO RECONSTRUIDO (resumen)
Antecedentes: _______________________________________________
Atenciones recuperadas (fechas): _____________________________
Evaluaciones / planes / informes: ____________________________
Lagunas declaradas: _________________________________________

4. REGISTRO EN NEUROSYS
Fecha de carga: __/__/______  Usuario: ______________________
Tipo de nota: [ ] administrativa de reconstrucción  [ ] evolución
Se citó N.º de incidente en la nota: [ ] Sí

5. RESPONSABLES
Profesional que reconstruye: ____________ Firma: ____________
Dirección (aprueba): ____________________ Firma: ____________
Paciente/representante informado: [ ] Sí (ver Acta 05) [ ] No aplica
────────────────────────────────────────────────────────────
```

---

## ACTA 05 — Notificación al usuario / paciente

```
CONFIDENCIAL
────────────────────────────────────────────────────────────
CENTRO NEUROTERAPÉUTICO INTEGRAL ÑAMPI WASI
Acta 05 – Notificación al usuario
N.º incidente: INC-HC-________-______     Fecha: __/__/______
────────────────────────────────────────────────────────────

Paciente / representante: ___________________________________
Cédula: ________________  Parentesco (si aplica): ____________
N.º HC: NW-____________

Se informa, en entorno privado, que:
[ ] Su historia clínica estuvo temporalmente indisponible
[ ] Fue recuperada íntegramente desde respaldo
[ ] Fue recuperada parcialmente / reconstruida (lagunas declaradas)
[ ] Puede solicitar copia certificada (plazo 48 h desde solicitud)

Medio de notificación: [ ] Presencial [ ] Escrito [ ] Otro: ______
Documentos entregados: _______________________________________

Declaración del usuario:
[ ] Entiendo la información y no requiero copia ahora
[ ] Solicito copia certificada  Fecha solicitud: __/__/______
[ ] Observaciones: __________________________________________

Firma usuario/representante: ______________ Fecha: __________
Firma funcionario Ñampi Wasi: _____________ Cargo: __________
────────────────────────────────────────────────────────────
```

---

## ACTA 06 — Informe de cierre del incidente

```
CONFIDENCIAL
────────────────────────────────────────────────────────────
CENTRO NEUROTERAPÉUTICO INTEGRAL ÑAMPI WASI
Acta 06 – Informe de cierre
N.º incidente: INC-HC-________-______     Fecha cierre: __/__/____
────────────────────────────────────────────────────────────

1. RESUMEN EJECUTIVO
Tipo evento: E__   Inicio: __/__/____ __:__   Fin: __/__/____ __:__
Expedientes afectados (N.º): ______   Recuperados: ______  No recuperables: ______

2. CAUSA RAÍZ
_______________________________________________________________
_______________________________________________________________

3. ACCIONES REALIZADAS
[ ] Acta 01  [ ] Acta 02  [ ] Acta 03  [ ] Acta 04  [ ] Acta 05
[ ] Restore backup/PITR  [ ] Contingencia asistencial  [ ] Capacitación
Detalle: _____________________________________________________

4. IMPACTO EN DERECHOS DEL PACIENTE
[ ] Sin afectación material
[ ] Afectación temporal de disponibilidad (restituida)
[ ] Reconstrucción con lagunas – pacientes notificados: ______

5. MEDIDAS CORRECTIVAS Y PLAZOS
| Medida | Responsable | Plazo | Estado |
|--------|-------------|-------|--------|
|        |             |       |        |
|        |             |       |        |

6. RESPONSABILIDADES
[ ] Sin responsabilidad individual identificada
[ ] Se remite a proceso interno / TH  Expediente: ______________

7. APROBACIÓN
Elabora: _________________ Firma: _________ Fecha: __________
Comité Calidad: ___________ Firma: _________ Fecha: __________
Dirección: ________________ Firma: _________ Fecha: __________

Archivo del incidente: carpeta restringida INC-HC / NeuroSys admin
────────────────────────────────────────────────────────────
```

---

## ANEXO A — Formulario de contingencia (atención sin NeuroSys)

```
CONFIDENCIAL — NO DEJAR A LA VISTA
────────────────────────────────────────────────────────────
CENTRO NEUROTERAPÉUTICO INTEGRAL ÑAMPI WASI
Anexo A – Registro clínico en contingencia
N.º incidente: INC-HC-________-______     Fecha: __/__/______
Hora: __:__
────────────────────────────────────────────────────────────
Paciente: _______________________________  CI/Pasaporte: ______
N.º HC conocido (si hay): NW-____________  Edad: ____  Sexo: ____
Acompañante / representante: ________________________________
Profesional: _____________________________  Firma: ____________

Motivo de consulta / sesión:
_______________________________________________________________

Subjetivo (S):
_______________________________________________________________

Objetivo (O):
_______________________________________________________________

Análisis / Evaluación (A):
_______________________________________________________________

Plan (P):
_______________________________________________________________

Indicaciones / próxima cita: _________________________________
Consentimiento informado verbal/escrito: [ ] Sí  [ ] No aplica

Al recuperar NeuroSys, transcribir como evolución y archivar este
formulario en el expediente del incidente. No destruir hasta cierre.
────────────────────────────────────────────────────────────
```

---

## ANEXO B — Lista de verificación (checklist)

- [ ] Plan de contingencia socializado al personal clínico y admin  
- [ ] Actas 01–06 disponibles (impresas / PDF editable)  
- [ ] Anexo A disponible en recepción y consultorios  
- [ ] Backup diario + PITR verificados este mes  
- [ ] Drill de restauración realizado (fecha: ________)  
- [ ] Roles RLS y altas de usuario controladas  
- [ ] Revisión de `audit_logs` programada  
- [ ] Carpeta restringida de incidentes `INC-HC-AAAA` creada  
- [ ] Cláusula de confidencialidad en contratos  
- [ ] Paciente informado cuando corresponda (Acta 05)

---

## ANEXO C — Contactos de activación (completar)

| Función | Nombre | Teléfono | Correo |
|---|---|---|---|
| Dirección clínica | | | |
| Admin NeuroSys / TI | | | |
| Comité Calidad | | | |
| Guardia / recepción | | | |
| Soporte Supabase (cuenta) | | | |

---

**Aprobaciones institucionales**

| Rol | Nombre | Firma | Fecha |
|---|---|---|---|
| Dirección clínica | | | |
| Responsable TI | | | |
| Comité de Calidad y Seguridad del Paciente | | | |

*Documento interno del Centro Neuroterapéutico Integral Ñampi Wasi. Complementa la base normativa en `articulos-y-protocolo-perdida.md`. Revisar ante cambios de infraestructura o normativa MSP.*
