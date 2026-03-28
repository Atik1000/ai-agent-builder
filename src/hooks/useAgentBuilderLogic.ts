import { useCallback, useEffect, useRef, useState } from 'react'
import { useNotifications } from './useNotifications'
import type { SavedAgent } from '../types'
import { loadSavedAgents, persistSavedAgents } from '../lib/savedAgentsStorage'
import { validateAgentName } from '../lib/validateAgentName'
import { useAgentData } from './useAgentData'

export { useSessionSeconds } from './useSessionSeconds'

export function useAgentBuilderLogic() {
  const { showToast, requestConfirm } = useNotifications()
  const { data, loading, error, reload, retry } = useAgentData()

  const [selectedProfile, setSelectedProfile] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedLayers, setSelectedLayers] = useState<string[]>([])
  const [agentName, setAgentName] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [savedAgents, setSavedAgents] = useState<SavedAgent[]>(() => loadSavedAgents())
  const savedAgentsRef = useRef(savedAgents)
  useEffect(() => {
    savedAgentsRef.current = savedAgents
  }, [savedAgents])

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

  const addSkill = useCallback((skillId: string) => {
    if (!skillId) return
    setSelectedSkills((prev) => (prev.includes(skillId) ? prev : [...prev, skillId]))
  }, [])

  const addLayer = useCallback((layerId: string) => {
    if (!layerId) return
    setSelectedLayers((prev) => (prev.includes(layerId) ? prev : [...prev, layerId]))
  }, [])

  const removeSkill = useCallback((skillId: string) => {
    setSelectedSkills((prev) => prev.filter((id) => id !== skillId))
  }, [])

  const removeLayer = useCallback((layerId: string) => {
    setSelectedLayers((prev) => prev.filter((id) => id !== layerId))
  }, [])

  const saveAgent = useCallback(() => {
    const formatError = validateAgentName(agentName)
    if (formatError) {
      showToast(formatError, 'error')
      return
    }
    const name = agentName.trim()
    if (!name) {
      showToast('Please enter a name for your agent.', 'error')
      return
    }

    const prev = savedAgentsRef.current
    const existing = prev.find((a) => a.name.toLowerCase() === name.toLowerCase())
    const payload: SavedAgent = {
      id: existing?.id ?? crypto.randomUUID(),
      name,
      profileId: selectedProfile,
      skillIds: selectedSkills,
      layerIds: selectedLayers,
      provider: selectedProvider || undefined,
    }
    const next = existing ? prev.map((a) => (a.id === existing.id ? payload : a)) : [...prev, payload]
    savedAgentsRef.current = next
    setSavedAgents(next)
    persistSavedAgents(next)
    setAgentName('')
    showToast(
      existing ? `Agent "${name}" updated successfully.` : `Agent "${name}" saved successfully.`,
      'success'
    )
  }, [selectedProfile, selectedSkills, selectedLayers, selectedProvider, agentName, showToast])

  const loadAgent = useCallback((agent: SavedAgent) => {
    setSelectedProfile(agent.profileId || '')
    setSelectedSkills([...(agent.skillIds || [])])
    setSelectedLayers([...(agent.layerIds || [])])
    setAgentName(agent.name)
    setSelectedProvider(agent.provider || '')
  }, [])

  const deleteAgent = useCallback(
    async (id: string) => {
      const prev = savedAgentsRef.current
      const agent = prev.find((a) => a.id === id)
      const label = agent?.name ?? 'this agent'
      const ok = await requestConfirm({
        title: 'Delete saved agent?',
        message: `This will permanently remove "${label}" from your device. This cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
      })
      if (!ok) return

      const next = prev.filter((a) => a.id !== id)
      savedAgentsRef.current = next
      setSavedAgents(next)
      persistSavedAgents(next)
      showToast(agent ? `Deleted "${agent.name}".` : 'Agent removed.', 'success')
    },
    [requestConfirm, showToast]
  )

  const clearAllSaved = useCallback(async () => {
    const ok = await requestConfirm({
      title: 'Clear all saved agents?',
      message: 'Every saved agent will be removed from this browser. You can rebuild them later.',
      confirmLabel: 'Clear all',
      cancelLabel: 'Keep',
    })
    if (!ok) return
    savedAgentsRef.current = []
    setSavedAgents([])
    persistSavedAgents([])
    showToast('All saved agents have been cleared.', 'success')
  }, [requestConfirm, showToast])

  return {
    data,
    loading,
    error,
    reloadConfiguration: reload,
    retryConfiguration: retry,
    selectedProfile,
    setSelectedProfile,
    selectedSkills,
    selectedLayers,
    addSkill,
    addLayer,
    removeSkill,
    removeLayer,
    agentName,
    setAgentName,
    selectedProvider,
    setSelectedProvider,
    savedAgents,
    saveAgent,
    loadAgent,
    deleteAgent,
    clearAllSaved,
  }
}

export type AgentBuilderLogic = ReturnType<typeof useAgentBuilderLogic>
