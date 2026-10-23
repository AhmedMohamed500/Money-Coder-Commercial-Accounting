# Project Status — Phase 1.5

آخر تحديث: 23 أكتوبر 2026.

| الجزء | الحالة | الدليل / الملاحظة |
|---|---|---|
| Landing وRTL | Completed & Tested | لم يُعد تصميمها؛ visual smoke ناجح على 390/768/1280/1440/1920px. |
| Prisma/PostgreSQL | Completed & Tested (isolated test) | migration `20261023160000_init` طُبقت على PostgreSQL 17 مؤقتة؛ 7 اختبارات DB/API نجحت. الإنتاج غير متصل. |
| تسجيل شركة ومكتب | Completed & Tested (local integration) | إنشاء ذري للمستخدم والمؤسسة وعضوية المالك ورمز التحقق. الإنتاج مغلق لغياب DB/SMTP. |
| التحقق والدخول والخروج والاستعادة | Completed & Tested (local integration) | منع دخول غير المؤكد، إنشاء/إلغاء الجلسة، reset وإبطال الجلسات، ورفض الجلسة المنتهية. SMTP الحقيقي غير مختبر. |
| Wizard الشركة | Completed & Tested (API/DB) | الملف والقانوني والضريبي والعنوان والمحاسبة والسنة المالية والبنك تحفظ وتسترجع؛ الاعتماد يمنع الملف الناقص. |
| ملف المكتب | Completed but Partially Tested | التسجيل مختبر؛ حفظ ملف المكتب والواجهة مبنيان، لكن UI E2E بحسابين لم يُشغل. |
| الفريق والدعوات | Completed but Partially Tested | تغيير الدور/تعليق/تفعيل/إلغاء وحماية المالك منفذة؛ قواعد التصعيد unit-tested. SMTP invitation غير مختبر. |
| التفويض والتعيين | Completed & Tested (authorization layer) | صلاحيات التعيين لا تتجاوز الدور أو التفويض؛ التعليق والإلغاء يمنعان الوصول. دورة UI الكاملة غير مختبرة. |
| عزل الشركات | Completed & Tested | محاولات معرّف شركة ومستند لـtenant آخر أعادت 403/404؛ assignment خاطئ وpermission escalation مرفوضان. |
| المستندات | Partially Completed | validation والتنزيل المصرح والحذف وorphan cleanup؛ local-dev فقط، لا adapter إنتاجي. |
| Health endpoint | Completed & Tested (build/local) | يميز misconfigured/unavailable/connected ولا يعرض أسرارًا. |
| Vercel | Partially Completed | المشروع الحالي محفوظ؛ Landing تعمل. الخدمات الثلاث غير مهيأة، لذا الحالة degraded مقصودة. |

## نتائج التحقق الحالية

- `npm run typecheck`: PASS.
- `npm run lint`: PASS دون تحذيرات.
- `npm test`: 9 PASS، و7 DB/API integration tests SKIPPED في الأمر العام عمدًا.
- `npm run test:db`: migration PASS؛ ملفا اختبار و7 اختبارات تكامل PASS، دون skipped.
- `npm run build`: PASS؛ 28 route/page entries ظهرت في manifest.
- `npm run test:visual`: PASS بعد تشغيل خادم الإنتاج المحلي؛ خمسة مقاسات، RTL ودون overflow.
- المحاولة الأولى لـ`test:visual`: FAIL بسبب عدم تشغيل الخادم (`ERR_CONNECTION_REFUSED`) ثم أعيدت بالشروط الصحيحة ونجحت.

## العوائق الخارجية الصريحة

لا توجد على Vercel قيم إنتاج لـPostgreSQL أو SMTP أو private object storage. لم تُنشأ حسابات أو موارد مدفوعة ولم تُفبرك credentials. يلزم صاحب المشروع تنفيذ `INFRASTRUCTURE_SETUP.md` قبل تجربة التسجيل أو المستندات ببيانات حقيقية.
