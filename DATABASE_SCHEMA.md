# Database Schema

المخزن الإنتاجي المطلوب PostgreSQL. يحتوي مخطط Prisma على 19 جدولًا:

## الهوية والجلسات

- `User`: هوية المستخدم، hash كلمة المرور، التحقق والقفل المؤقت.
- `Session`: جلسة عشوائية؛ لا يُخزن token الخام.
- `EmailVerificationToken`, `PasswordResetToken`: hashes، انتهاء صلاحية، واستخدام مرة واحدة.

## الكيانات

- `Organization`: مكتب أو شركة، مع soft delete وحالة onboarding.
- `OrganizationMembership`: قيد فريد `(userId, organizationId)`، دور وصلاحيات مستقلة.
- `OrganizationProfile`, `OrganizationAddress`: ملف وعناوين مرتبطة بالكيان بمفاتيح خارجية.

## القانوني والمالي

- `CompanyLegalDetails`, `CompanyContact`, `CompanyBankAccount`.
- `CompanyAccountingSettings`, `CompanyFiscalYear`.
- رقم الحساب البنكي فريد داخل الشركة وليس على مستوى النظام كله.

## المستندات

- `FileAsset`: metadata وSHA-256 وstorage key ومالك الكيان.
- `CompanyDocument`: التصنيف والعنوان والارتباط بالملف والكيان نفسه.

## المكتب والتفويض

- `OfficeCompanyEngagement`: علاقة فريدة بين مكتب وشركة وحالات PENDING/ACTIVE/REJECTED/REVOKED.
- `EngagementStaff`: يربط عضوًا نشطًا بالمكتب بعلاقة تفويض وصلاحيات جزئية.
- `Invitation`: دعوة مجزأة بtoken hash وتاريخ انتهاء وحالة.

## التتبع

- `AuditEvent`: الممثل والكيان والفعل والـmetadata وIP وUser-Agent عند توفرهما.

## عزل البيانات

العزل مطبق عبر server-side authorization في `src/lib/auth.ts`. كل endpoint يتحقق من عضوية ACTIVE غير محذوفة أو تعيين موظف صحيح داخل مكتب التفويض. صلاحية موظف المكتب هي تقاطع صلاحيات التعيين مع صلاحيات التفويض المقبولة، ويجب أن تنتمي العضوية إلى المكتب نفسه. الاستعلامات التابعة تقيد `organizationId` لمنع IDOR. لا توجد PostgreSQL Row-Level Security؛ القرار مقصود في Phase 1.5 لتجنب سياسات ناقصة، ولا يُسمح بأي اتصال عميل مباشر بقاعدة البيانات.

## Migrations

الهجرة الأولى: `prisma/migrations/20261023160000_init/migration.sql`. طُبقت فعليًا بنجاح بواسطة `prisma migrate deploy` على PostgreSQL 17 مؤقتة ومعزولة ضمن `npm run test:db`. لم تُطبق على قاعدة Production لأن اتصالًا إنتاجيًا لم يُقدّم. لا توجد بيانات seed، ولا يستخدم الاختبار قاعدة التطوير أو الإنتاج.
