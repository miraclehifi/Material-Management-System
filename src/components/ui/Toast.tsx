import type { ToastState } from '../../types/fabric'

interface ToastProps {
  toast: ToastState
}

const typeClass: Record<string, string> = {
  default: 'bg-slate-800',
  success: 'bg-green-700',
  warning: 'bg-amber-700',
  error: 'bg-red-700',
}

export function Toast({ toast }: ToastProps) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-lg text-white text-sm font-medium z-[9999] whitespace-nowrap transition-all duration-300 ${typeClass[toast.type] ?? typeClass.default} ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      {toast.message}
    </div>
  )
}
