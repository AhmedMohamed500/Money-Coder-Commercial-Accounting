import type { ChartAccountClass, ChartNormalBalance, ChartReportGroup, CompanyBusinessActivity, InventoryMethod } from "@prisma/client";

export const COMMERCIAL_TEMPLATE_VERSION = "commercial-eg-1.0.0";

export type TemplateAccount = {
  code: string;
  parentCode: string | null;
  nameAr: string;
  nameEn: string | null;
  accountClass: ChartAccountClass;
  reportGroup: ChartReportGroup;
  normalBalance: ChartNormalBalance;
  isContra: boolean;
  isPostable: boolean;
  isActive: boolean;
  inventoryMethod: InventoryMethod | null;
  description: string | null;
};

export const ACTIVITY_TEMPLATES: Record<CompanyBusinessActivity, { ready: boolean; version: string | null; label: string }> = {
  COMMERCIAL: { ready: true, version: COMMERCIAL_TEMPLATE_VERSION, label: "النشاط التجاري" },
  INDUSTRIAL: { ready: false, version: null, label: "النشاط الصناعي" },
  SERVICE: { ready: false, version: null, label: "النشاط الخدمي" },
};

type Class = ChartAccountClass;
type Report = ChartReportGroup;
type Balance = ChartNormalBalance;
const entries: TemplateAccount[] = [];
const byCode = new Map<string, TemplateAccount>();

function group(code: string, parentCode: string | null, nameAr: string, nameEn: string, accountClass: Class, reportGroup: Report, normalBalance: Balance, isContra = false) {
  add({ code, parentCode, nameAr, nameEn, accountClass, reportGroup, normalBalance, isContra, isPostable: false, isActive: true, inventoryMethod: code === "5100" ? "PERPETUAL" : code === "5200" ? "PERIODIC" : null, description: null });
}

function add(account: TemplateAccount) {
  if (byCode.has(account.code)) throw new Error(`Duplicate commercial account code ${account.code}`);
  if (account.parentCode && !byCode.has(account.parentCode)) throw new Error(`Missing parent for ${account.code}`);
  byCode.set(account.code, account);
  entries.push(account);
}

/** Rows use name|English name(optional). Account codes are parent + two digits. */
function leaves(parentCode: string, rows: string, options?: { balance?: Balance; report?: Report; contra?: boolean; inactive?: boolean; description?: string }) {
  const parent = byCode.get(parentCode);
  if (!parent) throw new Error(`Unknown parent ${parentCode}`);
  const lines = rows.trim().split("\n").map(line => line.trim()).filter(Boolean);
  if (lines.length > 99) throw new Error(`Too many children under ${parentCode}`);
  for (const [index, line] of lines.entries()) {
    const [nameAr, nameEn] = line.split("|").map(part => part.trim());
    add({ code: `${parentCode}${String(index + 1).padStart(2, "0")}`, parentCode, nameAr, nameEn: nameEn || null,
      accountClass: parent.accountClass, reportGroup: options?.report ?? parent.reportGroup,
      normalBalance: options?.balance ?? parent.normalBalance, isContra: options?.contra ?? false,
      isPostable: true, isActive: !options?.inactive, inventoryMethod: parent.inventoryMethod, description: options?.description ?? null });
  }
}

function extraLeaf(parentCode: string, index: number, nameAr: string, options: { balance?: Balance; report?: Report; contra?: boolean; inactive?: boolean; description?: string }) {
  const parent = byCode.get(parentCode);
  if (!parent) throw new Error(`Unknown parent ${parentCode}`);
  add({ code: `${parentCode}${String(index).padStart(2, "0")}`, parentCode, nameAr, nameEn: null,
    accountClass: parent.accountClass, reportGroup: options.report ?? parent.reportGroup,
    normalBalance: options.balance ?? parent.normalBalance, isContra: options.contra ?? false,
    isPostable: true, isActive: !options.inactive, inventoryMethod: parent.inventoryMethod, description: options.description ?? null });
}

group("1000", null, "الأصول", "Assets", "ASSET", "ASSET_TOTAL", "DEBIT");
group("1100", "1000", "الأصول المتداولة", "Current assets", "ASSET", "CURRENT_ASSET", "DEBIT");
group("1110", "1100", "النقدية والبنوك", "Cash and banks", "ASSET", "CURRENT_ASSET", "DEBIT");
leaves("1110", `الخزينة الرئيسية|Main cash
خزينة الفروع|Branch cash
العهدة النقدية|Petty cash
نقدية بالطريق|Cash in transit
حسابات بنكية جارية|Bank current accounts
حسابات بنكية ادخارية|Bank savings accounts
حسابات بنكية أخرى|Other bank accounts
حسابات التحصيل الإلكتروني|Electronic collection accounts
تسوية المدفوعات الرقمية|Digital payment settlement
تحصيلات بالطريق|Collections in transit`);
group("1120", "1100", "العملاء وأوراق القبض", "Trade receivables", "ASSET", "CURRENT_ASSET", "DEBIT");
leaves("1120", `عملاء محليون|Domestic trade receivables
عملاء التصدير|Export trade receivables
أوراق قبض|Notes receivable
شيكات آجلة واردة|Postdated checks received
تحصيلات غير محددة التخصيص|Unallocated receipts`);
extraLeaf("1120", 6, "مخصص خسائر الائتمان المتوقعة", { balance: "CREDIT", contra: true });
group("1130", "1100", "المخزون التجاري", "Merchandise inventory", "ASSET", "CURRENT_ASSET", "DEBIT");
leaves("1130", `مخزون البضاعة|Merchandise inventory
بضاعة بالطريق|Goods in transit
بضاعة لدى الغير|Goods held by third parties
تسويات جرد المخزون|Inventory adjustments`);
extraLeaf("1130", 5, "مخصص انخفاض قيمة المخزون", { balance: "CREDIT", contra: true });
group("1140", "1100", "السلف والدفعات المقدمة", "Advances", "ASSET", "CURRENT_ASSET", "DEBIT");
leaves("1140", `دفعات مقدمة للموردين|Supplier advances
سلف العاملين|Employee advances
سلف مصروفات التشغيل|Operating advances
تأمينات موردين مستردة قصيرة الأجل|Refundable supplier deposits`);
group("1150", "1100", "المصروفات المدفوعة مقدمًا", "Prepaid expenses", "ASSET", "CURRENT_ASSET", "DEBIT");
leaves("1150", `إيجارات مدفوعة مقدمًا|Prepaid rent
تأمين مدفوع مقدمًا|Prepaid insurance
اشتراكات مدفوعة مقدمًا|Prepaid subscriptions
صيانة مدفوعة مقدمًا|Prepaid maintenance
مصروفات أخرى مدفوعة مقدمًا|Other prepayments`);
group("1160", "1100", "ضرائب قابلة للاسترداد", "Recoverable taxes", "ASSET", "CURRENT_ASSET", "DEBIT");
leaves("1160", `ضريبة قيمة مضافة على المدخلات القابلة للخصم|Recoverable input VAT
ضريبة خصم وتحصيل قابلة للاسترداد|Recoverable withholding tax
ضرائب أخرى قابلة للاسترداد|Other recoverable taxes`);
group("1170", "1100", "أصول متداولة أخرى", "Other current assets", "ASSET", "CURRENT_ASSET", "DEBIT");
leaves("1170", `إيرادات مستحقة|Accrued income
ودائع قصيرة الأجل|Short-term deposits
مدينون متنوعون|Other receivables
حسابات معلقة تحت المراجعة|Suspense under review`);
group("1200", "1000", "الأصول غير المتداولة", "Non-current assets", "ASSET", "NONCURRENT_ASSET", "DEBIT");
group("1210", "1200", "الأصول الثابتة", "Property and equipment", "ASSET", "NONCURRENT_ASSET", "DEBIT");
leaves("1210", `أراضٍ|Land
مبانٍ|Buildings
معدات تشغيل|Equipment
آلات مستخدمة بالنشاط التجاري|Trading machinery
سيارات|Vehicles
أثاث وتجهيزات|Furniture and fixtures
أجهزة حاسب وتقنية|IT equipment
تحسينات مبانٍ مستأجرة|Leasehold improvements
مشروعات تحت التنفيذ|Construction in progress`);
group("1220", "1200", "مجمع الإهلاك", "Accumulated depreciation", "ASSET", "NONCURRENT_ASSET", "CREDIT", true);
leaves("1220", `مجمع إهلاك المباني|Buildings depreciation
مجمع إهلاك المعدات والآلات|Equipment depreciation
مجمع إهلاك السيارات|Vehicles depreciation
مجمع إهلاك الأثاث|Furniture depreciation
مجمع إهلاك أجهزة الحاسب|IT depreciation
مجمع إهلاك التحسينات|Leasehold depreciation`, { contra: true });
group("1230", "1200", "الأصول غير الملموسة", "Intangibles", "ASSET", "NONCURRENT_ASSET", "DEBIT");
leaves("1230", `أصول غير ملموسة|Intangible assets
رخص برمجيات مؤهلة للرسملة|Capitalized software licenses`);
extraLeaf("1230", 3, "مجمع إطفاء الأصول غير الملموسة", { balance: "CREDIT", contra: true });
group("1240", "1200", "أصول غير متداولة أخرى", "Other non-current assets", "ASSET", "NONCURRENT_ASSET", "DEBIT");
leaves("1240", `تأمينات مستردة طويلة الأجل|Long-term refundable deposits
أصول غير متداولة أخرى|Other non-current assets`);

group("2000", null, "الالتزامات", "Liabilities", "LIABILITY", "LIABILITY_TOTAL", "CREDIT");
group("2100", "2000", "الالتزامات المتداولة", "Current liabilities", "LIABILITY", "CURRENT_LIABILITY", "CREDIT");
group("2110", "2100", "الموردون وأوراق الدفع", "Trade payables", "LIABILITY", "CURRENT_LIABILITY", "CREDIT");
leaves("2110", `موردون محليون|Domestic trade payables
موردون خارجيون|Foreign trade payables
أوراق دفع|Notes payable
شيكات صادرة لم تُصرف|Outstanding checks
فواتير موردين غير مسددة|Unpaid supplier invoices`);
group("2120", "2100", "دفعات العملاء وإيرادات مؤجلة", "Customer advances", "LIABILITY", "CURRENT_LIABILITY", "CREDIT");
leaves("2120", `تأمينات عملاء|Customer deposits
دفعات مقدمة من العملاء|Customer advances
إيرادات مؤجلة|Deferred revenue
أرصدة دائنة للعملاء|Customer credit balances`);
group("2130", "2100", "مصروفات مستحقة", "Accrued expenses", "LIABILITY", "CURRENT_LIABILITY", "CREDIT");
leaves("2130", `رواتب مستحقة|Accrued salaries
إيجارات مستحقة|Accrued rent
مرافق مستحقة|Accrued utilities
أتعاب مهنية مستحقة|Accrued professional fees
فوائد مستحقة|Accrued interest
مصروفات أخرى مستحقة|Other accrued expenses`);
group("2140", "2100", "مستحقات العاملين", "Payroll liabilities", "LIABILITY", "CURRENT_LIABILITY", "CREDIT");
leaves("2140", `مرتبات واجبة الدفع|Salaries payable
استقطاعات العاملين المستحقة|Employee deductions payable
تأمينات اجتماعية مستحقة|Social insurance payable
مزايا عاملين مستحقة|Employee benefits payable
مستحقات عاملين أخرى|Other employee liabilities`);
group("2150", "2100", "الضرائب المستحقة", "Tax liabilities", "LIABILITY", "CURRENT_LIABILITY", "CREDIT");
leaves("2150", `ضريبة قيمة مضافة على المخرجات|Output VAT
تسوية ضريبة القيمة المضافة|VAT settlement
ضريبة خصم وتحصيل مستحقة|Withholding tax payable
ضريبة دخل شركات مستحقة|Corporate income tax payable
ضرائب أخرى واجبة السداد|Other taxes payable`);
group("2160", "2100", "تمويل قصير الأجل", "Short-term finance", "LIABILITY", "CURRENT_LIABILITY", "CREDIT");
leaves("2160", `تسهيلات سحب على المكشوف|Bank overdrafts
قروض قصيرة الأجل|Short-term loans
الجزء المتداول من التمويل طويل الأجل|Current portion of long-term debt`);
group("2200", "2000", "الالتزامات غير المتداولة", "Non-current liabilities", "LIABILITY", "NONCURRENT_LIABILITY", "CREDIT");
leaves("2200", `قروض طويلة الأجل|Long-term loans
التزامات إيجار غير متداولة|Non-current lease liabilities
التزامات مزايا عاملين طويلة الأجل|Long-term employee benefits
التزامات ضريبية مؤجلة|Deferred tax liabilities
التزامات غير متداولة أخرى|Other long-term liabilities`);

group("3000", null, "حقوق الملكية", "Equity", "EQUITY", "EQUITY", "CREDIT");
group("3100", "3000", "رأس المال", "Capital", "EQUITY", "EQUITY", "CREDIT");
leaves("3100", `رأس مال المالك|Owner capital`, { inactive: true, description: "يفعل فقط للمنشأة الفردية عند ملاءمة الشكل القانوني." });
extraLeaf("3100", 2, "رأس مال الشركة", { inactive: true, description: "يفعل فقط للشكل القانوني الملائم." });
extraLeaf("3100", 3, "رأس مال الشركاء", { inactive: true, description: "يفعل فقط لشركات الأشخاص الملائمة." });
extraLeaf("3100", 4, "علاوة إصدار أو رأس مال إضافي", { inactive: true });
group("3200", "3000", "الاحتياطيات والأرباح المحتجزة", "Reserves and retained earnings", "EQUITY", "EQUITY", "CREDIT");
leaves("3200", `أرباح محتجزة|Retained earnings
أرباح سنوات سابقة|Prior-year earnings
احتياطي قانوني|Statutory reserve
احتياطيات أخرى|Other reserves`);
group("3300", "3000", "حسابات المالك والشركاء", "Owner and partner accounts", "EQUITY", "EQUITY", "CREDIT");
leaves("3300", `جاري الشركاء|Partner current accounts`, { inactive: true });
extraLeaf("3300", 2, "مسحوبات المالك", { balance: "DEBIT", contra: true, inactive: true });

group("4000", null, "الإيرادات", "Revenue", "REVENUE", "REVENUE_TOTAL", "CREDIT");
group("4100", "4000", "إيرادات النشاط التجاري", "Trading revenue", "REVENUE", "TRADING_REVENUE", "CREDIT");
leaves("4100", `مبيعات محلية|Domestic sales
مبيعات تصدير|Export sales
مبيعات جملة|Wholesale sales
مبيعات تجزئة|Retail sales
مبيعات القنوات الإلكترونية|Online channel sales
إيرادات تجارية أخرى|Other trading revenue`);
group("4200", "4000", "مردودات وخصومات المبيعات", "Contra revenue", "REVENUE", "CONTRA_REVENUE", "DEBIT", true);
leaves("4200", `مردودات المبيعات|Sales returns
مسموحات المبيعات|Sales allowances
خصومات المبيعات|Sales discounts
خصومات تجارية معروضة منفصلًا|Commercial discounts`, { contra: true });
group("4300", "4000", "إيرادات تشغيلية أخرى", "Other operating income", "REVENUE", "OTHER_INCOME", "CREDIT");
leaves("4300", `إيراد خدمة ملحقة بالتجارة|Incidental service revenue
إيراد توصيل مستقل|Separate delivery revenue
إيرادات تشغيلية أخرى|Other operating income`);

group("5000", null, "تكلفة البضاعة المباعة", "Cost of sales", "EXPENSE", "COST_OF_SALES", "DEBIT");
group("5100", "5000", "تكلفة المبيعات بنظام الجرد المستمر", "Perpetual cost of sales", "EXPENSE", "COST_OF_SALES", "DEBIT");
leaves("5100", `تكلفة البضاعة المباعة|Merchandise cost of sales
تسويات تكلفة المبيعات|Cost of sales adjustments`);
group("5200", "5000", "مشتريات نظام الجرد الدوري", "Periodic purchases", "EXPENSE", "COST_OF_SALES", "DEBIT");
leaves("5200", `مشتريات بضاعة|Merchandise purchases
مصاريف شحن للداخل|Freight-in
رسوم استيراد غير قابلة للاسترداد|Non-recoverable import duties
تكاليف تخليص جمركي للبضاعة|Inventory customs clearance
تكاليف اقتناء مباشرة أخرى|Other direct acquisition costs`);
extraLeaf("5200", 6, "مردودات المشتريات", { balance: "CREDIT", contra: true });
extraLeaf("5200", 7, "مسموحات المشتريات", { balance: "CREDIT", contra: true });
extraLeaf("5200", 8, "خصومات المشتريات", { balance: "CREDIT", contra: true });
group("5300", "5000", "فروق وتسويات المخزون", "Inventory differences", "EXPENSE", "COST_OF_SALES", "DEBIT");
leaves("5300", `عجز المخزون|Inventory shortages
شطب البضاعة|Inventory write-offs
انكماش المخزون|Inventory shrinkage
تسويات جرد تُحمّل على التكلفة|Costed inventory adjustments`);

group("6000", null, "المصروفات التشغيلية", "Operating expenses", "EXPENSE", "EXPENSE_TOTAL", "DEBIT");
group("6100", "6000", "مصروفات البيع والتوزيع", "Selling and distribution", "EXPENSE", "SELLING_EXPENSE", "DEBIT");
leaves("6100", `رواتب فريق المبيعات|Sales salaries
عمولات مبيعات|Sales commissions
إعلان|Advertising
تسويق رقمي|Digital marketing
تغليف|Packaging
توزيع وتسليم|Delivery and distribution
شحن للخارج|Freight-out
تكاليف سيارات البيع|Selling vehicle costs
ترويج مبيعات|Sales promotion
خدمة عملاء|Customer service
عمولات الأسواق الإلكترونية|Marketplace commissions
رسوم بوابات الدفع حسب السياسة|Payment gateway fees`);
group("6200", "6000", "مصروفات عمومية وإدارية", "General and administrative", "EXPENSE", "ADMIN_EXPENSE", "DEBIT");
leaves("6200", `رواتب إدارية|Administrative salaries
إيجار المكتب|Office rent
كهرباء|Electricity
مياه|Water
اتصالات وإنترنت|Telecom and internet
مستلزمات مكتبية|Office supplies
مطبوعات وقرطاسية|Printing and stationery
أتعاب مهنية|Professional fees
أتعاب محاسبية|Accounting fees
أتعاب قانونية|Legal fees
صيانة|Maintenance
اشتراكات برمجية|Software subscriptions
تأمينات|Insurance
تدريب إداري|Administrative training
انتقالات|Transportation
سفر وإقامة|Travel and accommodation
رسوم خدمات بنكية|Bank service charges
ضيافة|Hospitality
مصروفات إدارية أخرى|Other administrative expenses`);
group("6300", "6000", "إهلاك وإطفاء", "Depreciation and amortization", "EXPENSE", "DEPRECIATION_EXPENSE", "DEBIT");
leaves("6300", `إهلاك المباني|Buildings depreciation expense
إهلاك المعدات والآلات|Equipment depreciation expense
إهلاك السيارات|Vehicle depreciation expense
إهلاك الأثاث|Furniture depreciation expense
إهلاك أجهزة الحاسب|IT depreciation expense
إطفاء الأصول غير الملموسة|Intangible amortization expense`);
group("6400", "6000", "مصروفات العاملين", "Staff expenses", "EXPENSE", "STAFF_EXPENSE", "DEBIT");
leaves("6400", `أجور ورواتب تشغيلية|Operating wages and salaries
تأمين اجتماعي على صاحب العمل|Employer social insurance
مزايا عاملين|Employee benefits
مكافآت|Bonuses
توظيف وتدريب عاملين|Recruitment and staff training
مصروفات عاملين أخرى|Other staff costs`);

group("7000", null, "مصروفات تمويلية وأخرى", "Finance and other expenses", "EXPENSE", "EXPENSE_TOTAL", "DEBIT");
group("7100", "7000", "تكاليف التمويل", "Finance costs", "EXPENSE", "FINANCE_COST", "DEBIT");
leaves("7100", `مصروف فوائد|Interest expense
خسائر فروق عملة|Foreign exchange losses
تكاليف تمويل أخرى|Other finance costs`);
group("7200", "7000", "مصروفات غير تشغيلية", "Other non-operating expenses", "EXPENSE", "OTHER_EXPENSE", "DEBIT");
leaves("7200", `خسائر بيع أصول|Loss on disposal of assets
مصروفات غير تشغيلية أخرى|Other non-operating expenses`);
group("7300", "7000", "مصروف ضريبة الدخل", "Income tax expense", "EXPENSE", "INCOME_TAX_EXPENSE", "DEBIT");
leaves("7300", `مصروف ضريبة الدخل|Income tax expense`);
group("8000", null, "إيرادات غير تشغيلية", "Non-operating income", "REVENUE", "OTHER_INCOME", "CREDIT");
group("8100", "8000", "إيرادات تمويلية وأخرى", "Finance and other income", "REVENUE", "OTHER_INCOME", "CREDIT");
leaves("8100", `إيراد فوائد|Interest income
أرباح فروق عملة|Foreign exchange gains
أرباح بيع أصول|Gains on disposal of assets
إيرادات غير تشغيلية أخرى|Other non-operating income`);

export const commercialChartTemplate: readonly TemplateAccount[] = Object.freeze(entries.map(entry => Object.freeze(entry)));

export function validateCommercialTemplate(accounts: readonly TemplateAccount[] = commercialChartTemplate) {
  const seen = new Set<string>();
  const index = new Map(accounts.map(account => [account.code, account]));
  for (const account of accounts) {
    if (seen.has(account.code)) throw new Error(`Duplicate account ${account.code}`);
    seen.add(account.code);
    if (!/^\d{4}(\d{2})*$/.test(account.code)) throw new Error(`Invalid code ${account.code}`);
    if (account.parentCode && (!index.has(account.parentCode) || index.get(account.parentCode)?.accountClass !== account.accountClass)) throw new Error(`Invalid parent for ${account.code}`);
    if (account.isPostable && account.parentCode === null) throw new Error(`Posting root ${account.code}`);
    const ordinaryBalance = account.accountClass === "ASSET" || account.accountClass === "EXPENSE" ? "DEBIT" : "CREDIT";
    if ((account.normalBalance !== ordinaryBalance) !== account.isContra) throw new Error(`Contra balance ${account.code}`);
    if (account.accountClass === "REVENUE" && account.reportGroup === "FINANCE_COST") throw new Error(`Income classified as expense ${account.code}`);
  }
  if (!["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].every(type => accounts.some(account => account.accountClass === type))) throw new Error("Missing accounting class");
  return { accountCount: accounts.length, groupCount: accounts.filter(account => !account.isPostable).length, postingCount: accounts.filter(account => account.isPostable).length };
}
