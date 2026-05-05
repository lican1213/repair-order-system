import { useCallback, useEffect, useRef, useState } from 'react'
import { getNewOrderNotifications } from '../api/orders'
import type { Order } from '../types/order'
import { getNewOrderAlertTitle } from '../utils/orderCopy'

const DEFAULT_INTERVAL_MS = 25_000

function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const audioContext = new AudioContextClass()
    const play = () => {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.value = 0.08
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.18)
      oscillator.onended = () => {
        void audioContext.close().catch(() => {})
      }
    }

    const resume = audioContext.state === 'suspended'
      ? audioContext.resume()
      : Promise.resolve()

    void resume.then(play).catch(() => {
      void audioContext.close().catch(() => {})
    })
  } catch {
    // Browser autoplay policies may block sound. Visual alerts still work.
  }
}

export function useNewOrderNotifications(intervalMs = DEFAULT_INTERVAL_MS) {
  const [count, setCount] = useState(0)
  const [orders, setOrders] = useState<Order[]>([])
  const afterIdRef = useRef<number | null>(null)
  const countRef = useRef(0)
  const baseTitleRef = useRef(typeof document === 'undefined' ? '' : document.title)
  const titleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTitleBlink = useCallback(() => {
    if (titleTimerRef.current) {
      clearInterval(titleTimerRef.current)
      titleTimerRef.current = null
    }
    document.title = baseTitleRef.current
  }, [])

  const startTitleBlink = useCallback((nextCount: number) => {
    stopTitleBlink()
    let visible = false
    titleTimerRef.current = setInterval(() => {
      visible = !visible
      document.title = visible ? getNewOrderAlertTitle(nextCount) : baseTitleRef.current
    }, 1200)
  }, [stopTitleBlink])

  const clear = useCallback(() => {
    countRef.current = 0
    setCount(0)
    setOrders([])
    stopTitleBlink()
  }, [stopTitleBlink])

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      const previousAfterId = afterIdRef.current
      try {
        const res = await getNewOrderNotifications(previousAfterId ?? 0)
        if (cancelled) return

        afterIdRef.current = res.latest_id
        if (previousAfterId === null) return
        if (res.count <= 0) return

        const nextCount = countRef.current + res.count
        countRef.current = nextCount
        setCount(nextCount)
        setOrders((prev) => [...res.orders, ...prev].slice(0, 20))
        startTitleBlink(nextCount)
        playNotificationSound()
      } catch {
        // Polling failures must not affect normal admin usage.
      }
    }

    void poll()
    const timer = setInterval(() => {
      void poll()
    }, intervalMs)

    return () => {
      cancelled = true
      clearInterval(timer)
      stopTitleBlink()
    }
  }, [intervalMs, startTitleBlink, stopTitleBlink])

  return { count, orders, clear }
}
