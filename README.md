# Money Coder Commercial Accounting

أساس SaaS محاسبي عربي متعدد الشركات والمكاتب. تنفذ النسخة الحالية **Phase 1.5 — Production Foundation & Real Data Activation**: مصادقة خادمية، ملفات شركات ومكاتب، سنوات مالية وحسابات بنكية، عضويات وصلاحيات، تفويض مكتب محاسبة، مستندات خاصة، وسجل تدقيق.

الواجهة العامة المنشورة: <https://money-coder-commercial-accounting.vercel.app>. الصفحة العامة متاحة، لكن التسجيل الإنتاجي يظل مغلقًا حتى تهيئة PostgreSQL وSMTP، كما يظل رفع المستندات مغلقًا حتى تركيب private-storage adapter.

> لا تتضمن هذه المرحلة دليل الحسابات أو القيود أو معالجة Excel/PDF أو تكامل n8n. راجع `PHASES_ROADMAP.md` فقط لخارطة Phase 2.

## ما يعمل فعليًا

- اختبارات PostgreSQL حقيقية ومعزولة تطبق migration ثم تختبر التسجيل لشركة ومكتب، التحقق المحلي، الدخول والخروج، الاستعادة، الجلسات، حفظ الشركة، السنة المالية، الحساب البنكي، عزل الشركات، وحماية تنزيل المستند.
- حماية خادمية لكل مورد حسب العضوية أو التفويض النشط، مع تقاطع صلاحيات موظف المكتب مع صلاحيات التفويض المقبولة.
- إدارة أدوار فريق المكتب، التعليق، إعادة التفعيل، والإلغاء مع حماية المالك ومنع التصعيد الأفقي.
- اعتماد onboarding فقط بعد اكتمال الحقول الحرجة.
- رفع محلي خاص للتطوير مع فحص الحجم وMIME والتوقيع وحذف الملف اليتيم عند فشل معاملة قاعدة البيانات.

## التشغيل المحلي

```powershell
npm install
Copy-Item .env.example .env
# حدّث القيم المحلية دون رفع الملف إلى Git
npm run db:deploy
npm run dev
```

يمكن استخدام PostgreSQL مثبتة أو Docker. لاختبار معزول لا يحتاج Docker:

```powershell
npm run test:db
```

الأمر السابق ينزل PostgreSQL 17 محليًا كأداة تطوير فقط، يشغّل cluster مؤقتًا، يطبق `prisma migrate deploy`، يشغّل اختبارات التكامل، ثم يحذف قاعدة الاختبار. لا يستخدم بيانات التطوير أو الإنتاج.

## أوامر التحقق

```powershell
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
npm start -- -p 3000
npm run test:visual
```

`test:visual` يحتاج خادمًا يعمل على `http://localhost:3000`.

## متغيرات البيئة

الأسماء موجودة في `.env.example` ولا يجب وضع قيم حقيقية في Git:

- `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`
- `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
- `PRIVATE_STORAGE_PROVIDER`, `PRIVATE_STORAGE_PATH`, `MAX_UPLOAD_BYTES`
- متغيرا n8n موثقان للمستقبل وغير مفعلين في Phase 1.5.

اتصال PostgreSQL البعيد في الإنتاج يجب أن يطلب TLS، مثل `sslmode=require`. استخدم runtime pooled URL إن وفره المزود، ونفذ migrations عبر اتصال إداري مباشر ومن بيئة موثوقة؛ التفاصيل في `INFRASTRUCTURE_SETUP.md`.

## حدود الإنتاج الحالية

- لا توجد قاعدة PostgreSQL أو SMTP أو private object storage مهيأة على Vercel وقت آخر تحقق.
- `/api/health` يعيد `degraded` وHTTP 503 عندما تكون خدمة حرجة مفقودة أو غير صالحة.
- التسجيل والاستعادة والدعوات لا تدعي النجاح عندما تكون البنية المطلوبة غير مهيأة.
- التخزين المحلي لا يعمل في Production ولا توضع المستندات داخل `/public`.

راجع `PROJECT_STATUS.md` للحالة الدقيقة، و`DEPLOYMENT.md` للنشر، و`FINAL_REPORT.md` لتقرير التسليم.
