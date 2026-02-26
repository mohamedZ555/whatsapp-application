import prisma from '@/lib/prisma';
import ContactInboxClient from './client';

export default async function AdminContactInboxPage() {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  return <ContactInboxClient messages={messages} />;
}
