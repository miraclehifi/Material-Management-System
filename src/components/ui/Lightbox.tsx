import type { LightboxState } from '../../types/fabric'

interface LightboxProps {
  lightbox: LightboxState | null
  onClose: () => void
}

export function Lightbox({ lightbox, onClose }: LightboxProps) {
  if (!lightbox) return null

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-3 max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={lightbox.src}
          alt={lightbox.name}
          className="max-w-full max-h-[78vh] object-contain rounded"
        />
        {lightbox.name && (
          <p className="text-slate-500 text-xs text-center truncate max-w-xs">{lightbox.name}</p>
        )}
        <button
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 transition-colors"
          onClick={onClose}
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
    </div>
  )
}
