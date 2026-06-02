interface OverlayProps {
  visible: boolean
  onClick: () => void
}

export function Overlay({ visible, onClick }: OverlayProps) {
  if (!visible) return null
  return (
    <div
      className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-[1px]"
      onClick={onClick}
    />
  )
}
