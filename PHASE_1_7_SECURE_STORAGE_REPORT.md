# Phase 1.7 — Secure Private Document Storage

**الحالة: IMPLEMENTED — PRODUCTION ACTIVATION PENDING**
تاريخ التقرير: 25 أكتوبر 2026

## 1. الملخص التنفيذي

اكتملت قاعدة تخزين مستندات خاصة ومعزولة لكل مؤسسة باستخدام adapter معياري يدعم Neon Object Storage S3، مع بقاء local adapter للتطوير وtest-memory adapter للاختبارات. لم يُنشأ bucket فعلي ولم تُضاف credentials لأن Neon Console طلب تسجيل دخول غير متاح في جلسة التنفيذ؛ لذلك لا يدّعي هذا التقرير أن التخزين الإنتاجي نشط، وتظل واجهة الرفع في Production معطلة برسالة واضحة حتى ينجح فحص الاتصال والخصوصية.

لم يحدث أي تعديل في Prisma schema أو migration، ولم تُشغّل اختبارات على Neon Production، ولم تُرفع مستندات عملاء، ولم تُفعّل خدمة مدفوعة.

## 2. الحالة الأولية

- كان `src/lib/storage.ts` يعتمد على filesystem محلي ويوقف التشغيل في Production.
- كان upload يمر كاملًا كـmultipart عبر Next/Vercel Function، وهو غير مناسب لحد Vercel request body البالغ 4.5MB مع حد ملف واجهة 5MB.
- التحقق كان محدودًا إلى بدايات signatures، وXLSX لم يكن يتحقق كـOffice Open XML workbook.
- الحذف كان يضع soft delete ثم يتجاهل فشل الحذف المادي، وhealth يتحقق من configuration فقط.
- الواجهة كانت تخفي الرفع إنتاجيًا بصورة آمنة، ولم تكن هناك credentials أو adapter إنتاجية.

## 3. المزود ودليل الإتاحة والتكلفة

الاختيار: **Neon Object Storage** لأنه المزود الموجود أصلًا لقاعدة البيانات، ويوفر S3-compatible private buckets وpresigned GET/PUT. وفق الوثائق الرسمية:

- [Object Storage overview](https://neon.com/docs/storage/overview): Free تعرض 5GB Object Storage لكل مشروع، والمنطقة `aws-eu-central-1` مدعومة.
- [Neon pricing](https://neon.com/pricing): خطة Free قيمتها $0 ولا تتطلب بطاقة وفق صفحة التسعير وقت المراجعة.
- [Storage quickstart](https://neon.com/docs/storage/get-started): أسماء credentials الرسمية هي `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` مع S3 path-style.
- [Authentication](https://neon.com/docs/storage/authentication): credentials مرتبطة بالفرع، ويمكن للخادم إصدار presigned URLs قصيرة العمر.
- [Objects](https://neon.com/docs/storage/objects) و[S3 compatibility](https://neon.com/docs/storage/s3-compatibility): عمليات Head/Get/Put/Delete/Copy/List وpresigned GET/PUT مدعومة.
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations) و[direct upload guidance](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions): request/response payload محدود 4.5MB ويوصى بالرفع المباشر للمخزن.

تم التأكد من أن endpoint الحالي لقاعدة المشروع في `eu-central-1`، وهي منطقة مدعومة. لم يمكن التحقق من خطة الحساب الحالية أو quota المتبقية أو وجود Storage tab/bucket لأن Console وصل إلى شاشة تسجيل الدخول. هذه نقطة تفعيل يدوية وليست فشل implementation.

## 4. ما تم تنفيذه

### التخزين

- `PrivateStorageAdapter` بعمليات availability، presigned upload، put/head/read/copy/delete/list pending، وpresigned download.
- `NeonStorageAdapter` باستخدام AWS SDK modular، HTTPS endpoint، path style، retries و8-second abort timeout.
- فحص اتصال حقيقي بـ`HeadBucket`، مع اشتراط `PRIVATE_STORAGE_ACCESS=private`. Neon يدير access عبر Console/API ولا يدعم تغييره عبر S3 ACL، لذلك تبقى مراجعة private setting يدويًا شرط تفعيل منفصلًا.
- `LocalStorageAdapter` خارج Production فقط، مع sidecar metadata ومسارات محمية.
- `TestMemoryStorageAdapter` للاختبارات المعزولة وحقن أعطال availability/delete/promote.
- مفاتيح server-generated فقط: `organizations/{organizationId}/pending/{uuid}` ثم `organizations/{organizationId}/{uuid}`.

### تدفق الرفع

1. المستخدم المصادق يطلب تصريحًا للمنظمة المحددة.
2. الخادم يتحقق من `documents:manage`، metadata، quota، document count، وrate limit.
3. HMAC ticket مرتبط بالمستخدم والمنظمة والمفتاحين والنوع والحجم والعنوان، وصلاحيته 5 دقائق افتراضيًا.
4. المتصفح يرفع مباشرة إلى pending object عبر presigned PUT؛ لا تمر bytes عبر Vercel Function في Production.
5. finalization يتحقق من ownership والتوقيت وعدم replay، ثم HEAD وGET للـobject الفعلي.
6. الخادم يعيد التحقق من metadata والحجم والمحتوى وSHA-256، ثم Copy إلى final key غير قابل للكتابة من التصريح القديم.
7. `FileAsset`, `CompanyDocument`, logo link عند الحاجة، وAuditEvent تُكتب في Prisma transaction واحدة.
8. عند فشل DB بعد promotion تُحذف النسختان. الملفات الباطلة والـexpired pending تُنظف، وهناك opportunistic orphan cleanup.

### التحقق من الملفات

- PDF: header وEOF marker.
- PNG: signature وIEND.
- JPEG: SOI/EOI.
- XLSX: ZIP central directory محدود، required Office Open XML entries، منع encrypted entries/path traversal/macros، حد entry count، إجمالي uncompressed 64MB، وحد compression ratio.
- السماح فقط بـPDF/PNG/JPEG/XLSX، max 5MB افتراضيًا وحتى 10MB configuration ceiling، منع zero bytes، extension/MIME match، filename normalization وحد 180 حرفًا.
- SHA-256 محفوظ في `FileAsset`.

هذه الفحوص لا تستبدل malware scanning. يلزم AV/quarantine قبل اعتبار النظام مناسبًا لكل مستند مالي حقيقي.

## 5. العزل والصلاحيات والتنزيل والحذف

- كل init/finalize/cancel/delete يطلب `documents:manage`; التنزيل يطلب `documents:view`.
- المستخدم المعلق، التفويض الملغى، أو tenant مختلف مرفوض وفق طبقة authorization الموجودة.
- unauthorized/missing download وdelete يعيدان 404 عامًا؛ لا storage key أو credential في الأخطاء.
- Neon download URL يُنشأ بعد authorization فقط وصلاحيته 60 ثانية؛ local/test streams server-controlled.
- Responses تحمل `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` وContent-Disposition آمن.
- الحذف soft أولًا، يفصل logo، ثم physical delete مع verification. فشل المزود يعيد 503 و`physicalDeletionPending=true`، وطلب الحذف المتكرر يعيد المحاولة بأمان.
- Audit events: upload، download، delete requested، deleted، وphysical delete pending.

## 6. الواجهة

تم الحفاظ على تصميم Atelier Finance وRTL والخطوة السادسة. أضيف direct upload progress، loading/disabled state، نجاح بعد finalization فقط، أخطاء واضحة، عرض التصنيف والحجم، تنزيل مصرح، وحذف بتأكيد. الرسالة التالية تبقى عند عدم جاهزية التخزين:

> رفع المستندات غير متاح مؤقتًا حتى تفعيل التخزين الآمن.

## 7. نتائج الاختبارات

`npm run test:db` استخدم PostgreSQL 17 مؤقتة وtest-memory storage فقط: **3 ملفات، 24 اختبار PASS، 0 skipped**. لم تُستخدم Neon Development أو Production.

| # | الحالة المطلوبة | النتيجة |
|---:|---|---|
| 1–4 | PDF / PNG / JPEG / XLSX authorized upload-download | PASS |
| 5 | invalid MIME | PASS (unit metadata allowlist) |
| 6 | disguised executable | PASS + pending cleanup |
| 7 | oversize | PASS |
| 8 | zero byte | PASS |
| 9 | missing session | PASS |
| 10–12 | cross-company upload/download/delete | PASS |
| 13 | suspended permission | PASS |
| 14 | expired ticket | PASS + cleanup |
| 15 | replayed finalize | PASS، سجل واحد فقط |
| 16 | failed/invalid upload cleanup | PASS |
| 17 | DB failure after promotion | PASS، لا pending/final orphan |
| 18 | missing object download | PASS، 503 آمن |
| 19 | provider outage | PASS، 503 بلا secrets |
| 20 | authorized/repeated deletion | PASS |
| 21 | no public access | PASS في adapter/test route؛ bucket ACL فعلي pending |
| 22 | no secret leakage | PASS في responses؛ لا secrets مضافة للمستودع |
| 23 | registration/onboarding regression | PASS ضمن auth integration |
| 24 | unrelated company data unchanged | PASS |

الفحوص النهائية: `npm run typecheck` PASS، `npm run lint` PASS دون warnings، `npm test` = 17 PASS، `npm run test:db` = 24 PASS، `npm run build` PASS وظهر 32 route/page entries، و`npm run test:visual` PASS على 390/768/1280/1440/1920 مع RTL ودون horizontal overflow.

## 8. GitHub وVercel

- Implementation commit SHA: **يُضاف بعد اكتمال التحقق والـcommit**.
- Vercel deployment: **يُحدّث بعد push والتحقق من READY**.
- Storage activation: **غير نشط**؛ READY deployment وحده لا يثبت التخزين.

## 9. التشغيل والتكلفة والقيود المتبقية

- App quota الافتراضي 100MB و100 مستند نشط لكل مؤسسة؛ Free provider quota المعلن 5GB للمشروع.
- rate limiter الحالي in-memory ومناسب كحاجز أساسي، لكنه يحتاج distributed limiter عند التوسع الأفقي.
- orphan cleanup opportunistic ومحدود لأول 100 object؛ job دوري/monitoring مطلوب للحجم الأكبر.
- يجب تحديد retention، backup، legal hold، secure deletion expectations، ومراجعة Neon soft-delete semantics قبل بيانات حقيقية.
- CORS وbucket privacy وbranch isolation تحتاج تحققًا على Neon Development ثم Production.
- لا malware scanning/quarantine أو DLP في Phase 1.7.
- لا paid upgrade أو provider بديل تم تفعيله.

## 10. الإجراء اليدوي المطلوب

اتبع قسم **Neon Object Storage الخاص — خطوات التفعيل اليدوي** في `INFRASTRUCTURE_SETUP.md`: سجّل الدخول إلى Neon، تحقق من Free/5GB الفعلية، أنشئ private bucket `money-coder-documents` على `development` أولًا، أنشئ credentials محدودة خاصة بالفرع، اضبط CORS للـorigin المطلوب، أضف Secrets إلى بيئة اختبار، تحقق من `privateStorage=connected` ونفّذ الاختبار الوهمي. بعد نجاحه فقط كرر بإعداد منفصل لـProduction وأعد النشر.

لا ترسل credentials إلى هذه المحادثة ولا تحفظها في Markdown أو GitHub.
