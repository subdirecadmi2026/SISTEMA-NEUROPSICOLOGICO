# Manual corto — Jefes de servicio (HGP)

## Roles
| Rol | Qué ve |
|-----|--------|
| **Jefe (médico)** | Sistema completo: crear, pintar, personal, enviar |
| **Revisor** | Solo módulo de **tarjetas**: abrir uno, ver grilla, aprobar o comentar |
| **Validador** | Solo módulo de **tarjetas**: abrir uno y validar |
| **Admin** | Sistema completo + reabrir |

## 1. Abrir el sistema
Entre con su usuario (selector «Entrar como»). Use **Jefe** para elaborar.

## 2. Crear / configurar el mes
1. **+ Crear horario** (asistente)
2. Elija **Enfermería** o **Médico**, mes, año y **servicio**
3. Opcional: traer nombres del mes anterior
4. Indique el jefe / líder de servicio

## 3. Cargar personal
Opciones:
- Pestaña **PERSONAL** → pegar lista / ordenar A–Z / importar Excel-CSV
- Biblioteca: descargar plantilla → importar → «Cargar al horario»
- En la grilla: **+ Agregar personal**

## 4. Pintar turnos
1. Elija una **clave** (D1, N1, CE, X, L, V…)
2. Active **Pintar**
3. Clic o **arrastre** para pintar; clic derecho borra
4. Clic en el **número del día** = pinta toda la columna
5. **←Copia** = copia turnos de la fila de arriba (solo vacíos)

### Atajos de teclado
| Tecla | Clave |
|-------|--------|
| L / F / V | Libre / Feriado / Vacaciones |
| C | CE (médico) |
| X | Guardia X |
| D / N | D1 / N1 (enfermería) |
| Ctrl+S | Guardar |
| Ctrl+Z | Deshacer |

## 5. Herramientas rápidas
**Principales:** Deshacer · Duplicar mes anterior · Copiar 1ª semana · Crear mes siguiente

**Completar celdas:**
- Limpiar mes
- Autocompletar feriados (F)
- Llenar sáb/dom con L
- Código habitual en vacíos (lun–vie)
- L tras guardia (médico)
- Intercambiar D1 ↔ N1 (enfermería)

**Personal y copias:** nombres del mes anterior · Duplicar como nuevo

También: resaltar vacíos, modo compacto, ir a un día, reemplazar clave.

## 6. Revisar calidad
- **Listo para enviar**: checklist de requisitos
- **DISTRIBUCIÓN**: cobertura por día + quién trabaja + horas por persona
- **Comparar con mes anterior**: Δ de horas
- **CONTINGENCIA**: obligatorio en médico si hay V/P/INC/CD (botón sugerir)

## 7. Guardar y enviar (flujo de roles)
1. **Jefe** elabora → **Guardar** → **Enviar a revisión**
2. **Revisor** ve solo **tarjetas** → abre una → aprueba o deja comentario → pasa al siguiente
3. Si hay corrección: el jefe ve el aviso rojo al abrir el horario, corrige y reenvía
4. **Validador** ve solo **tarjetas** → abre una → **Validar**
5. **Exportar Excel / CSV** o **Imprimir / PDF** (jefe)

## Claves frecuentes (Enfermería)
| Clave | Horario | Horas |
|-------|---------|-------|
| A1 | 09:00–18:00 | 8 |
| A2 | 07:00–16:00 | 8 |
| D1 | 07:00–19:30 | 12 |
| N1 | 19:00–07:30 | 12 |
| M / T | 6 h auxiliares | 6 |
| L / V / F | libre / vacaciones / feriado | 0 |

## Claves frecuentes (Médico)
| Clave | Uso |
|-------|-----|
| CE | Consulta externa |
| X | Guardia 24 h |
| PT1 / PT2 | Guardia 12 h |
| L / V / F | libre / vacaciones / feriado |
