import type { Metadata } from 'next';
import { API_URL } from '@/lib/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetch(`${API_URL}/public/cardapio/${slug}`)
    .then((response) => response.json())
    .catch(() => null);

  if (!data) return { title: 'Cardapio' };

  return {
    title: `${data.nome} - Cardapio`,
    description: `Peca online no cardapio de ${data.nome}`,
    openGraph: {
      title: data.nome,
      images: data.logo ? [data.logo] : [],
    },
  };
}

export default function CardapioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
