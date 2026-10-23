# Deployment Guide

## حالة النشر الحالية

- Project: `money-coder-commercial-accounting`
- Production: `https://money-coder-commercial-accounting.vercel.app`
- Git integration: متصل بالمستودع الرسمي؛ فرع `main` أنشأ نشرًا إنتاجيًا تلقائيًا.
- الواجهة العامة تعمل، لكن لا توجد Project Environment Variables حاليًا؛ لذلك قاعدة البيانات والبريد والتخزين الخاص غير متاحة.

## GitHub

المستودع الرسمي الوحيد: `https://github.com/AhmedMohamed500/Money-Coder-Commercial-Accounting.git`، والفرع الإنتاجي `main`. افحص `git status` و`git diff --cached` قبل الدفع، ولا ترفع `.env` أو `storage/`.

## PostgreSQL

1. أنشئ PostgreSQL مستضافة على خطة مناسبة (Neon أو Supabase أو مزود مكافئ) دون تفعيل billing تلقائيًا.
2. ضع `DATABASE_URL` في Vercel فقط.
3. من بيئة CI/إدارية منفصلة نفذ `npm run db:deploy` قبل تفعيل الوظائف.
4. شغّل `RUN_DB_TESTS=1 npm test` على قاعدة اختبار منفصلة، لا على الإنتاج.

لا تستخدم PostgreSQL الجهاز المحلي من Vercel، ولا تستخدم SQLite كبديل إنتاجي.

## Vercel

اسم المشروع: `money-coder-commercial-accounting`، Framework: Next.js، Build: `npm run build`.

المتغيرات المطلوبة لتشغيل الوظائف الكاملة: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`. متغيرا n8n اختياريان وغير مطلوبين في Phase 1.

ملف `.vercelignore` يمنع رفع ملفات `.env` المحلية ضمن artifact؛ أضف القيم من إعدادات Project Environment Variables فقط.

إن لم تتوفر قاعدة البيانات والبريد، يمكن نشر Landing Page فقط. التسجيل يعاد بـ503 صريحًا ولا يمثل وظيفة متاحة. `/api/health` يعرض `degraded` دون كشف أسرار.

## المستندات

موفر التخزين الخاص الإنتاجي غير منفذ بعد. رفع الملفات يرفض في `NODE_ENV=production`؛ هذه حماية مقصودة. قبل تفعيله يلزم adapter خاص (private bucket)، signed/authorized download، lifecycle rules، malware scanning ونسخ احتياطي.

## Smoke Test

بعد النشر:

1. افتح الصفحة الرئيسية وتحقق من HTTPS والهوية وRTL.
2. افحص `/api/health`.
3. إذا كانت الخدمات مكتملة: أنشئ حساب اختبار، أكد البريد، سجّل الدخول وأنشئ ملف شركة.
4. اختبر مستخدمًا ثانيًا ومحاولة رابط شركة أخرى (يجب 404/403).
5. لا تستخدم مستندات أو بيانات شركة حقيقية في الاختبار.
