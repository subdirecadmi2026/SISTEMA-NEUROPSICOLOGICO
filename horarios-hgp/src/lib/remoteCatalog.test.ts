import { beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('remoteCatalog helpers', () => {
  beforeEach(() => {
    installMemoryStorage()
    vi.resetModules()
  })

  it('filtra horarios de sistema en listSavedSchedules', async () => {
    const { saveSchedule, listSavedSchedules } = await import('./storage')
    const { createBlankSchedule } = await import('../data/demo')
    const normal = createBlankSchedule('medico', 2026, 7, { withDemo: false })
    normal.unitName = 'UCI'
    saveSchedule(normal)
    const sys = createBlankSchedule('medico', 2099, 1, { withDemo: false })
    sys.id = 'sys-hgp-staff-leaves'
    sys.unitName = '__SYSTEM__/staff_leaves'
    saveSchedule(sys)
    const list = listSavedSchedules()
    expect(list.some((i) => i.id === normal.id)).toBe(true)
    expect(list.some((i) => i.id.startsWith('sys-hgp-'))).toBe(false)
  })

  it('probeRemoteCatalog reporta local sin supabase', async () => {
    vi.doMock('./supabase', () => ({
      isSupabaseConfigured: () => false,
      getSupabase: () => null,
    }))
    const { probeRemoteCatalog } = await import('./remoteCatalog')
    const s = await probeRemoteCatalog()
    expect(s.configured).toBe(false)
    expect(s.leavesMode).toBe('local')
  })
})
