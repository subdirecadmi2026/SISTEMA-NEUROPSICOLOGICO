# Despliegue — Horarios HGP

## Vercel (recomendado)

1. Entre a [vercel.com](https://vercel.com) e importe el repo `SISTEMA-NEUROPSICOLOGICO`.
2. Configure:
   - **Root Directory:** `horarios-hgp`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output:** `dist`
3. Variables de entorno:
   ```
   VITE_SUPABASE_URL=https://teeaseuvrsiwipirrlxd.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```
4. Deploy. La URL quedará fija (ej. `https://horarios-hgp.vercel.app`).

### CLI (si tiene token)

```bash
cd horarios-hgp
npx vercel login
npx vercel --prod \
  --env VITE_SUPABASE_URL=https://teeaseuvrsiwipirrlxd.supabase.co \
  --env VITE_SUPABASE_ANON_KEY=su_clave
```

## Supabase

Ya debe estar ejecutada la migración:

`supabase/migrations/20260722000000_horarios_hgp.sql`

## Flujo de prueba en producción

1. Entrar como **Líder de servicio**
2. Crear horario → especialidad → nombres de médicos
3. Pintar turnos → Guardar
4. Enviar a revisión
5. Entrar como **Dirección Asistencial** → Aprobar y firmar
6. El horario queda bloqueado
