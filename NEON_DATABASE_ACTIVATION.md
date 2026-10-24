# تقرير تفعيل Neon PostgreSQL — Phase 1.6

**المشروع:** Money Coder Commercial Accounting

**تاريخ التحقق:** 24 أكتوبر 2026 — Africa/Cairo

**المستودع:** <https://github.com/AhmedMohamed500/Money-Coder-Commercial-Accounting>

**Vercel:** <https://money-coder-commercial-accounting.vercel.app>

## 1. الملخص التنفيذي

تم إنجاز كل ما يمكن التحقق منه بأمان من داخل بيئة العمل، لكن لم تُطبّق الهجرة على Neon لأن الوصول المتاح لا يحتوي رابط Direct لأي من فرعي `development` أو `production`، ولا Neon API key، كما أن واجهة Neon الرسمية لم تكن قابلة للوصول آليًا. لم يتم تخمين credentials، ولم تُستخدم وصلة Vercel المجمعة كوصلة إدارية، ولم يُنفذ أي أمر مدمر.

| النطاق | الحالة المثبتة | الحكم |
|---|---|---|
| PostgreSQL المعزولة المحلية | migration واحدة طُبقت؛ 19 جدول تطبيق؛ 7 اختبارات تكامل نجحت | جاهزة للاختبار |
| Neon `development` | الفرع مذكور في تكليف المشروع، لكن Direct URL/endpoint identity غير متاحين محليًا | لم تُهاجر بعد |
| Neon `production` | الفرع مذكور في التكليف، لكن Direct URL/endpoint identity غير متاحين محليًا | لم تُهاجر بعد |
| Vercel `DATABASE_URL` | موجود كـSecret في Production فقط | موجود لكن لم يُثبت pooling/SSL/branch |
| Vercel `APP_URL` | أضيف كـConfig إلى Production بالقيمة العامة الرسمية | مهيأ؛ ينتظر redeploy |
| نشر Vercel الحالي | READY؛ الصفحة 200؛ health يعيد 503 و`database=misconfigured` | يحتاج redeploy بعد إتمام الهجرة والتحقق |
| SMTP | متغيراته غير موجودة في Vercel | غير جاهز |
| Private Storage | لا يوجد adapter إنتاجي | معطل بأمان |

## 2. ما تمت مراجعته

- Git branch هو `main`، والمستودع remote هو المشروع الرسمي.
- كان آخر commit عند بدء Phase 1.6 هو `65a7d02c1efecf0754548f147cd0d6f8d5e6d6c8`.
- لم توجد تغييرات محلية غير محفوظة عند بدء التدقيق.
- Prisma هو `6.12.0` وdatasource هو PostgreSQL.
- توجد migration واحدة: `20261023160000_init`.
- تمت قراءة `schema.prisma` وملف SQL كاملًا قبل أي محاولة اتصال.
- لا توجد `.env` أو `.env.local` ضمن الملفات المتتبعة في Git، وكلاهما محميان بقواعد `.gitignore`.
- مشروع Vercel المرتبط هو `money-coder-commercial-accounting` بالمعرف `prj_kX9nRJYdUi7p2qGaI4hcOHkTqGeZ`.

## 3. مراجعة Migration SQL

| العنصر | العدد في SQL |
|---|---:|
| جداول التطبيق | 19 |
| Enum types | 7 |
| Foreign keys | 25 |
| Unique indexes | 17 |
| Non-unique indexes | 22 |
| `DROP` / `TRUNCATE` / `DELETE FROM` | 0 |

الهجرة إنشائية فقط. لا تحتوي أوامر حذف جداول أو حذف بيانات أو إعادة ضبط schema. جدول `_prisma_migrations` ينشئه Prisma، لذلك تصبح الجداول الفعلية بعد التطبيق الناجح 20 جدولًا: 19 جدول تطبيق + جدول سجل Prisma.

## 4. الجداول المطلوبة

1. `User`
2. `Session`
3. `EmailVerificationToken`
4. `PasswordResetToken`
5. `Organization`
6. `OrganizationMembership`
7. `OrganizationProfile`
8. `OrganizationAddress`
9. `CompanyLegalDetails`
10. `CompanyContact`
11. `CompanyBankAccount`
12. `CompanyAccountingSettings`
13. `CompanyFiscalYear`
14. `FileAsset`
15. `CompanyDocument`
16. `OfficeCompanyEngagement`
17. `EngagementStaff`
18. `Invitation`
19. `AuditEvent`

## 5. أداة التحقق الآمنة

أضيف الأمر التالي:

```powershell
npm run db:verify
```

الأداة `scripts/verify-neon-database.mjs` للقراءة فقط، ولا تطبع رابط الاتصال أو كلمة المرور. وهي ترفض التنفيذ ما لم يتحقق الآتي:

- المضيف تابع لـNeon.
- الاتصال Direct وليس `-pooler`.
- `sslmode` يفرض TLS.
- قاعدة البيانات هي `neondb`.
- endpoint الموجود في الرابط يطابق `EXPECTED_NEON_ENDPOINT_ID` الذي يؤخذ من صفحة الفرع في Neon.

بعد الاتصال تفحص الجداول، enums، القيود، الفهارس، `_prisma_migrations`، الهجرات الفاشلة، وعدد الصفوف في جداول التطبيق.

## 6. نتائج الاختبارات المنفذة

| الفحص | النتيجة |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS دون تحذيرات |
| `npm test` | 9 PASS، و7 اختبارات DB متخطاة عمدًا في الأمر العام |
| `npm run test:db` | migration PASS؛ 7/7 اختبارات تكامل PASS؛ لا skipped |
| `npm run build` | PASS |
| `npm run test:visual` | PASS على 390/768/1280/1440/1920px |

اختبارات قاعدة البيانات المعزولة غطت تسجيل شركة ومكتب، التحقق والدخول والخروج والاستعادة، حفظ ملف الشركة وبياناتها القانونية والضريبية والعنوان والبنك والسنة المالية، عزل شركتين، منع IDOR، التفويض وإلغاؤه، ومنع assignment من مكتب خاطئ. لم تُشغّل fixtures مدمرة على Neon.

## 7. حالة Vercel الفعلية

- `DATABASE_URL`: موجود كـSecret في `Production` فقط.
- `APP_URL`: أضيف كـConfig غير سري إلى Production بالقيمة العامة الرسمية.
- بقية المتغيرات المطلوبة (`AUTH_SECRET`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`): غير موجودة وقت التحقق.
- Vercel CLI لا يسمح بسحب قيمة الـSecret، وأعاد `[SENSITIVE]`؛ لذلك لم يكن ممكنًا إثبات أن الرابط pooled أو أنه يطلب SSL أو أنه يتبع فرع `production` من CLI وحده.
- آخر نشر متحقق: `dpl_97BFjF7h9ay8eo1ZNcz4LRzvs85Q`، أقدم من إضافة المتغير، وحالته READY.
- `/`: HTTP 200.
- `/auth/register`: HTTP 200 كصفحة واجهة فقط.
- `/api/health`: HTTP 503، والحالة `database=misconfigured`, `email=misconfigured`, `privateStorage=misconfigured`.
- السجلات الحديثة أظهرت الطلبات السابقة فقط، دون connection exhaustion أو stack traces أو أسرار.

لم يُنفذ redeploy لأن ترتيب الأمان المطلوب هو: التحقق من development ثم هجرته، ثم التحقق من production وهجرته، ثم تفعيل runtime pooled URL وإعادة النشر.

## 8. الإجراء اليدوي المطلوب — Development أولًا

لا تُرسل الرابط أو كلمة المرور في المحادثة. من Neon Console:

1. افتح المشروع `money-coder-commercial-accounting`.
2. اختر branch باسم `development` ثم database `neondb`.
3. من صفحة Compute دوّن Endpoint ID الذي يبدأ بـ`ep-`؛ هذا ليس كلمة المرور.
4. افتح Connect، عطّل Connection pooling، واختر Direct connection.
5. تأكد أن الرابط يحتوي `sslmode=require` أو وضعًا أشد.
6. في PowerShell محلي موثوق أدخل الرابط تفاعليًا كي لا يُحفظ في history:

```powershell
$phase16SecureUrl = Read-Host 'Neon development Direct URL' -AsSecureString
$phase16PlainUrl = [System.Net.NetworkCredential]::new('', $phase16SecureUrl).Password
$env:DATABASE_URL = $phase16PlainUrl
$env:EXPECTED_NEON_ENDPOINT_ID = 'ep-ID-FROM-DEVELOPMENT-BRANCH'
$env:EXPECTED_NEON_BRANCH = 'development'
$env:EXPECTED_DATABASE_NAME = 'neondb'

npm run db:verify -- --preflight
npm run db:deploy
npm run db:verify

Remove-Item Env:DATABASE_URL
Remove-Item Env:EXPECTED_NEON_ENDPOINT_ID
Remove-Item Env:EXPECTED_NEON_BRANCH
Remove-Item Env:EXPECTED_DATABASE_NAME
$phase16PlainUrl = $null
$phase16SecureUrl = $null
```

يجب أن يعرض التحقق النهائي:

- `applicationTableCount: 19`
- `migrationTablePresent: true`
- `migrationCount: 1`
- `failedMigrationCount: 0`
- `validSchema: true`

## 9. الإجراء اليدوي المطلوب — Production بعد نجاح Development

كرر الخطوات مع branch `production` وEndpoint ID الخاص به. قبل `db:deploy` راجع نتيجة `--preflight`:

- إذا كان `totalApplicationRows` أكبر من صفر أو ظهرت جداول غير متوقعة، أوقف التنفيذ وخذ Snapshot/وسيلة استعادة من Neon أولًا.
- لا تستخدم endpoint نفسه لفرعي development وproduction.
- لا تشغّل `db:seed` أو `test:db` أو fixtures على production.
- بعد نجاح الهجرة شغّل `npm run db:verify` وسجّل الناتج المنقّح فقط.

## 10. إكمال Vercel بعد الهجرة

1. في Vercel Production راجع `DATABASE_URL` من المصدر الآمن نفسه.
2. اختر Neon branch `production` وفعّل Connection pooling للرابط التشغيلي.
3. تأكد من TLS ومن أن hostname يحتوي `-pooler`.
4. لا تضع Direct URL في Vercel runtime ولا في Git.
5. `APP_URL=https://money-coder-commercial-accounting.vercel.app` أضيف بالفعل كـConfig غير سري.
6. أنشئ `AUTH_SECRET` عشوائيًا واحفظه كـSecret في Vercel؛ لا تضعه في Markdown.
7. لا تُدخل SMTP values قبل امتلاك credentials حقيقية وsender موثق.
8. أعد النشر، ثم افحص `/api/health` والسجلات.

الحالة الصحيحة الممكنة بعد اتصال قاعدة البيانات فقط هي HTTP 503 مع `database=connected` و`email=misconfigured` و`privateStorage=misconfigured`. هذا لا يعني فشل قاعدة البيانات.

## 11. الجاهزية النهائية

| المجال | الحالة الحالية |
|---|---|
| Database Ready | لا — Neon migrations لم تُنفذ من هذه البيئة |
| Authentication Ready | لا — قاعدة الإنتاج و`AUTH_SECRET` وE2E غير مثبتة |
| Email Ready | لا — SMTP غير مهيأ |
| Document Storage Ready | لا — production adapter غير مركب |
| Production Fully Ready | لا |

لا يمكن الانتقال إلى Phase 2 بعد. شرط الانتقال هو نجاح `db:verify` على الفرعين، إعادة نشر Vercel وظهور `database=connected`، ثم تهيئة SMTP واختبار رحلة البريد والمصادقة، مع بقاء رفع المستندات مغلقًا حتى تركيب تخزين خاص.

## 12. استكشاف الأخطاء

- **Endpoint mismatch:** أعد اختيار الفرع الصحيح في Neon، ولا تغيّر `EXPECTED_NEON_ENDPOINT_ID` لإسكات الفحص.
- **Pooler refused:** استخدم Direct URL من Connect للمهاجرات؛ pooled URL مخصص لـVercel runtime.
- **TLS refused:** أنشئ الرابط من Neon Console وتأكد من `sslmode=require`.
- **Migration failed:** لا تستخدم reset أو db push. احتفظ برسالة الخطأ المنقّحة وافحص `_prisma_migrations` وSQL قبل أي إصلاح.
- **بيانات أو جداول غير متوقعة:** أوقف الهجرة، خذ Snapshot، وحدد أصل البيانات أولًا.
- **Health ما زال misconfigured:** تأكد من redeploy أحدث من وقت إضافة Vercel secret، ثم راجع أن الرابط PostgreSQL كامل وTLS مفروض.

مراجع رسمية: [Neon branch isolation](https://neon.com/docs/get-started-with-neon/workflow-primer)، [Neon computes and endpoint IDs](https://neon.com/docs/manage/endpoints/)، [Prisma 6 connection URLs](https://www.prisma.io/docs/orm/v6/reference/connection-urls).
