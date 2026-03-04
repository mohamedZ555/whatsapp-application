import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { USER_ROLES } from "@/lib/constants";

const dateEn = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
const dateAr = new Date().toLocaleDateString("ar-EG", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const SEED_PAGES = [
  {
    slug: "terms",
    title: "Terms of Service | شروط الخدمة",
    content: `
<div lang="en">
<h2>Terms of Service</h2>
<p>Last updated: ${dateEn}</p>
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
<p>If you have any questions about these Terms, please contact us through our contact page.</p>
</div>

<hr style="margin: 2rem 0;" />

<div lang="ar" dir="rtl">
<h2>شروط الخدمة</h2>
<p>آخر تحديث: ${dateAr}</p>
<h3>1. قبول الشروط</h3>
<p>بالوصول إلى FadaaWhats ("الخدمة") واستخدامها، فإنك توافق على الالتزام بشروط الخدمة هذه. إذا كنت لا توافق على هذه الشروط، يُرجى عدم استخدام الخدمة.</p>
<h3>2. استخدام الخدمة</h3>
<p>تُقدّم FadaaWhats منصة مراسلة WhatsApp للأعمال. توافق على استخدام الخدمة لأغراض مشروعة فحسب ووفقًا لسياسة WhatsApp للأعمال.</p>
<h3>3. مسؤوليات الحساب</h3>
<p>أنت مسؤول عن الحفاظ على سرية بيانات اعتماد حسابك، وتوافق على إخطارنا فورًا بأي استخدام غير مصرح به لحسابك.</p>
<h3>4. الاستخدامات المحظورة</h3>
<p>لا يجوز لك استخدام الخدمة لإرسال رسائل غير مرغوب فيها أو أي محتوى ينتهك القوانين أو اللوائح المعمول بها.</p>
<h3>5. خصوصية البيانات</h3>
<p>يخضع استخدامك للخدمة أيضًا لسياسة الخصوصية الخاصة بنا، والمُدرجة بالإحالة في هذه الشروط.</p>
<h3>6. الإنهاء</h3>
<p>نحتفظ بالحق في إنهاء حسابك أو تعليقه وفقًا لتقديرنا المطلق، دون إشعار مسبق، في حال انتهاك هذه الشروط أو الإضرار بالمستخدمين أو الأطراف الأخرى.</p>
<h3>7. التعديلات على الشروط</h3>
<p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. استمرارك في استخدام الخدمة بعد أي تغيير يُعدّ قبولًا للشروط الجديدة.</p>
<h3>8. تواصل معنا</h3>
<p>إذا كان لديك أي أسئلة حول هذه الشروط، تواصل معنا عبر صفحة الاتصال.</p>
</div>`,
  },
  {
    slug: "privacy",
    title: "Privacy Policy | سياسة الخصوصية",
    content: `
<div lang="en">
<h2>Privacy Policy</h2>
<p>Last updated: ${dateEn}</p>
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
<p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
</div>

<hr style="margin: 2rem 0;" />

<div lang="ar" dir="rtl">
<h2>سياسة الخصوصية</h2>
<p>آخر تحديث: ${dateAr}</p>
<h3>1. المعلومات التي نجمعها</h3>
<p>نجمع المعلومات التي تُقدّمها لنا مباشرةً، مثل اسمك وبريدك الإلكتروني ورقم هاتف WhatsApp للأعمال عند إنشاء حساب.</p>
<h3>2. كيف نستخدم معلوماتك</h3>
<p>نستخدم المعلومات التي نجمعها لتقديم خدماتنا وصيانتها وتحسينها، ولمعالجة المعاملات وإرسال الإشعارات التقنية ورسائل الدعم.</p>
<h3>3. مشاركة المعلومات</h3>
<p>لا نشارك معلوماتك الشخصية مع أطراف ثالثة إلا كما هو موضح في هذه السياسة أو بموافقتك. قد نشارك البيانات مع مزودي الخدمة الذين يساعدوننا في تشغيل منصتنا.</p>
<h3>4. أمن البيانات</h3>
<p>نُطبّق تدابير تقنية وتنظيمية مناسبة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التغيير أو الإفصاح أو الإتلاف.</p>
<h3>5. الاحتفاظ بالبيانات</h3>
<p>نحتفظ بمعلوماتك الشخصية طالما كان حسابك نشطًا أو حسب الحاجة لتقديم الخدمات. يمكنك طلب حذف بياناتك في أي وقت.</p>
<h3>6. ملفات تعريف الارتباط</h3>
<p>نستخدم ملفات تعريف الارتباط وتقنيات تتبع مماثلة لتتبع النشاط على خدمتنا وتحسين تجربتك.</p>
<h3>7. حقوقك</h3>
<p>يحق لك الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها. لممارسة هذه الحقوق، تواصل معنا عبر صفحة الاتصال.</p>
<h3>8. التغييرات على هذه السياسة</h3>
<p>قد نُحدّث سياسة الخصوصية هذه من وقت لآخر. سنُخطرك بأي تغييرات عن طريق نشر سياسة الخصوصية الجديدة على هذه الصفحة.</p>
</div>`,
  },
];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { roleId?: number } | undefined;
  if (user?.roleId !== USER_ROLES.SUPER_ADMIN)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const results = [];
  for (const pageData of SEED_PAGES) {
    const existing = await prisma.page.findUnique({
      where: { slug: pageData.slug },
    });
    if (!existing) {
      const page = await prisma.page.create({
        data: {
          title: pageData.title,
          slug: pageData.slug,
          content: pageData.content,
          showInMenu: false,
          status: 1,
        },
      });
      results.push({ slug: pageData.slug, action: "created", id: page.id });
    } else {
      // Update existing pages to bilingual content
      await prisma.page.update({
        where: { id: existing.id },
        data: { title: pageData.title, content: pageData.content },
      });
      results.push({ slug: pageData.slug, action: "updated", id: existing.id });
    }
  }

  return NextResponse.json({ results });
}
