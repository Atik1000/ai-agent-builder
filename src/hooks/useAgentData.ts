import { useCallback, useEffect, useState } from 'react'
import type { AgentData } from '../types'

export function useAgentData() {
  const [data, setData] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const delay = Math.floor(Math.random() * 2000) + 1000
      await new Promise((resolve) => setTimeout(resolve, delay))

      const response = await fetch('/data.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const jsonData: AgentData = await response.json()
      setData(jsonData)
    } catch (err: unknown) {
      console.error('Error fetching data:', err)
      const message = err instanceof Error ? err.message : 'Failed to fetch agent data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, error, reload }
}
