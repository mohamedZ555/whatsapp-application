import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DynamicPage({ params }: Props) {
  const tCommon = await getTranslations('common');
  const { slug } = await params;
  const page = await prisma.page.findUnique({
    where: { slug, status: 1 },
  });

  if (!page) notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="text-sm text-green-600 hover:underline mb-6 inline-block">
          {'<-'} {tCommon('back')}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{page.title}</h1>
        <div
          className="prose prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content ?? '' }}
        />
      </div>
    </div>
  );
}
