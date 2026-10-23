# Infrastructure Setup — Money Coder Phase 1.5

هذا الدليل يهيئ الخدمات الحقيقية دون تضمين credentials أو بيانات عملاء في Git. لا تفعّل billing أو خطة مدفوعة إلا بموافقة صاحب المشروع.

## 1. PostgreSQL

يمكن استخدام Neon أو Supabase أو Render أو أي PostgreSQL مُدارة تدعم TLS. المطلوب بيئتان منفصلتان على الأقل:

- Production: بيانات التشغيل فقط.
- Test/Preview: migrations والاختبارات، ولا تحتوي بيانات حقيقية.

خطوات Neon النموذجية:

1. أنشئ حسابًا ومشروعًا يدويًا من لوحة Neon واختر المنطقة الأقرب.
2. أنشئ database أو branch مستقلًا للاختبار.
3. احصل من لوحة المزود على runtime pooled URL للإنتاج، واتصال direct للإدارة/migrations إن كان المزود يفرق بينهما.
4. تأكد أن الاتصال يطلب TLS (`sslmode=require` أو وضع تحقق أشد يدعمه المزود).
5. ضع runtime URL باسم `DATABASE_URL` داخل Vercel Project Settings، وليس في Git.
6. لتطبيق migration، شغّل الأمر من جهاز/CI موثوق مع تعيين `DATABASE_URL` مؤقتًا إلى direct administrative URL:

```powershell
$env:DATABASE_URL = "<DIRECT-TLS-URL-FROM-PROVIDER>"
npm ci
npm run db:deploy
Remove-Item Env:DATABASE_URL
```

لا تستخدم `prisma db push` أو `migrate reset` على Production. راجع migration SQL قبل التطبيق وخذ نسخة احتياطية عندما تصبح هناك بيانات.

## 2. متغيرات Vercel

أضف الأسماء التالية من Settings → Environment Variables بالقيم الحقيقية، دون نسخها إلى ملفات التوثيق:

| الاسم | Production | Preview/Test | ملاحظة |
|---|---|---|---|
| `DATABASE_URL` | مطلوب | قاعدة منفصلة | runtime pooled + TLS |
| `APP_URL` | مطلوب | URL البيئة | origin كامل HTTPS |
| `AUTH_SECRET` | مطلوب | قيمة مختلفة | 32 بايت عشوائية أو أكثر |
| `EMAIL_FROM` | مطلوب | عنوان اختبار | sender موثق لدى SMTP |
| `SMTP_HOST` | مطلوب | مطلوب لاختبار البريد | |
| `SMTP_PORT` | مطلوب | مطلوب | 465 أو 587 حسب المزود |
| `SMTP_USER` | مطلوب | مطلوب | Secret |
| `SMTP_PASSWORD` | مطلوب | مطلوب | Secret |
| `PRIVATE_STORAGE_PROVIDER` | مطلوب للرفع | مطلوب | لا توجد production adapter مركبة بعد |
| `MAX_UPLOAD_BYTES` | اختياري | اختياري | الافتراضي 5MB |

بعد أي تغيير متغيرات، أعد النشر ثم افحص `/api/health`. لا تنسخ قيم Production إلى Preview.

## 3. SMTP

1. اختر مزود SMTP يدعم sender/domain verification.
2. وثّق النطاق وأكمل SPF وDKIM حسب تعليمات المزود.
3. أنشئ credentials مخصصة للتطبيق بصلاحية الإرسال فقط.
4. أضف القيم إلى Vercel.
5. اختبر: تسجيل حساب، وصول رابط التحقق، استخدامه مرة واحدة، forgot/reset، ودعوة موظف.
6. راقب bounce/complaint ولا تسجل token أو رابطًا سريًا في logs.

في التطوير فقط تعيد API روابط التحقق والاستعادة إلى العميل لاختبار التدفق. هذا السلوك غير موجود عند `NODE_ENV=production`.

## 4. Private document storage

الوضع الحالي آمن-معطل في Production. قبل التفعيل اختر private bucket يدعم server-side credentials وsigned/authenticated downloads، ثم نفذ adapter داخل `src/lib/storage.ts`.

قائمة الدمج الإلزامية:

- bucket خاص بلا public ACL أو directory listing.
- مفاتيح خدمة محدودة للbucket والعمليات المطلوبة.
- storage key عشوائي لا يعتمد على filename.
- تحقق organization authorization قبل كل upload/download/delete.
- حد حجم، allowlist للأنواع، وفحص magic bytes؛ وmalware scanning قبل الملفات الحقيقية.
- تشفير at rest، lifecycle policy، نسخة احتياطية، وسياسة retention/delete.
- حذف آمن أو compensating cleanup عند فشل transaction.
- اختبارات IDOR للتنزيل والحذف، وسجل AuditEvent.

لا تستخدم `/public` أو نظام ملفات Vercel أو GitHub لتخزين مستندات الشركات.

## 5. قاعدة الاختبار المحلية

الطريقة الموصى بها دون Docker:

```powershell
npm run test:db
```

تنزل الأداة PostgreSQL 17 الموثقة عبر npm إلى `.cache/local-postgres/`، تنشئ cluster تحت temp، تطبق migration، تشغّل الاختبارات مع `RUN_DB_TESTS=1`، ثم توقف الخادم وتحذف cluster. لا توجه هذا الأمر إلى Production.

يمكن أيضًا استخدام قاعدة اختبار مُدارة منفصلة:

```powershell
$env:DATABASE_URL = "<TEST-DATABASE-URL>"
$env:RUN_DB_TESTS = "1"
npm run db:deploy
npm test
```

## 6. فحوص الأمان قبل التفعيل

- تأكد أن `git ls-files` لا يحتوي `.env` أو `storage/`.
- شغّل typecheck وlint والوحدات و`test:db` وbuild وvisual smoke.
- اختبر Company A مقابل Company B بمعرفات معدلة وتنزيل مستند مباشر.
- اختبر تعليق عضو وإلغاء تفويض مكتب، ثم أعد استخدام session قديمة.
- اختبر انتهاء verification/reset token واستخدامه مرة واحدة.
- افحص أن `/api/health` لا يعرض قيمًا سرية.
- استبدل in-memory IP rate limiting بخدمة موزعة قبل حمل إنتاجي متعدد instances؛ قفل الحساب نفسه محفوظ في PostgreSQL.

## 7. ترتيب النشر الآمن

1. أنشئ Production DB وTest DB منفصلتين.
2. شغّل `npm run test:db` محليًا.
3. راجع وطبق migrations على Production عبر direct TLS URL.
4. أضف runtime pooled `DATABASE_URL` وSMTP إلى Vercel.
5. انشر وافحص health؛ اختبر بحسابات وهمية لا ببيانات عملاء.
6. لا تفعّل رفع المستندات حتى اكتمال adapter واختباراته.
7. فعّل backups والمراقبة والتنبيهات.
8. لا تبدأ Phase 2 قبل نجاح E2E إنتاجي موثق ومسح أمني نهائي.
