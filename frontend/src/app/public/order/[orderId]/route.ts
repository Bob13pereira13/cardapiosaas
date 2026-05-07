import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/config';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const response = await fetch(`${API_URL}/public/order/${orderId}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({}, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
