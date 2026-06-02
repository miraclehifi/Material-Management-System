import { useState, useCallback, useRef } from 'react'
import type { ToastState, ToastType } from '../types/fabric'

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'default', visible: false })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, type: ToastType = 'default') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, type, visible: true })
    timerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 3000)
  }, [])

  return { toast, showToast }
}
