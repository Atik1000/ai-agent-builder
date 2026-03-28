import type { SavedAgent } from '../types'

const STORAGE_KEY = 'savedAgents'

export function persistSavedAgents(agents: SavedAgent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents))
}

function normalizeAgent(item: unknown): { agent: SavedAgent | null; wasMissingId: boolean } {
  if (!item || typeof item !== 'object') return { agent: null, wasMissingId: false }
  const a = item as Partial<SavedAgent>
  const hadStableId = typeof a.id === 'string' && a.id.length > 0
  return {
    agent: {
      id: hadStableId ? a.id! : crypto.randomUUID(),
      name: typeof a.name === 'string' ? a.name : '',
      profileId: typeof a.profileId === 'string' ? a.profileId : '',
      skillIds: Array.isArray(a.skillIds) ? a.skillIds.map(String) : [],
      layerIds: Array.isArray(a.layerIds) ? a.layerIds.map(String) : [],
      provider: typeof a.provider === 'string' ? a.provider : undefined,
    },
    wasMissingId: !hadStableId,
  }
}

export function loadSavedAgents(): SavedAgent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const results: SavedAgent[] = []
    let migrated = false
    for (const item of parsed) {
      const { agent, wasMissingId } = normalizeAgent(item)
      if (agent) {
        results.push(agent)
        if (wasMissingId) migrated = true
      }
    }
    if (migrated) persistSavedAgents(results)
    return results
  } catch {
    return []
  }
}
