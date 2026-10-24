# Infrastructure Setup — Money Coder Phase 1.7

> الحالة التنفيذية الفعلية وخطوات Neon الآمنة موجودة في `NEON_DATABASE_ACTIVATION.md`. لا تعتبر قاعدة Neon مفعلة قبل نجاح `npm run db:verify` على `development` ثم `production`.

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

قبل التنفيذ اضبط `EXPECTED_NEON_ENDPOINT_ID` من صفحة Compute للفرع، ثم شغّل `npm run db:verify -- --preflight`. بعد `db:deploy` شغّل `npm run db:verify`. أداة التحقق ترفض pooled URL أو اتصال Neon لا يطابق endpoint المتوقع، ولا تطبع السر.

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
| `PRIVATE_STORAGE_PROVIDER` | `neon` بعد التحقق | `neon` أو `local-dev` محليًا | لا تستخدم `local-dev` في Production |
| `PRIVATE_STORAGE_BUCKET` | مطلوب للتفعيل | bucket منفصل | اسم مقترح `money-coder-documents` |
| `PRIVATE_STORAGE_ACCESS` | `private` فقط | `private` فقط | إقرار تشغيلي بأن access مضبوط من Neon؛ غير سري |
| `AWS_ACCESS_KEY_ID` | Secret مطلوب | Secret مختلف | Storage credential؛ ليس متغيرًا عامًا |
| `AWS_SECRET_ACCESS_KEY` | Secret مطلوب | Secret مختلف | لا يُنسخ إلى المتصفح أو Git |
| `AWS_ENDPOINT_URL_S3` | مطلوب | endpoint الفرع المنفصل | Neon S3 HTTPS endpoint |
| `AWS_REGION` | مطلوب | مطلوب | منطقة Neon الفعلية |
| `MAX_UPLOAD_BYTES` | اختياري | اختياري | الافتراضي 5MB |
| `STORAGE_UPLOAD_TTL_SECONDS` | اختياري | اختياري | 60–600 ثانية؛ الافتراضي 300 |
| `ORGANIZATION_STORAGE_QUOTA_BYTES` | اختياري | اختياري | الافتراضي 100MB لكل مؤسسة |
| `ORGANIZATION_DOCUMENT_LIMIT` | اختياري | اختياري | الافتراضي 100 مستند نشط |

بعد أي تغيير متغيرات، أعد النشر ثم افحص `/api/health`. لا تنسخ قيم Production إلى Preview.

## 3. SMTP

1. اختر مزود SMTP يدعم sender/domain verification.
2. وثّق النطاق وأكمل SPF وDKIM حسب تعليمات المزود.
3. أنشئ credentials مخصصة للتطبيق بصلاحية الإرسال فقط.
4. أضف القيم إلى Vercel.
5. اختبر: تسجيل حساب، وصول رابط التحقق، استخدامه مرة واحدة، forgot/reset، ودعوة موظف.
6. راقب bounce/complaint ولا تسجل token أو رابطًا سريًا في logs.

في التطوير فقط تعيد API روابط التحقق والاستعادة إلى العميل لاختبار التدفق. هذا السلوك غير موجود عند `NODE_ENV=production`.

## 4. Neon Object Storage الخاص — خطوات التفعيل اليدوي

الـadapter الإنتاجي منفذ، لكن الرفع يظل آمنًا ومعطلًا حتى تنجح connectivity/ACL check فعلية. وفق [Neon Object Storage overview](https://neon.com/docs/storage/overview)، الخطة Free موثقة بسعة 5GB للمشروع، ومنطقة المشروع الحالية `eu-central-1` مدعومة. يجب مع ذلك التأكد داخل الحساب من أهلية المشروع الفعلية قبل الإنشاء؛ لا تضف billing ولا ترقِّ الخطة.

### أ. إنشاء بيئة Development أولًا

1. افتح [Neon Console](https://console.neon.tech/) وسجّل الدخول بنفس حساب المشروع. لا ترسل أي مفتاح في محادثة أو issue أو screenshot.
2. افتح مشروع Money Coder، ثم اختر branch `development`. من صفحة **Storage** تحقق أن Object Storage متاح وأن الخطة ما زالت Free.
3. أنشئ bucket خاصًا باسم `money-coder-documents` إن لم يكن موجودًا. اترك access خاصًا؛ لا تختَر `public_read` أو anonymous access. راجع [إدارة buckets](https://neon.com/docs/storage/buckets).
4. أنشئ credentials محدودة لهذا الفرع وبصلاحيات القراءة والكتابة المطلوبة فقط. انسخ مرة واحدة القيم الموثقة في [Neon storage quickstart](https://neon.com/docs/storage/get-started): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`.
5. لا تفترض أن bucket ظهر في branch قديم تلقائيًا. افتح branch `development` نفسه وتأكد من ظهور bucket/credentials الخاصة به.
6. اضبط CORS للـbucket ليقبل فقط origins المطلوبة (مثل URL Preview أو localhost للاختبار)، والطريقة `PUT`، والـheaders الموقعة التي يعيدها التطبيق، وليس `*` مع origins غير موثوقة. احتفظ بالتنزيل عبر GET موقع قصير العمر من الخادم. راجع [عمليات objects وpresigned URLs](https://neon.com/docs/storage/objects).
7. في ملف `.env.local` غير المتتبع أو Vercel Preview Secrets اضبط:

```text
PRIVATE_STORAGE_PROVIDER=neon
PRIVATE_STORAGE_BUCKET=money-coder-documents
PRIVATE_STORAGE_ACCESS=private
AWS_ACCESS_KEY_ID=<development credential>
AWS_SECRET_ACCESS_KEY=<development secret>
AWS_ENDPOINT_URL_S3=<development HTTPS endpoint>
AWS_REGION=eu-central-1
```

8. أعد التشغيل، ثم افحص `/api/health`. المطلوب `privateStorage=connected`، لا مجرد وجود المتغيرات.
9. استخدم حسابًا وملف PDF وهميًا صغيرًا: ارفع، حدّث الصفحة، نزّل وقارن المحتوى، جرّب حساب مؤسسة أخرى، ثم احذف. لا تستخدم بيانات عميل حقيقية.

### ب. تفعيل Production بعد نجاح Development

1. كرر الخطوات على branch `production` وبـbucket/credentials خاصة به. لا تعِد استخدام مفاتيح Development.
2. أضف المتغيرات السابقة إلى Vercel → Project → Settings → Environment Variables → **Production**. علّم access key وsecret كـSecrets، ولا تستخدم بادئة `NEXT_PUBLIC_`.
3. تحقق داخل Neon أن bucket ما زال `private` ثم اضبط `PRIVATE_STORAGE_ACCESS=private`. Neon يدير مستوى access عبر Console/API وليس S3 ACL؛ التطبيق يرفض configuration إن لم يوجد هذا الإقرار، ويستخدم `HeadBucket` للتحقق الفعلي من الاتصال، لكن المراجعة اليدوية داخل Neon تظل إلزامية.
4. أعد Redeploy. افحص `/api/health`، ثم نفّذ اختبارًا وهميًا صغيرًا فقط بعد موافقة صريحة على الاختبار الإنتاجي.
5. إذا ظهر quota error، أوقف الرفع أو نظف ملفات اختبار مصرح بها فقط؛ لا تفعل paid upgrade تلقائيًا.

### ج. التدوير والإلغاء

أنشئ credential بديلًا محدودًا، حدّث Vercel، أعد النشر وتحقق من health، ثم revoke المفتاح القديم من Neon. عند الاشتباه في تسريب، revoke فورًا ولا تسجل القيمة في logs. تنزيلات التطبيق قصيرة العمر (60 ثانية) وتصاريح الرفع 5 دقائق افتراضيًا.

التطبيق يستخدم مفاتيح عشوائية تحت `organizations/{organizationId}/{uuid}`، ولا يخزن الملفات في `/public` أو Vercel filesystem. التحقق الحالي يشمل signatures وXLSX structure وSHA-256، لكنه ليس malware scanner؛ أضف quarantine/AV قبل استقبال مستندات حقيقية عالية الخطورة. Lifecycle configuration في Neon S3 يجب التحقق منها عمليًا؛ لا تعتمد عليها للحذف دون متابعة.

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
6. لا تفعّل رفع المستندات حتى نجاح `privateStorage=connected` واختبار Development المعزول.
7. فعّل backups والمراقبة والتنبيهات.
8. لا تبدأ Phase 2 قبل نجاح E2E إنتاجي موثق ومسح أمني نهائي.
