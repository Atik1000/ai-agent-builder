import { createContext } from 'react'

export type ToastVariant = 'success' | 'error'

export type NotificationsContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void
  requestConfirm: (opts: {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
  }) => Promise<boolean>
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null)
