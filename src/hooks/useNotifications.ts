import { useContext } from 'react'
import { NotificationsContext } from '../context/notifications-context'

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return ctx
}
