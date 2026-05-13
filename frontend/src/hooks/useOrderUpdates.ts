'use client'

import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import type { Order, OrderStatus } from '@/lib/order-types'

type WhatsappPromptPayload = {
  orderId: number
  customerPhone: string
  customerName: string
}

type Callbacks = {
  onNew?: (order: Order) => void
  onStatusChanged?: (payload: { orderId: number; status: OrderStatus }) => void
  onPaymentConfirmed?: (payload: { orderId: number }) => void
  onWhatsappPrompt?: (payload: WhatsappPromptPayload) => void
  skip?: boolean
}

export function useOrderUpdates({
  onNew,
  onStatusChanged,
  onPaymentConfirmed,
  onWhatsappPrompt,
  skip = false,
}: Callbacks) {
  const [connected, setConnected] = useState(false)

  const onNewRef = useRef(onNew)
  const onStatusChangedRef = useRef(onStatusChanged)
  const onPaymentConfirmedRef = useRef(onPaymentConfirmed)
  const onWhatsappPromptRef = useRef(onWhatsappPrompt)

  // Update refs synchronously on every render — avoids stale closures without re-subscribing
  onNewRef.current = onNew
  onStatusChangedRef.current = onStatusChanged
  onPaymentConfirmedRef.current = onPaymentConfirmed
  onWhatsappPromptRef.current = onWhatsappPrompt

  useEffect(() => {
    if (skip) return
    const token = getToken()
    if (!token) return

    const socket = io(API_URL, { auth: { token } })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('order:new', (order: Order) => onNewRef.current?.(order))
    socket.on('order:status-changed', (payload: { orderId: number; status: OrderStatus }) =>
      onStatusChangedRef.current?.(payload),
    )
    socket.on('order:payment-confirmed', (payload: { orderId: number }) =>
      onPaymentConfirmedRef.current?.(payload),
    )
    socket.on('whatsapp:prompt', (payload: WhatsappPromptPayload) =>
      onWhatsappPromptRef.current?.(payload),
    )

    return () => {
      socket.disconnect()
    }
  }, [skip])

  return { connected }
}
