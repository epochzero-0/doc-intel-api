import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'

type UseBackendWakeOptions = {
  delayToShow?: number // ms before showing banner
  timeout?: number // request timeout
  maxAttempts?: number
}

export default function useBackendWake(opts?: UseBackendWakeOptions) {
  const { delayToShow = 3000, timeout = 10000, maxAttempts = 3 } = opts || {}
  const [showWakeBanner, setShowWakeBanner] = useState(false)
  const attemptRef = useRef(0)
  const delayTimer = useRef<number | null>(null)
  const active = useRef(true)

  const clearDelay = () => {
    if (delayTimer.current) {
      window.clearTimeout(delayTimer.current)
      delayTimer.current = null
    }
  }

  const ping = async () => {
    if (!active.current) return
    attemptRef.current += 1
    

    // show banner only after delay to avoid flicker for normal fast responses
    clearDelay()
    delayTimer.current = window.setTimeout(() => {
      setShowWakeBanner(true)
    }, delayToShow)

    try {
      // request root to wake instance (some hosts accept GET /)
      await api.get('/', { timeout })
      clearDelay()
      setShowWakeBanner(false)
    } catch (err) {
      clearDelay()
      setShowWakeBanner(true)
      if (attemptRef.current < maxAttempts) {
        // exponential backoff retry
        const backoff = 2000 * attemptRef.current
        setTimeout(() => {
          if (active.current) ping()
        }, backoff)
      }
    }
  }

  useEffect(() => {
    active.current = true
    attemptRef.current = 0
    ping()

    return () => {
      active.current = false
      clearDelay()
    }
    // intentionally run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retry = () => {
    ping()
  }

  return { showWakeBanner, retry }
}
