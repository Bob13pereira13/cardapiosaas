'use client';

import { FormEvent, useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Order = { id: number; orderNumber: number; total: number; createdAt: string; orderStatus: string };

export default function MinhaContaPage() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [userId, setUserId] = useState('');
  const [step, setStep] = useState<'PHONE' | 'PIN' | 'ACCOUNT'>('PHONE');
  const [orders, setOrders] = useState<Order[]>([]);
  const [points, setPoints] = useState(0);

  async function loadAccount(token = localStorage.getItem('customer_token')) {
    if (!token) return;
    const [meRes, ordersRes] = await Promise.all([
      fetch(`${API_URL}/customer/me`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/customer/orders`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (meRes.ok) {
      const me = await meRes.json();
      setPoints(me.loyalty?.balance ?? me.loyaltyPoints?.[0]?.points ?? 0);
    }
    if (ordersRes.ok) setOrders(await ordersRes.json());
    setStep('ACCOUNT');
  }

  useEffect(() => {
    void loadAccount();
  }, []);

  async function requestPin(event: FormEvent) {
    event.preventDefault();
    const res = await fetch(`${API_URL}/customer/auth/request-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, userId: Number(userId) }),
    });
    if (res.ok) setStep('PIN');
  }

  async function verifyPin(event: FormEvent) {
    event.preventDefault();
    const res = await fetch(`${API_URL}/customer/auth/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, userId: Number(userId), pin }),
    });
    if (!res.ok) return;
    const data = await res.json();
    localStorage.setItem('customer_token', data.access_token ?? data.token);
    await loadAccount(data.access_token ?? data.token);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="text-3xl font-black text-zinc-950">Minha conta</h1>
        {step !== 'ACCOUNT' ? (
          <Card>
            <CardHeader><CardTitle>Acessar pedidos</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={step === 'PHONE' ? requestPin : verifyPin}>
                <div className="space-y-2">
                  <Label>Codigo do restaurante</Label>
                  <Input value={userId} onChange={(event) => setUserId(event.target.value)} inputMode="numeric" required />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={phone} onChange={(event) => setPhone(event.target.value)} required />
                </div>
                {step === 'PIN' && (
                  <div className="space-y-2">
                    <Label>PIN</Label>
                    <Input value={pin} onChange={(event) => setPin(event.target.value.slice(0, 4))} inputMode="numeric" required />
                  </div>
                )}
                <Button className="bg-brand-red hover:bg-brand-red/90">{step === 'PHONE' ? 'Receber PIN' : 'Entrar'}</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-zinc-500">Pontos de fidelidade</p>
                <p className="text-3xl font-black text-brand-red">{points}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Historico de pedidos</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="flex justify-between rounded-lg border p-3 text-sm">
                    <span>Pedido #{order.orderNumber} - {order.orderStatus}</span>
                    <strong>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
