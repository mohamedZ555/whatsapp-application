import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function DynamicPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const tCommon = await getTranslations('common');
  const page = await prisma.page.findFirst({
    where: { slug, status: 1 },
  });

  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline mb-8">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {tCommon('back')}
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{page.title}</h1>
      <article
        className="prose prose-gray max-w-none prose-headings:font-bold prose-a:text-green-600"
        dangerouslySetInnerHTML={{ __html: page.content ?? '' }}
      />
    </div>
  );
}
