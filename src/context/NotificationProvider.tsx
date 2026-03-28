import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import type { ToastVariant } from './notifications-context'
import { NotificationsContext } from './notifications-context'

type ToastItem = { id: string; message: string; variant: ToastVariant }

type ConfirmState = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  resolve: (value: boolean) => void
} | null

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const titleId = useId()
  const descId = useId()

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, variant }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4200)
  }, [])

  const requestConfirm = useCallback(
    (opts: {
      title: string
      message: string
      confirmLabel?: string
      cancelLabel?: string
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmState({
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel ?? 'Confirm',
          cancelLabel: opts.cancelLabel ?? 'Cancel',
          resolve,
        })
      })
    },
    []
  )

  const value = useMemo(
    () => ({ showToast, requestConfirm }),
    [showToast, requestConfirm]
  )

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const closeConfirm = useCallback((result: boolean) => {
    setConfirmState((prev) => {
      prev?.resolve(result)
      return null
    })
  }, [])

  useEffect(() => {
    if (!confirmState) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeConfirm(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmState, closeConfirm])

  return (
    <NotificationsContext.Provider value={value}>
      {children}

      <div className="ab-toast-region" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`ab-toast ab-toast--${t.variant} ab-toast--enter`}
          >
            <p className="ab-toast__text">{t.message}</p>
            <button type="button" className="ab-toast__close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="ab-modal-backdrop" role="presentation" onClick={() => closeConfirm(false)}>
          <div
            className="ab-modal ab-glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="ab-modal__title">
              {confirmState.title}
            </h2>
            <p id={descId} className="ab-modal__message">
              {confirmState.message}
            </p>
            <div className="ab-modal__actions">
              <button type="button" className="ab-btn ab-btn--ghost" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel}
              </button>
              <button type="button" className="ab-btn ab-btn--danger" onClick={() => closeConfirm(true)}>
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationsContext.Provider>
  )
}
