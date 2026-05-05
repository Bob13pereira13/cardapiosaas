import { NextRequest, NextResponse } from 'next/server';

function normalizeHost(host: string) {
  return host.split(':')[0]?.toLowerCase().replace(/^www\./, '') || '';
}

function configuredHost(value?: string) {
  if (!value) return undefined;
  try {
    return normalizeHost(new URL(value.startsWith('http') ? value : `https://${value}`).host);
  } catch {
    return undefined;
  }
}

export function proxy(request: NextRequest) {
  const host = normalizeHost(request.headers.get('host') || '');
  const appHost = configuredHost(process.env.NEXT_PUBLIC_APP_URL);
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  const isPlatformDomain = !host || isLocalhost || host === appHost;
  const pathname = request.nextUrl.pathname;

  if (
    isPlatformDomain ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/uploads') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/cardapio/domain${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api).*)'],
};
