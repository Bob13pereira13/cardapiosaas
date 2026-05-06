'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { SettingsTabs } from '@/components/admin/SettingsTabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const LS_SOUND = 'notif_sound';
const LS_BROWSER = 'notif_browser';

export default function NotificacoesPage() {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [browserEnabled, setBrowserEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSoundEnabled(localStorage.getItem(LS_SOUND) === 'true');
    setBrowserEnabled(localStorage.getItem(LS_BROWSER) === 'true');

    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (handleUnauthorized(res)) return null; return res.json(); })
      .then((data) => data && setEmailEnabled(Boolean(data.notifEmailNewOrder)))
      .catch(() => undefined);
  }, []);

  function toggleSound(value: boolean) {
    setSoundEnabled(value);
    localStorage.setItem(LS_SOUND, String(value));
    toast.success(value ? 'Som ativado.' : 'Som desativado.');
  }

  async function toggleBrowser(value: boolean) {
    if (value && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Permissao de notificacao negada pelo navegador.');
        return;
      }
    }
    setBrowserEnabled(value);
    localStorage.setItem(LS_BROWSER, String(value));
    toast.success(value ? 'Notificacoes do navegador ativadas.' : 'Notificacoes do navegador desativadas.');
  }

  async function saveEmail(value: boolean) {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notifEmailNewOrder: value }),
      });
      if (handleUnauthorized(res)) return;
      if (res.ok) {
        setEmailEnabled(value);
        toast.success(value ? 'Email de novo pedido ativado.' : 'Email de novo pedido desativado.');
      } else {
        toast.error('Erro ao salvar.');
      }
    } finally {
      setSaving(false);
    }
  }

  function testNotification() {
    if (browserEnabled && Notification.permission === 'granted') {
      new Notification('cardapio.pede.ai', {
        body: 'Novo pedido recebido! 🎉',
        icon: '/icon-192.png',
      });
    }
    toast.success('Notificacao de teste enviada!');
  }

  const items = [
    {
      key: 'sound',
      title: 'Som ao receber novo pedido',
      description: 'Toca um som quando um pedido chega. Salvo no navegador.',
      checked: soundEnabled,
      onChange: toggleSound,
    },
    {
      key: 'browser',
      title: 'Notificacao no navegador',
      description: 'Exibe uma notificacao push quando o painel esta em segundo plano.',
      checked: browserEnabled,
      onChange: toggleBrowser,
    },
    {
      key: 'email',
      title: 'Email para novo pedido',
      description: 'Receba um email quando um pedido for criado.',
      checked: emailEnabled,
      onChange: saveEmail,
      disabled: saving,
    },
  ];

  return (
    <div className="space-y-5">
      <SettingsTabs />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" /> Notificacoes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          {items.map((item, index) => (
            <div key={item.key}>
              {index > 0 && <Separator />}
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">{item.title}</p>
                  <p className="text-xs text-zinc-500">{item.description}</p>
                </div>
                <Switch
                  checked={item.checked}
                  onCheckedChange={item.onChange}
                  disabled={item.disabled}
                />
              </div>
            </div>
          ))}
          <Separator />
          <div className="px-6 py-4">
            <Button variant="outline" size="sm" onClick={testNotification}>
              Testar notificacao
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
