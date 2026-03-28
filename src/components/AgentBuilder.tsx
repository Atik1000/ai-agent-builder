import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AgentData, Layer, SavedAgent, Skill } from '../types'
import type { AgentBuilderLogic } from '../hooks/useAgentBuilderLogic'
import { getAgentDisplayNameError } from '../lib/validateAgentName'
import { isLayerDropTarget, isSkillDropTarget } from '../lib/dndZones'
import { LayersBuildZone, PaletteLayerCard, PaletteSkillCard, SkillsBuildZone } from './builder/DnDBlocks'
import { SessionTimer } from './SessionTimer'

const PROVIDERS = ['Gemini', 'ChatGPT', 'Kimi', 'Claude', 'DeepSeek'] as const

function SkillSelect({
  skills,
  onSelect,
}: {
  skills: Skill[]
  onSelect: (id: string) => void
}) {
  const byCategory = useMemo(() => {
    const m = new Map<string, Skill[]>()
    for (const s of skills) {
      const list = m.get(s.category) ?? []
      list.push(s)
      m.set(s.category, list)
    }
    return m
  }, [skills])

  return (
    <select
      className="ab-select"
      defaultValue=""
      aria-label="Add a skill"
      onChange={(e) => {
        const v = e.target.value
        if (v) onSelect(v)
        e.target.value = ''
      }}
    >
      <option value="" disabled>
        — Add a skill —
      </option>
      {[...byCategory.entries()].map(([category, list]) => (
        <optgroup key={category} label={category}>
          {list.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

function LayerSelect({
  layers,
  onSelect,
}: {
  layers: Layer[]
  onSelect: (id: string) => void
}) {
  const byType = useMemo(() => {
    const m = new Map<string, Layer[]>()
    for (const l of layers) {
      const list = m.get(l.type) ?? []
      list.push(l)
      m.set(l.type, list)
    }
    return m
  }, [layers])

  return (
    <select
      className="ab-select"
      defaultValue=""
      aria-label="Add a personality layer"
      onChange={(e) => {
        const v = e.target.value
        if (v) onSelect(v)
        e.target.value = ''
      }}
    >
      <option value="" disabled>
        — Add a personality layer —
      </option>
      {[...byType.entries()].map(([type, list]) => (
        <optgroup key={type} label={type}>
          {list.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

function SavedAgentCard({
  agent,
  data,
  onLoad,
  onDelete,
}: {
  agent: SavedAgent
  data: AgentData
  onLoad: (a: SavedAgent) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="ab-saved-card">
      <div>
        <h3>{agent.name}</h3>
        <p className="ab-saved-card__meta">
          Profile: {data.agentProfiles.find((p) => p.id === agent.profileId)?.name ?? '—'}
        </p>
        <p className="ab-saved-card__meta">
          Skills: {agent.skillIds?.length ?? 0} · Layers: {agent.layerIds?.length ?? 0}
        </p>
        <p className="ab-saved-card__meta">Provider: {agent.provider ?? '—'}</p>
      </div>
      <div className="ab-saved-card__actions">
        <button type="button" className="ab-btn ab-btn--card" onClick={() => onLoad(agent)}>
          Load
        </button>
        <button type="button" className="ab-btn ab-btn--card-outline" onClick={() => void onDelete(agent.id)}>
          Delete
        </button>
      </div>
    </div>
  )
}

export function AgentBuilder(props: AgentBuilderLogic) {
  const {
    data,
    loading,
    error,
    reloadConfiguration,
    retryConfiguration,
    selectedProfile,
    setSelectedProfile,
    selectedSkills,
    selectedLayers,
    addSkill,
    addLayer,
    removeSkill,
    removeLayer,
    reorderSkills,
    reorderLayers,
    agentName,
    setAgentName,
    selectedProvider,
    setSelectedProvider,
    savedAgents,
    saveAgent,
    loadAgent,
    deleteAgent,
    clearAllSaved,
  } = props

  const [nameTouched, setNameTouched] = useState(false)
  const [saveAttempted, setSaveAttempted] = useState(false)

  const profile = data?.agentProfiles.find((p) => p.id === selectedProfile)

  const nameShowError = nameTouched || saveAttempted
  const nameError = getAgentDisplayNameError(agentName, nameShowError)
  const nameInputClass = nameError ? 'ab-input ab-input--error' : 'ab-input'

  // When the name is cleared (user or successful save), drop the “attempted save” flag for validation.
  useEffect(() => {
    if (agentName === '') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync validation flag when field is cleared
      setSaveAttempted(false)
    }
  }, [agentName])

  const handleSaveAgent = () => {
    setSaveAttempted(true)
    saveAgent()
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const skillsByCategory = useMemo(() => {
    if (!data) return new Map<string, Skill[]>()
    const m = new Map<string, Skill[]>()
    for (const s of data.skills) {
      const list = m.get(s.category) ?? []
      list.push(s)
      m.set(s.category, list)
    }
    return m
  }, [data])

  const layersByType = useMemo(() => {
    if (!data) return new Map<string, Layer[]>()
    const m = new Map<string, Layer[]>()
    for (const l of data.layers) {
      const list = m.get(l.type) ?? []
      list.push(l)
      m.set(l.type, list)
    }
    return m
  }, [data])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || !data) return

      const activeId = String(active.id)
      const overId = String(over.id)

      if (activeId.startsWith('palette-skill-')) {
        const skillId = activeId.slice('palette-skill-'.length)
        if (isSkillDropTarget(overId, selectedSkills) && !selectedSkills.includes(skillId)) {
          addSkill(skillId)
        }
        return
      }

      if (activeId.startsWith('palette-layer-')) {
        const layerId = activeId.slice('palette-layer-'.length)
        if (isLayerDropTarget(overId, selectedLayers) && !selectedLayers.includes(layerId)) {
          addLayer(layerId)
        }
        return
      }

      if (selectedSkills.includes(activeId) && selectedSkills.includes(overId)) {
        reorderSkills(activeId, overId)
        return
      }

      if (selectedLayers.includes(activeId) && selectedLayers.includes(overId)) {
        reorderLayers(activeId, overId)
      }
    },
    [data, selectedSkills, selectedLayers, addSkill, addLayer, reorderSkills, reorderLayers]
  )

  return (
    <>
      <header className="ab-header">
        <div className="ab-header__inner">
          <div>
            <p className="ab-kicker">Vivasoft challenge</p>
            <h1 className="ab-title">AI Agent Builder</h1>
            <p className="ab-lede">
              Drag skills and layers from the library into the build zones, reorder with the handle, or use quick-add
              menus. Saving with an existing name updates that agent.
            </p>
          </div>
          <div className="ab-header__actions">
            <SessionTimer />
            <button
              type="button"
              className="ab-btn ab-btn--primary"
              onClick={() => reloadConfiguration()}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Reload configuration'}
            </button>
          </div>
        </div>
      </header>

      <main className="ab-main">
        {error && (
          <div className="ab-error-banner">
            <p>{error}</p>
            <button type="button" className="ab-btn--retry" onClick={() => retryConfiguration()}>
              Retry
            </button>
          </div>
        )}

        {loading && !data && (
          <div className="ab-loading">Fetching configuration (simulated 1–3s delay)…</div>
        )}

        {data && (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="ab-grid">
              <section className="ab-grid__config ab-stack">
                <h2 className="ab-section-title">Configuration</h2>

                <div className="ab-config-block">
                  <label htmlFor="profile-select" className="ab-label">
                    Base profile
                  </label>
                  <select
                    id="profile-select"
                    className="ab-select"
                    value={selectedProfile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                  >
                    <option value="">— Select a profile —</option>
                    {data.agentProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ab-config-block">
                  <span className="ab-label">AI provider</span>
                  <div className="ab-chip-row">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={selectedProvider === p ? 'ab-chip ab-chip--active' : 'ab-chip'}
                        onClick={() => setSelectedProvider(selectedProvider === p ? '' : p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ab-config-block">
                  <span className="ab-label">Skill library — drag into the zone below</span>
                  <div className="ab-dnd-palette-stack">
                    {[...skillsByCategory.entries()].map(([category, skills]) => (
                      <div key={category}>
                        <p className="ab-subhead">{category}</p>
                        <div className="ab-dnd-palette-grid">
                          {skills.map((s) => (
                            <PaletteSkillCard key={s.id} skill={s} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <SkillsBuildZone
                  skillIds={selectedSkills}
                  skillsById={(id) => data.skills.find((s) => s.id === id)}
                  onRemove={removeSkill}
                />

                <div className="ab-config-block">
                  <label htmlFor="skill-select" className="ab-label">
                    Quick add skill (menu)
                  </label>
                  <SkillSelect skills={data.skills} onSelect={addSkill} />
                </div>

                <div className="ab-config-block">
                  <span className="ab-label">Layer library — drag into the zone below</span>
                  <div className="ab-dnd-palette-stack">
                    {[...layersByType.entries()].map(([type, layers]) => (
                      <div key={type}>
                        <p className="ab-subhead">{type}</p>
                        <div className="ab-dnd-palette-grid">
                          {layers.map((l) => (
                            <PaletteLayerCard key={l.id} layer={l} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <LayersBuildZone
                  layerIds={selectedLayers}
                  layersById={(id) => data.layers.find((l) => l.id === id)}
                  onRemove={removeLayer}
                />

                <div className="ab-config-block">
                  <label htmlFor="layer-select" className="ab-label">
                    Quick add layer (menu)
                  </label>
                  <LayerSelect layers={data.layers} onSelect={addLayer} />
                </div>
              </section>

              <section className="ab-grid__preview ab-stack">
              <h2 className="ab-section-title">Preview</h2>

              <div className="ab-glass ab-preview">
                <div className="ab-preview__block">
                  <h3>Profile</h3>
                  {profile ? (
                    <p>
                      <span className="ab-preview__strong">{profile.name}</span>
                      <span className="ab-preview__muted"> — </span>
                      {profile.description}
                    </p>
                  ) : (
                    <p className="ab-preview__muted">No profile selected.</p>
                  )}
                </div>

                <div className="ab-preview__block">
                  <h3>Skills</h3>
                  {selectedSkills.length > 0 ? (
                    <ul>
                      {selectedSkills.map((id) => {
                        const s = data.skills.find((x) => x.id === id)
                        return (
                          <li key={id}>
                            {s?.name ?? id}
                            <span className="ab-preview__muted"> — {s?.category ?? ''}</span>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="ab-preview__muted">No skills added.</p>
                  )}
                </div>

                <div className="ab-preview__block">
                  <h3>Layers</h3>
                  {selectedLayers.length > 0 ? (
                    <ul>
                      {selectedLayers.map((id) => {
                        const l = data.layers.find((x) => x.id === id)
                        return (
                          <li key={id}>
                            {l?.name ?? id}
                            <span className="ab-preview__muted"> — {l?.type ?? ''}</span>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="ab-preview__muted">No layers added.</p>
                  )}
                </div>

                <div className="ab-preview__block">
                  <h3>Provider</h3>
                  <p>{selectedProvider || 'None'}</p>
                </div>

                <div className="ab-preview__save-block">
                  <label htmlFor="agent-name" className="ab-label">
                    Agent name
                  </label>
                  <div className="ab-preview__save-controls">
                    <input
                      id="agent-name"
                      type="text"
                      className={`${nameInputClass} ab-preview__save-input`}
                      placeholder="Enter agent name…"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      onBlur={() => setNameTouched(true)}
                      aria-invalid={Boolean(nameError)}
                      aria-describedby={nameError ? 'agent-name-error' : undefined}
                    />
                    <button type="button" className="ab-btn ab-btn--primary ab-preview__save-btn" onClick={handleSaveAgent}>
                      Save agent
                    </button>
                  </div>
                  {nameError ? (
                    <p id="agent-name-error" className="ab-field-error" role="alert">
                      {nameError}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
          </DndContext>
        )}

        {savedAgents.length > 0 && data && (
          <section className="ab-saved">
            <div className="ab-saved__head">
              <h2 className="ab-section-title">Saved agents</h2>
              <button type="button" className="ab-btn--link-danger" onClick={() => void clearAllSaved()}>
                Clear all
              </button>
            </div>
            <div className="ab-saved__grid">
              {savedAgents.map((agent) => (
                <SavedAgentCard key={agent.id} agent={agent} data={data} onLoad={loadAgent} onDelete={deleteAgent} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
