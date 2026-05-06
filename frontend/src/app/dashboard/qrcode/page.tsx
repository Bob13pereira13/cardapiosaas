'use client';

import { useEffect, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { API_URL, APP_URL } from '@/lib/config';
import { getToken, handleUnauthorized } from '@/lib/auth';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function QrCodePage() {
  const [slug, setSlug] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }
    fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (handleUnauthorized(response)) return null;
        return response.json();
      })
      .then((data) => setSlug(data?.slug ?? ''))
      .catch(() => undefined);
  }, []);

  const publicUrl = slug ? `${APP_URL}/cardapio/${slug}` : '';

  return (
    <div className="space-y-5">
      <PageHeader title="QR Code" description="Compartilhe o cardapio publico em mesas, embalagens e redes sociais." />
      <Card>
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[320px_1fr]">
          <div className="flex min-h-80 items-center justify-center rounded-lg border bg-white p-4">
            {slug ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${API_URL}/public/qrcode/${slug}`} alt="QR Code do cardapio" className="h-72 w-72" />
            ) : (
              <span className="text-sm text-zinc-500">Configure o slug do restaurante.</span>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-950">URL publica</p>
              <p className="mt-2 rounded-md border bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{publicUrl || 'Indisponivel'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={!publicUrl} onClick={() => navigator.clipboard.writeText(publicUrl)}>
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
              <Button asChild disabled={!slug} className="bg-brand-red hover:bg-brand-red/90">
                <a href={`${API_URL}/public/qrcode/${slug}/png`} download>
                  <Download className="h-4 w-4" />
                  Baixar PNG
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
