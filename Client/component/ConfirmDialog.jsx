import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId()
  const descriptionId = useId()
  const cancelRef = useRef(null)
  const confirmRef = useRef(null)
  const busyRef = useRef(busy)
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    busyRef.current = busy
    onCancelRef.current = onCancel
  }, [busy, onCancel])

  useEffect(() => {
    if (!open) return undefined

    const previousActive = document.activeElement
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    cancelRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busyRef.current) {
        onCancelRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const first = cancelRef.current
      const last = confirmRef.current

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousActive?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <span className="modal-kicker">Confirm delete</span>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{message}</p>
        <div className="modal-actions">
          <button
            className="btn ghost"
            type="button"
            ref={cancelRef}
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="btn danger"
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmDialog
