# Money Coder Commercial Accounting

تطبيق SaaS محاسبي متعدد الكيانات. ينفذ **Phase 1 — Company & Office Foundation**: الهوية الآمنة، ملفات الشركات ومكاتب المحاسبة، العضويات والصلاحيات، الحسابات البنكية، المستندات المحلية المحمية للاختبار، والتفويض بين المكتب والشركة.

الواجهة العامة المنشورة: https://money-coder-commercial-accounting.vercel.app — وظائف الحسابات معطلة في الإنتاج حتى تهيئة PostgreSQL وSMTP والتخزين الخاص.

> لا تتضمن هذه المرحلة دليل الحسابات أو القيود أو القوائم المالية. هذه العناصر موثقة في `PHASES_ROADMAP.md` فقط.

## التقنيات

- Next.js 16 App Router، React 19، TypeScript strict، Tailwind CSS 4.
- PostgreSQL 16 وPrisma ORM.
- جلسات خادمية عشوائية مخزنة كـSHA-256، وكلمات مرور bcrypt (cost 12).
- Zod للتحقق، React Hook Form متاح للنماذج الممتدة، Lucide Icons.
- Vitest للاختبارات، وطبقة n8n موقعة HMAC وغير مفعلة دون إعداد.

## التشغيل المحلي

1. انسخ `.env.example` إلى `.env` وغيّر `AUTH_SECRET` وكلمة مرور PostgreSQL المحلية.
2. شغّل قاعدة البيانات: `docker compose up -d`.
3. طبّق الهجرات: `npm run db:deploy`.
4. شغّل التطبيق: `npm run dev`.
5. افتح `http://localhost:3000`.

في التطوير فقط، تعيد واجهة التسجيل رابط تأكيد البريد مباشرة لتسهيل الاختبار. هذا السلوك لا يعمل في الإنتاج. في الإنتاج يتعطل التسجيل إذا لم تكن خدمة SMTP مهيأة.

## أوامر الجودة

```text
npm run typecheck
npm run lint
npm test
npm run build
RUN_DB_TESTS=1 npm test
```

الاختبار الأخير يحتاج PostgreSQL متاحة ومطبقة عليها migration. لا تعتبر نتيجة اختبارات الوحدة بديلًا عن اختبار التكامل.

## متغيرات البيئة

الأسماء فقط موثقة في `.env.example`. لا تضع القيم في Git:

- `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`
- `MAX_UPLOAD_BYTES`
- `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET` (اختياريان، للمراحل القادمة)

## حدود التخزين

رفع المستندات يعمل محليًا داخل `storage/` غير المتتبع. في الإنتاج يُرفض الرفع صراحةً حتى يضاف موفر private object storage؛ لا يستخدم التطبيق نظام ملفات Vercel كتخزين دائم.

راجع [PROJECT_STATUS.md](PROJECT_STATUS.md) للحالة الدقيقة و[DEPLOYMENT.md](DEPLOYMENT.md) للنشر.
