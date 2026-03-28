import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AgentData, Layer, SavedAgent, Skill } from '../types'
import { useAgentData } from '../hooks/useAgentData'
import { loadSavedAgents, persistSavedAgents } from '../lib/savedAgentsStorage'
import { SessionTimer } from './SessionTimer'

const SKILLS_DROP_ZONE = 'skills-drop-zone'
const LAYERS_DROP_ZONE = 'layers-drop-zone'

const PROVIDERS = ['Gemini', 'ChatGPT', 'Kimi', 'Claude', 'DeepSeek'] as const

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

function isSkillDropTarget(overId: string, skillIds: string[]) {
  return overId === SKILLS_DROP_ZONE || skillIds.includes(overId)
}

function isLayerDropTarget(overId: string, layerIds: string[]) {
  return overId === LAYERS_DROP_ZONE || layerIds.includes(overId)
}

function PaletteCard({
  id,
  title,
  subtitle,
  hint,
}: {
  id: string
  title: string
  subtitle: string
  hint: string
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'rounded-xl border border-slate-700/80 bg-slate-900/60 px-3 py-2.5 shadow-sm',
        'cursor-grab active:cursor-grabbing select-none',
        'hover:border-teal-500/50 hover:bg-slate-800/80 transition-colors',
        isDragging && 'opacity-40 ring-2 ring-teal-400/40'
      )}
      title={hint}
    >
      <p className="text-sm font-medium text-slate-100 leading-snug">{title}</p>
      <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  )
}

function SortableRow({
  id,
  title,
  subtitle,
  onRemove,
}: {
  id: string
  title: string
  subtitle: string
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-stretch gap-2 rounded-lg border border-slate-700/70 bg-slate-900/50',
        isDragging && 'z-10 opacity-90 ring-2 ring-teal-400/30'
      )}
    >
      <button
        type="button"
        className="shrink-0 w-9 flex items-center justify-center rounded-l-lg bg-slate-800/80 text-slate-400 hover:text-teal-300 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <span className="text-lg leading-none">⋮⋮</span>
      </button>
      <div className="flex-1 min-w-0 py-2 pr-2">
        <p className="text-sm font-medium text-slate-100 truncate">{title}</p>
        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 px-3 text-xs font-medium text-rose-300 hover:bg-rose-950/50 rounded-r-lg"
      >
        Remove
      </button>
    </div>
  )
}

function DropZone({
  id,
  label,
  emptyHint,
  isEmpty,
  children,
}: {
  id: string
  label: string
  emptyHint: string
  isEmpty: boolean
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[140px] rounded-xl border-2 border-dashed p-3 transition-colors',
          isOver ? 'border-teal-400/70 bg-teal-950/20' : 'border-slate-700 bg-slate-950/30'
        )}
      >
        {children}
        {isEmpty && <p className="text-xs text-slate-600 mt-2">{emptyHint}</p>}
      </div>
    </div>
  )
}

export function AgentBuilder() {
  const { data, loading, error, reload } = useAgentData()
  const [selectedProfile, setSelectedProfile] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedLayers, setSelectedLayers] = useState<string[]>([])
  const [agentName, setAgentName] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [savedAgents, setSavedAgents] = useState<SavedAgent[]>(() => loadSavedAgents())

  const agentNameRef = useRef(agentName)
  useEffect(() => {
    agentNameRef.current = agentName
  }, [agentName])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const name = agentNameRef.current
      if (name !== '') {
        console.log(`[Analytics Heartbeat] User is working on agent named: "${name}"`)
      } else {
        console.log(`[Analytics Heartbeat] User is working on an unnamed agent draft...`)
      }
    }, 8000)
    return () => window.clearInterval(interval)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId.startsWith('palette-skill-')) {
      const skillId = activeId.slice('palette-skill-'.length)
      if (isSkillDropTarget(overId, selectedSkills) && !selectedSkills.includes(skillId)) {
        setSelectedSkills((prev) => [...prev, skillId])
      }
      return
    }

    if (activeId.startsWith('palette-layer-')) {
      const layerId = activeId.slice('palette-layer-'.length)
      if (isLayerDropTarget(overId, selectedLayers) && !selectedLayers.includes(layerId)) {
        setSelectedLayers((prev) => [...prev, layerId])
      }
      return
    }

    if (selectedSkills.includes(activeId) && selectedSkills.includes(overId)) {
      setSelectedSkills((items) => {
        const oldIndex = items.indexOf(activeId)
        const newIndex = items.indexOf(overId)
        return arrayMove(items, oldIndex, newIndex)
      })
      return
    }

    if (selectedLayers.includes(activeId) && selectedLayers.includes(overId)) {
      setSelectedLayers((items) => {
        const oldIndex = items.indexOf(activeId)
        const newIndex = items.indexOf(overId)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleSaveAgent = () => {
    if (!agentName.trim()) {
      alert('Please enter a name for your agent.')
      return
    }

    const newAgent: SavedAgent = {
      id: crypto.randomUUID(),
      name: agentName.trim(),
      profileId: selectedProfile,
      skillIds: selectedSkills,
      layerIds: selectedLayers,
      provider: selectedProvider,
    }

    const updated = [...savedAgents, newAgent]
    setSavedAgents(updated)
    persistSavedAgents(updated)
    setAgentName('')
    alert(`Agent "${newAgent.name}" saved successfully!`)
  }

  const handleLoadAgent = (agent: SavedAgent) => {
    setSelectedProfile(agent.profileId || '')
    setSelectedSkills([...(agent.skillIds || [])])
    setSelectedLayers([...(agent.layerIds || [])])
    setAgentName(agent.name)
    setSelectedProvider(agent.provider || '')
  }

  const handleDeleteAgent = (id: string) => {
    const updated = savedAgents.filter((a) => a.id !== id)
    setSavedAgents(updated)
    persistSavedAgents(updated)
  }

  const profile = data?.agentProfiles.find((p) => p.id === selectedProfile)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="min-h-screen font-sans text-slate-100">
        <header className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-teal-400/90 text-sm font-medium tracking-wide uppercase">Vivasoft challenge</p>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-1">
                AI Agent Builder
              </h1>
              <p className="text-slate-400 mt-2 max-w-xl">
                Drag skills and personality layers into your agent, reorder them, then save. Configuration loads once—use
                reload only when you need a fresh fetch.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SessionTimer />
              <button
                type="button"
                onClick={() => reload()}
                disabled={loading}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  'bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {loading ? 'Loading…' : 'Reload configuration'}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 space-y-10">
          {error && (
            <div className="rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-rose-200 text-sm">
              {error}
            </div>
          )}

          {loading && !data && (
            <div className="rounded-xl border border-slate-700 border-dashed bg-slate-900/40 px-6 py-12 text-center text-slate-400">
              Fetching configuration (simulated 1–3s delay)…
            </div>
          )}

          {data && (
            <div className="grid gap-10 lg:grid-cols-12">
              <section className="lg:col-span-5 space-y-6">
                <h2 className="text-lg font-semibold text-white">Library</h2>
                <p className="text-sm text-slate-500 -mt-4">Drag cards into the build panel on the right.</p>

                <div className="space-y-5">
                  {[...skillsByCategory.entries()].map(([category, skills]) => (
                    <div key={category}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{category}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {skills.map((s) => (
                          <PaletteCard
                            key={s.id}
                            id={`palette-skill-${s.id}`}
                            title={s.name}
                            subtitle={s.category}
                            hint={s.description}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-5">
                  {[...layersByType.entries()].map(([type, layers]) => (
                    <div key={type}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{type}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {layers.map((l) => (
                          <PaletteCard
                            key={l.id}
                            id={`palette-layer-${l.id}`}
                            title={l.name}
                            subtitle={l.type}
                            hint={l.description}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="lg:col-span-7 space-y-6">
                <h2 className="text-lg font-semibold text-white">Your agent</h2>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Base profile</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data.agentProfiles.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProfile(p.id)}
                        className={cn(
                          'text-left rounded-xl border px-4 py-3 transition-colors',
                          selectedProfile === p.id
                            ? 'border-teal-500 bg-teal-950/40 ring-1 ring-teal-500/40'
                            : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'
                        )}
                      >
                        <span className="font-medium text-slate-100">{p.name}</span>
                        <span className="block text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">AI provider</p>
                  <div className="flex flex-wrap gap-2">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedProvider(selectedProvider === p ? '' : p)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-sm border transition-colors',
                          selectedProvider === p
                            ? 'border-teal-500 bg-teal-950/50 text-teal-100'
                            : 'border-slate-700 text-slate-300 hover:border-slate-500'
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <DropZone
                  id={SKILLS_DROP_ZONE}
                  label="Skills in this agent"
                  emptyHint="Drop skills here or reorder with the handle. Duplicates are ignored."
                  isEmpty={selectedSkills.length === 0}
                >
                  <SortableContext items={selectedSkills} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {selectedSkills.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4 text-center">No skills yet—drag from the library.</p>
                      ) : (
                        selectedSkills.map((skillId) => {
                          const skill = data.skills.find((s) => s.id === skillId)
                          return (
                            <SortableRow
                              key={skillId}
                              id={skillId}
                              title={skill?.name ?? skillId}
                              subtitle={skill?.category ?? ''}
                              onRemove={() => setSelectedSkills((s) => s.filter((id) => id !== skillId))}
                            />
                          )
                        })
                      )}
                    </div>
                  </SortableContext>
                </DropZone>

                <DropZone
                  id={LAYERS_DROP_ZONE}
                  label="Personality layers"
                  emptyHint="Drop layers here to stack personality. Reorder to change priority."
                  isEmpty={selectedLayers.length === 0}
                >
                  <SortableContext items={selectedLayers} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {selectedLayers.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4 text-center">No layers yet—drag from the library.</p>
                      ) : (
                        selectedLayers.map((layerId) => {
                          const layer = data.layers.find((l) => l.id === layerId)
                          return (
                            <SortableRow
                              key={layerId}
                              id={layerId}
                              title={layer?.name ?? layerId}
                              subtitle={layer?.type ?? ''}
                              onRemove={() => setSelectedLayers((s) => s.filter((id) => id !== layerId))}
                            />
                          )
                        })
                      )}
                    </div>
                  </SortableContext>
                </DropZone>

                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-200">Preview</h3>
                  {profile ? (
                    <p className="text-sm text-slate-300">
                      <span className="font-medium text-white">{profile.name}</span>
                      <span className="text-slate-500"> — </span>
                      {profile.description}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">Select a base profile above.</p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Skills</p>
                      <p className="text-slate-300">{selectedSkills.length} selected</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Layers</p>
                      <p className="text-slate-300">{selectedLayers.length} selected</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Provider</p>
                      <p className="text-slate-300">{selectedProvider || 'None'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-800">
                    <input
                      type="text"
                      placeholder="Name this agent…"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                    <button
                      type="button"
                      onClick={handleSaveAgent}
                      className="rounded-lg bg-teal-600 hover:bg-teal-500 px-5 py-2 text-sm font-medium text-white"
                    >
                      Save agent
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {savedAgents.length > 0 && data && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-white m-0">Saved agents</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear all saved agents?')) {
                      setSavedAgents([])
                      persistSavedAgents([])
                    }
                  }}
                  className="text-sm text-rose-300 hover:text-rose-200"
                >
                  Clear all
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedAgents.map((agent) => (
                  <SavedAgentCard key={agent.id} agent={agent} data={data} onLoad={handleLoadAgent} onDelete={handleDeleteAgent} />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </DndContext>
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
    <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4 flex flex-col gap-3">
      <div>
        <h3 className="text-base font-semibold text-teal-200 m-0">{agent.name}</h3>
        <p className="text-xs text-slate-500 mt-1">
          Profile: {data.agentProfiles.find((p) => p.id === agent.profileId)?.name ?? '—'}
        </p>
        <p className="text-xs text-slate-500">Skills: {agent.skillIds?.length ?? 0} · Layers: {agent.layerIds?.length ?? 0}</p>
        <p className="text-xs text-slate-500">Provider: {agent.provider ?? '—'}</p>
      </div>
      <div className="flex gap-2 mt-auto">
        <button
          type="button"
          onClick={() => onLoad(agent)}
          className="flex-1 rounded-md bg-teal-800/80 hover:bg-teal-700 py-2 text-sm text-white"
        >
          Load
        </button>
        <button
          type="button"
          onClick={() => onDelete(agent.id)}
          className="rounded-md border border-rose-900 text-rose-300 hover:bg-rose-950/50 px-3 text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
