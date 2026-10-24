# Deployment Guide

## حالة النشر الحالية

- Project: `money-coder-commercial-accounting`
- Production: `https://money-coder-commercial-accounting.vercel.app`
- آخر deployment متحقق: `https://money-coder-commercial-accounting-1tf3n2mhu.vercel.app` — READY، ID `dpl_97BFjF7h9ay8eo1ZNcz4LRzvs85Q`.
- Git integration: متصل بالمستودع الرسمي؛ فرع `main` أنشأ نشرًا إنتاجيًا تلقائيًا.
- الواجهة العامة تعمل. PostgreSQL والبريد مهيآن؛ health يثبت `database=connected` و`email=configured`. التخزين الخاص وحده غير مهيأ، لذلك تبقى الحالة العامة degraded.

## GitHub

المستودع الرسمي الوحيد: `https://github.com/AhmedMohamed500/Money-Coder-Commercial-Accounting.git`، والفرع الإنتاجي `main`. افحص `git status` و`git diff --cached` قبل الدفع، ولا ترفع `.env` أو `storage/`.

## PostgreSQL

1. أنشئ PostgreSQL مستضافة (مثل Neon أو مزود مكافئ) دون تفعيل billing تلقائيًا، مع Production وTest منفصلتين.
2. ضع runtime pooled `DATABASE_URL` الذي يطلب TLS في Vercel فقط.
3. من بيئة CI/إدارية منفصلة نفذ `npm run db:deploy` عبر direct TLS connection قبل تفعيل الوظائف.
4. شغّل `npm run test:db` محليًا، أو `RUN_DB_TESTS=1 npm test` على قاعدة اختبار منفصلة، ولا تشغّل fixtures على الإنتاج.

التسلسل الملزم لـNeon هو `development` أولًا ثم `production`. استخدم `npm run db:verify -- --preflight` قبل الهجرة و`npm run db:verify` بعدها، مع endpoint ID الصحيح لكل فرع. راجع `NEON_DATABASE_ACTIVATION.md`.

لا تستخدم PostgreSQL الجهاز المحلي من Vercel، ولا تستخدم SQLite كبديل إنتاجي.

## Vercel

اسم المشروع: `money-coder-commercial-accounting`، Framework: Next.js، Build: `npm run build`.

المتغيرات المطلوبة لتشغيل الوظائف الكاملة: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`. يلزم `PRIVATE_STORAGE_PROVIDER` عند تركيب adapter إنتاجية. متغيرا n8n اختياريان وغير مطلوبين في Phase 1.5.

ملف `.vercelignore` يمنع رفع ملفات `.env` المحلية ضمن artifact؛ أضف القيم من إعدادات Project Environment Variables فقط.

`/api/health` قد يعيد HTTP 503 رغم نجاح قاعدة البيانات والبريد لأن private storage غير مهيأ؛ اقرأ حالات الخدمات المنفصلة ولا تعتبر 503 وحده فشلًا في PostgreSQL.

## المستندات

موفر التخزين الخاص الإنتاجي غير منفذ بعد. رفع الملفات يرفض في `NODE_ENV=production`؛ هذه حماية مقصودة. قبل تفعيله يلزم adapter خاص (private bucket)، signed/authorized download، lifecycle rules، malware scanning ونسخ احتياطي. اتبع `INFRASTRUCTURE_SETUP.md`.

## Smoke Test

بعد النشر:

1. افتح الصفحة الرئيسية وتحقق من HTTPS والهوية وRTL.
2. افحص `/api/health`.
3. إذا كانت الخدمات مكتملة: أنشئ حساب اختبار، أكد البريد، سجّل الدخول وأنشئ ملف شركة.
4. اختبر مستخدمًا ثانيًا ومحاولة رابط شركة أخرى (يجب 404/403).
5. لا تستخدم مستندات أو بيانات شركة حقيقية في الاختبار.

## نتيجة Phase 1.6

- PostgreSQL 17 مؤقتة: اتصال ناجح.
- `prisma migrate deploy`: migration واحدة مطبقة بنجاح.
- اختبارات DB/API: 7 PASS دون skipped داخل `npm run test:db`.
- Neon Development وProduction: 19 جدول تطبيق وmigration سليمة؛ Production data محفوظة.
- Production database وSMTP: مهيآن ومتصّلان.
- Private storage: غير مهيأ؛ الرفع معطل بوضوح.
