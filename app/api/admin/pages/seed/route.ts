import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { USER_ROLES } from '@/lib/constants';

const SEED_PAGES = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    content: `<h2>Terms of Service</h2>
<p>Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
<h3>1. Acceptance of Terms</h3>
<p>By accessing and using FadaaWhats ("the Service"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
<h3>2. Use of Service</h3>
<p>FadaaWhats provides a WhatsApp Business messaging platform. You agree to use the Service only for lawful purposes and in accordance with WhatsApp's Business Policy.</p>
<h3>3. Account Responsibilities</h3>
<p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account.</p>
<h3>4. Prohibited Uses</h3>
<p>You may not use the Service to send spam, unsolicited messages, or any content that violates applicable laws or regulations.</p>
<h3>5. Data Privacy</h3>
<p>Your use of the Service is also governed by our Privacy Policy, which is incorporated by reference into these Terms.</p>
<h3>6. Termination</h3>
<p>We reserve the right to terminate or suspend your account at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.</p>
<h3>7. Changes to Terms</h3>
<p>We reserve the right to modify these Terms at any time. Continued use of the Service after any such changes constitutes your acceptance of the new Terms.</p>
<h3>8. Contact Us</h3>
<p>If you have any questions about these Terms, please contact us through our contact page.</p>`,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    content: `<h2>Privacy Policy</h2>
<p>Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
<h3>1. Information We Collect</h3>
<p>We collect information you provide directly to us, such as your name, email address, and WhatsApp business number when you create an account.</p>
<h3>2. How We Use Your Information</h3>
<p>We use the information we collect to provide, maintain, and improve our services, to process transactions, and to send technical notices and support messages.</p>
<h3>3. Information Sharing</h3>
<p>We do not share your personal information with third parties except as described in this policy or with your consent. We may share data with service providers who assist us in operating our platform.</p>
<h3>4. Data Security</h3>
<p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
<h3>5. Data Retention</h3>
<p>We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your data at any time.</p>
<h3>6. Cookies</h3>
<p>We use cookies and similar tracking technologies to track activity on our Service and hold certain information to improve your experience.</p>
<h3>7. Your Rights</h3>
<p>You have the right to access, correct, or delete your personal data. To exercise these rights, please contact us through our contact page.</p>
<h3>8. Changes to This Policy</h3>
<p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>`,
  },
];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { roleId?: number } | undefined;
  if (user?.roleId !== USER_ROLES.SUPER_ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const results = [];
  for (const pageData of SEED_PAGES) {
    const existing = await prisma.page.findUnique({ where: { slug: pageData.slug } });
    if (!existing) {
      const page = await prisma.page.create({
        data: { title: pageData.title, slug: pageData.slug, content: pageData.content, showInMenu: false, status: 1 },
      });
      results.push({ slug: pageData.slug, action: 'created', id: page.id });
    } else {
      results.push({ slug: pageData.slug, action: 'exists', id: existing.id });
    }
  }

  return NextResponse.json({ results });
}
