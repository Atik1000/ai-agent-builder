import { useEffect, useState } from 'react'

/** Isolated clock so only subscribers re-render each second. */
export function useSessionSeconds() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  return seconds
}
