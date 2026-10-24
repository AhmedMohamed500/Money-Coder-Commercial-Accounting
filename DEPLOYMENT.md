# Deployment Guide

## حالة النشر الحالية

- Project: `money-coder-commercial-accounting`
- Production: `https://money-coder-commercial-accounting.vercel.app`
- آخر implementation deployment متحقق: commit `88fcd814ca915a6a4f4d6b888bd486adb46b79a9` — Vercel READY / success (`Deployment has completed`).
- Git integration: متصل بالمستودع الرسمي؛ فرع `main` أنشأ نشرًا إنتاجيًا تلقائيًا.
- الواجهة العامة تعمل. PostgreSQL والبريد مهيآن. طبقة Neon Object Storage الإنتاجية منفذة، لكن credentials/bucket لم يُتحقق منهما على الحساب؛ لذلك Production يظل degraded والرفع معطلًا عمدًا.
- Production smoke بعد Phase 1.7: الصفحة العامة والتسجيل 200، وhealth يعيد 503 المتوقع فقط لأن storage credentials غير مضافة؛ `database=connected`, `email=configured`, `privateStorage=misconfigured`.

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

المتغيرات المطلوبة لتشغيل الوظائف الكاملة: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`. يتطلب Neon Storage أيضًا `PRIVATE_STORAGE_PROVIDER=neon`, `PRIVATE_STORAGE_BUCKET`, `PRIVATE_STORAGE_ACCESS=private`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`. كلها server-side، ومفتاحا AWS أسرار. متغيرا n8n اختياريان.

ملف `.vercelignore` يمنع رفع ملفات `.env` المحلية ضمن artifact؛ أضف القيم من إعدادات Project Environment Variables فقط.

`/api/health` قد يعيد HTTP 503 رغم نجاح قاعدة البيانات والبريد لأن private storage غير مهيأ؛ اقرأ حالات الخدمات المنفصلة ولا تعتبر 503 وحده فشلًا في PostgreSQL.

## المستندات

Neon S3-compatible private adapter منفذ: رفع مباشر بتصريح قصير، تحقق server-side، تنزيل موقع 60 ثانية، عزل tenant، حذف قابل لإعادة المحاولة، وhealth connectivity/ACL check. لا توجد credentials فعلية في المستودع، لذلك الإنتاج يرفض التفعيل تلقائيًا. اتبع `INFRASTRUCTURE_SETUP.md` لإنشاء bucket خاص وبيئتي Development/Production. Malware scanning والنسخ الاحتياطي/retention التشغيلي ما زالا مطلوبين قبل المستندات الحقيقية عالية الحساسية.

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

## نتيجة Phase 1.7

- الحالة: **IMPLEMENTED — PRODUCTION ACTIVATION PENDING**.
- لا يوجد schema change أو migration؛ بيانات Production لم تُمس.
- اختبارات PostgreSQL والتخزين المعزولة تغطي الرفع للأربعة أنواع، IDOR، replay، expiry، cleanup، DB/storage failures، التنزيل والحذف.
- التفعيل يتطلب إعداد Neon/Vercel يدويًا والتحقق من `/api/health`; نجاح Vercel وحده لا يعني أن التخزين نشط.
