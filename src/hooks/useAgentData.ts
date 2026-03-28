import { useCallback, useEffect, useState } from 'react'
import type { AgentData } from '../types'

async function fetchAgentData(): Promise<AgentData> {
  const delay = Math.floor(Math.random() * 2000) + 1000
  await new Promise((resolve) => setTimeout(resolve, delay))

  const response = await fetch('/data.json')
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json() as Promise<AgentData>
}

export function useAgentData() {
  const [data, setData] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const jsonData = await fetchAgentData()
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
    load()
  }, [load])

  /** Same as load; use after a failed fetch to retry. */
  const retry = useCallback(() => {
    void load()
  }, [load])

  return { data, loading, error, reload: load, retry }
}
