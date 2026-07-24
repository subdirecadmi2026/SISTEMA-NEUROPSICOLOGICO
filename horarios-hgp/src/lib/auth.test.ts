import { describe, expect, it, beforeEach } from 'vitest'
import {
  DEMO_PASSWORD,
  DEMO_USERS,
  authenticateDemo,
  loadSession,
  loginAs,
  logout,
  primaryDemoUsers,
  roleMission,
  userInitials,
} from './auth'

function installMemoryStorage() {
  const store = new Map<string, string>()
  const memory = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v))
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: memory,
    configurable: true,
  })
}

describe('login y perfiles demo', () => {
  beforeEach(() => {
    installMemoryStorage()
    logout()
  })

  it('authenticateDemo acepta correo + contraseña demo', () => {
    const r = authenticateDemo('jefe.servicio@hgp.gob.ec', DEMO_PASSWORD)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.user.role).toBe('lider_servicio')
      expect(loadSession()?.id).toBe('u-jefe')
    }
  })

  it('authenticateDemo rechaza contraseña incorrecta', () => {
    const r = authenticateDemo('revisor@hgp.gob.ec', 'mala')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/incorrecta/i)
    expect(loadSession()).toBeNull()
  })

  it('authenticateDemo rechaza correo desconocido', () => {
    const r = authenticateDemo('nadie@hgp.gob.ec', DEMO_PASSWORD)
    expect(r.ok).toBe(false)
  })

  it('primaryDemoUsers incluye jefe, revisor, validador y admin', () => {
    const ids = primaryDemoUsers().map((u) => u.id)
    expect(ids).toEqual(['u-jefe', 'u-revisor', 'u-validador', 'u-admin'])
  })

  it('restaurar perfiles revisor y validador si se borraron del login', () => {
    localStorage.setItem(
      'hgp-users-deleted-demo-v1',
      JSON.stringify(['u-revisor', 'u-validador']),
    )
    const ids = primaryDemoUsers().map((u) => u.id)
    expect(ids).toContain('u-revisor')
    expect(ids).toContain('u-validador')
    expect(authenticateDemo('revisor@hgp.gob.ec', DEMO_PASSWORD).ok).toBe(true)
    expect(authenticateDemo('validador@hgp.gob.ec', DEMO_PASSWORD).ok).toBe(
      true,
    )
  })

  it('loginAs persiste sesión y logout la limpia', () => {
    const u = DEMO_USERS[0]
    loginAs(u)
    expect(loadSession()?.email).toBe(u.email)
    logout()
    expect(loadSession()).toBeNull()
  })

  it('authenticateDemo exige perfil seleccionado correcto', () => {
    const bad = authenticateDemo('revisor@hgp.gob.ec', DEMO_PASSWORD, {
      expectedUserId: 'u-jefe',
    })
    expect(bad.ok).toBe(false)
    const good = authenticateDemo('jefe.servicio@hgp.gob.ec', DEMO_PASSWORD, {
      expectedUserId: 'u-jefe',
    })
    expect(good.ok).toBe(true)
  })

  it('authenticateDemo rechaza contraseña vacía', () => {
    const r = authenticateDemo('validador@hgp.gob.ec', '')
    expect(r.ok).toBe(false)
  })

  it('roleMission y userInitials', () => {
    expect(roleMission('validador')).toMatch(/QR|valida/i)
    expect(userInitials('Dra. María Solís')).toBe('DS')
  })
})
