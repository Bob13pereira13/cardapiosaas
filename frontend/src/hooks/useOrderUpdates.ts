'use client'

import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'
import type { Order, OrderStatus } from '@/lib/order-types'

type Callbacks = {
  onNew?: (order: Order) => void
  onStatusChanged?: (payload: { orderId: number; status: OrderStatus }) => void
  onPaymentConfirmed?: (payload: { orderId: number }) => void
  skip?: boolean
}

export function useOrderUpdates({
  onNew,
  onStatusChanged,
  onPaymentConfirmed,
  skip = false,
}: Callbacks) {
  const onNewRef = useRef(onNew)
  const onStatusChangedRef = useRef(onStatusChanged)
  const onPaymentConfirmedRef = useRef(onPaymentConfirmed)

  // Update refs synchronously on every render — avoids stale closures without re-subscribing
  onNewRef.current = onNew
  onStatusChangedRef.current = onStatusChanged
  onPaymentConfirmedRef.current = onPaymentConfirmed

  useEffect(() => {
    if (skip) return
    const token = getToken()
    if (!token) return

    const socket = io(API_URL, { auth: { token } })

    socket.on('order:new', (order: Order) => onNewRef.current?.(order))
    socket.on('order:status-changed', (payload: { orderId: number; status: OrderStatus }) =>
      onStatusChangedRef.current?.(payload),
    )
    socket.on('order:payment-confirmed', (payload: { orderId: number }) =>
      onPaymentConfirmedRef.current?.(payload),
    )

    return () => {
      socket.disconnect()
    }
  }, [skip])
}
