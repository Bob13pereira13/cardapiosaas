import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://cardapiopedeai.com.br', lastModified: new Date() },
    { url: 'https://cardapiopedeai.com.br/auth/login', lastModified: new Date() },
  ];
}
