# تقرير تفعيل Neon PostgreSQL — Phase 1.6

**المشروع:** Money Coder Commercial Accounting

**تاريخ التحقق:** 25 أكتوبر 2026 — Africa/Cairo

**المستودع:** <https://github.com/AhmedMohamed500/Money-Coder-Commercial-Accounting>

**Vercel:** <https://money-coder-commercial-accounting.vercel.app>

## 1. الملخص التنفيذي

اكتمل التحقق الآمن من فرعي Neon عبر Direct TLS URLs محلية متجاهلة من Git. الهجرة الأولية مطبقة بنجاح على `development` و`production`، ولا توجد migrations فاشلة. لم تُنفذ أوامر reset أو db push أو seed أو fixtures على Neon.

| النطاق | الحالة المثبتة | الحكم |
|---|---|---|
| PostgreSQL المعزولة المحلية | migration واحدة طُبقت؛ 19 جدول تطبيق؛ 7 اختبارات تكامل نجحت | جاهزة للاختبار |
| Neon `development` | endpoint مطابق، Direct TLS، 19 جدول تطبيق، migration ناجحة، صفر بيانات تطبيق | جاهز |
| Neon `production` | endpoint مطابق، Direct TLS، 19 جدول تطبيق، migration ناجحة، 23 سجلًا وقت الفحص | جاهز مع بيانات فعلية محفوظة |
| Vercel `DATABASE_URL` | موجود كـSecret في Production؛ health يثبت الاتصال | متصل |
| Vercel `APP_URL` | موجود كـConfig في Production | مهيأ |
| نشر Vercel الحالي | health: database connected وemail configured | يعمل جزئيًا بسبب التخزين |
| SMTP | متغيراته موجودة وhealth يعرض configured | مهيأ |
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

- `DATABASE_URL` و`AUTH_SECRET` و`SMTP_PASSWORD`: Secrets في Production.
- `APP_URL`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`: Config في Production.
- `/api/health`: HTTP 503 degraded مع `database=connected`, `email=configured`, `privateStorage=misconfigured`.
- 503 سببه التخزين وحده ولا يعني فشل PostgreSQL أو SMTP.
- Vercel يحجب القيم الحساسة كما ينبغي، ولم تُسحب أو تُكتب في التقارير.

## 8. تحقق Development

- Branch label: `development`.
- Endpoint identity: مطابق للقيمة المحلية المتوقعة.
- Connection: Direct، `sslmode=require`، database `neondb`.
- PostgreSQL: 18.6 وقت الفحص.
- 19 جدول تطبيق + `_prisma_migrations`.
- migration `20261023160000_init`: finished، غير rolled back.
- Failed migrations: صفر.
- Application rows: صفر.

## 9. تحقق Production

- Branch label: `production`.
- Endpoint identity: مطابق للقيمة المحلية المتوقعة لفرع Production.
- Connection: Direct، `sslmode=require`، database `neondb`.
- PostgreSQL: 18.6 وقت الفحص.
- 19 جدول تطبيق + `_prisma_migrations`.
- migration `20261023160000_init`: finished، غير rolled back.
- Failed migrations: صفر.
- Application rows: 23 وقت الفحص؛ لم تُعدّل أو تُحذف.

## 10. تشغيل Vercel

يستخدم التطبيق runtime secret على Vercel، بينما استُخدمت الملفات المحلية Direct للقراءة والتحقق الإداري فقط. لا توجد Direct credentials في الكود أو Git أو المتصفح العام.

## 11. الجاهزية النهائية

| المجال | الحالة الحالية |
|---|---|
| Database Ready | نعم — schema وmigration والاتصال مثبتة |
| Authentication Ready | نعم للتدفقات المختبرة؛ إصلاح فقد البيانات ينتظر النشر والتحقق اليدوي |
| Email Ready | نعم — health configured وتجارب الإنتاج المذكورة ناجحة |
| Document Storage Ready | لا — production adapter غير مركب |
| Production Fully Ready | لا |

لا يبدأ Phase 2 ضمن هذا العمل. يبقى التخزين الخاص وإغلاق تحقق إصلاح سلامة البيانات إنتاجيًا شرطين منفصلين قبل اعتبار المنصة جاهزة بالكامل.

## 12. استكشاف الأخطاء

- **Endpoint mismatch:** أعد اختيار الفرع الصحيح في Neon، ولا تغيّر `EXPECTED_NEON_ENDPOINT_ID` لإسكات الفحص.
- **Pooler refused:** استخدم Direct URL من Connect للمهاجرات؛ pooled URL مخصص لـVercel runtime.
- **TLS refused:** أنشئ الرابط من Neon Console وتأكد من `sslmode=require`.
- **Migration failed:** لا تستخدم reset أو db push. احتفظ برسالة الخطأ المنقّحة وافحص `_prisma_migrations` وSQL قبل أي إصلاح.
- **بيانات أو جداول غير متوقعة:** أوقف الهجرة، خذ Snapshot، وحدد أصل البيانات أولًا.
- **Health ما زال misconfigured:** تأكد من redeploy أحدث من وقت إضافة Vercel secret، ثم راجع أن الرابط PostgreSQL كامل وTLS مفروض.

## 13. Git والتسليم

- commit إعداد Phase 1.6 المحلي: `774d4f7b156cdb7c2deeab7f74e823f4ffad61bf`.
- commit تسليم Phase 1.6 المحلي: `106703e`.
- commit إصلاح سلامة البيانات: `d31ee79`، دُفع إلى `origin/main`.
- نشر Vercel الناتج `dpl_GUa2KkTKGjSgjygpjhqBL7EfFsfo` أصبح READY؛ قاعدة الإنتاج لم تُكتب أثناء التحقق.

مراجع رسمية: [Neon branch isolation](https://neon.com/docs/get-started-with-neon/workflow-primer)، [Neon computes and endpoint IDs](https://neon.com/docs/manage/endpoints/)، [Prisma 6 connection URLs](https://www.prisma.io/docs/orm/v6/reference/connection-urls).
