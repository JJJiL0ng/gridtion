// src/app/[locale]/page.tsx
// import { useTranslations } from 'next-intl';
import ImageGridCreator from '@/components/ImageGridCreator';

export default function Home() {
  // const t = useTranslations('common');
  
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Gridion</h1>
      <p className="mb-6">Gridion is a tool that allows you to create a grid of images from a single image.</p>
      
      <ImageGridCreator />
    </main>
  );
}