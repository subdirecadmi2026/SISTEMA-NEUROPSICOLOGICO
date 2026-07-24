import { beforeEach, describe, expect, it } from 'vitest'
import {
  createOrUpdateUserFromSigner,
  fullSignerName,
  getSignersConfig,
  listActiveSigners,
  resetSignersToDefaults,
  setSignersCount,
  updateSigner,
} from './signersStore'

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

describe('responsables de firma', () => {
  beforeEach(() => {
    installMemoryStorage()
    resetSignersToDefaults()
  })

  it('permite 3, 4 o 5 casillas', () => {
    expect(getSignersConfig().count).toBe(3)
    expect(listActiveSigners()).toHaveLength(3)
    expect(setSignersCount(5).signers).toHaveLength(5)
    expect(setSignersCount(4).count).toBe(4)
  })

  it('guarda nombres, apellidos y responsabilidad', () => {
    const cfg = getSignersConfig()
    const id = cfg.signers[0].id
    updateSigner(id, {
      nombres: 'María Fernanda',
      apellidos: 'Pérez Guatatuca',
      cargo: 'Jefa de Medicina Interna',
      email: 'maria.perez@hgp.gob.ec',
    })
    const s = listActiveSigners()[0]
    expect(fullSignerName(s)).toBe('María Fernanda Pérez Guatatuca')
    expect(s.cargo).toBe('Jefa de Medicina Interna')
  })

  it('crea usuario vinculado desde el responsable', () => {
    const cfg = getSignersConfig()
    const id = cfg.signers[0].id
    updateSigner(id, {
      nombres: 'Carlos',
      apellidos: 'Mendoza',
      cargo: 'Jefe de servicio',
      email: 'carlos.mendoza.firmas@hgp.gob.ec',
      kind: 'elaborado',
    })
    const { userId, signer } = createOrUpdateUserFromSigner(id, 'hgp2026')
    expect(userId).toBeTruthy()
    expect(signer.linkedUserId).toBe(userId)
  })
})
