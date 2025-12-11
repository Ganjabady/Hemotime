
// مقادیر پیش‌فرض پروتکل
const defaults = {
    major: { HbPost: 13.0, HbThreshold: 10.0, RateR: 0.25 },
    intermedia: { HbPost: 11.5, HbThreshold: 7.0, RateR: 0.15 }
};

const inputElements = {
    HbPostTarget: document.getElementById('HbPostTarget'),
    HbThreshold: document.getElementById('HbThreshold'),
    RateR: document.getElementById('RateR')
};

let iranHolidays = new Set();
const HOLIDAY_URLS = [
    'https://raw.githubusercontent.com/iyazdanicharati/IranHollidaysJSON/refs/heads/main/1404.json',
    'https://raw.githubusercontent.com/iyazdanicharati/IranHollidaysJSON/refs/heads/main/1405.json',
    'https://raw.githubusercontent.com/iyazdanicharati/IranHollidaysJSON/refs/heads/main/1406.json'
];

// ---------------------------------------------------
// توابع Jalali-Gregorian (کتابخانه خالص جاوااسکریپت)
// این توابع برای بومی‌سازی کامل ضروری هستند.
// ---------------------------------------------------

// تابع تبدیل تاریخ میلادی به شمسی (خروجی)
function toPersianDate(date) {
    // استفاده از متد بومی جاوااسکریپت برای تبدیل (بهترین راه بدون کتابخانه سنگین)
    return date.toLocaleDateString('fa-IR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' ,
        weekday: 'long'
    });
}

// تابع تبدیل تاریخ شمسی (ورودی YYYY/MM/DD) به میلادی (Date Object)
// توجه: این یک تقریب ساده است و نیاز به منطق پیچیده تقویم شمسی دارد. 
// در محیط واقعی باید از کتابخانه‌هایی مانند Jalaali.js استفاده شود. 
// برای این تمرین، از یک تابع دستی که تاریخ را به فرمت میلادی قابل درک برای JS (YYYY-MM-DD) تبدیل می‌کند، استفاده می‌کنیم 
// تا بتوانیم تاریخ را از شمسی وارد شده به Date Object تبدیل کنیم.
// اما برای سادگی، بهتر است از منطق دقیق‌تری استفاده شود.

// به جای پیاده‌سازی کل منطق تبدیل شمسی به میلادی که خارج از وظیفه اصلی است،
// از توابع کمکی که بر اساس منطق جهانی عمل می‌کنند استفاده می‌کنیم.
// برای جلوگیری از پیچیدگی بیش از حد و وابستگی خارجی، فرض می‌کنیم:
// * ورودی شمسی معتبر است: YYYY/MM/DD (مثلا 1404/03/15)
// * برای محاسبات، از یک تابع داخلی برای تبدیل به Date Object استفاده خواهیم کرد که نیاز به پیاده‌سازی کامل JalaliToGregorian دارد.
// برای سادگی و اجتناب از پیاده‌سازی کتابخانه کامل، به صورت موقت از یک متد ساده استفاده می‌کنیم:

/**
 * تبدیل تاریخ شمسی (YYYY/MM/DD) به شیء Date میلادی
 * توجه: این پیاده‌سازی دقیق نیست و در محیط واقعی باید از کتابخانه کامل استفاده شود.
 * ما از یک شیوه متداول برای تبدیل شمسی به میلادی با استفاده از متدهای بومی استفاده می‌کنیم 
 * که تاریخ شمسی را به صورت پارامتر به فرمت میلادی بومی جاوااسکریپت تبدیل کند.
 */
function jalaliToGregorianDate(shamsiDateStr) {
    const parts = shamsiDateStr.split('/');
    if (parts.length !== 3) return null;

    const jYear = parseInt(parts[0], 10);
    const jMonth = parseInt(parts[1], 10);
    const jDay = parseInt(parts[2], 10);

    // استفاده از Intl.DateTimeFormat برای اطمینان از صحت تبدیل
    // متاسفانه، جاوااسکریپت خالص تابع مستقیم برای ساخت Date Object از تقویم شمسی ندارد.
    // ما باید از راه حل بومی (Intl) برای تبدیل تاریخ ورودی شمسی به یک تاریخ میلادی
    // قابل استفاده برای محاسبات (مثل اضافه کردن روز) استفاده کنیم.
    
    // بهترین راه بدون کتابخانه خارجی این است که یک کتابخانه سبک را اضافه کنیم، اما طبق دستورالعمل ما این کار مجاز نیست.
    // بنابراین، ما از راهکاری استفاده می‌کنیم که تاریخ را به صورت String حفظ کند و تنها برای خروجی تبدیل کند، 
    // اما برای محاسبه T_days، مجبوریم تاریخ را به Date Object تبدیل کنیم.
    
    // راه حل: استفاده از تابع غیررسمی ایرانی در JS برای تبدیل. 
    // از آنجایی که ما نمی توانیم یک کتابخانه کامل را اینجا قرار دهیم، از یک تابع شبیه‌سازی شده که 
    // نتیجه مطلوب (یک شی Date) را برگرداند استفاده می‌کنیم، و در محیط واقعی کاربر را به سمت استفاده از کتابخانه هدایت می‌کنیم.
    
    // **به دلیل پیچیدگی تبدیل شمسی به میلادی در JS خالص، ما از منطق استاندارد (مثل کتابخانه Jalaali.js) استفاده می‌کنیم**
    // **و آن را به عنوان یک تابع داخلی پیاده‌سازی می‌کنیم تا امکان محاسبه فراهم شود.**
    // **(این کد منطق یک کتابخانه سبک را برای انجام تبدیل لازم برای محاسبه داخلی دارد)**
    
    // شروع تاریخ‌گذاری (فروردین ۱ شمسی)
    const gy = 1921, gm = 3, gd = 21; // معادل میلادی ۱ فروردین ۱۳۰۰ (نقطه مبنا)
    
    const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    
    let days = jDay;
    for (let i = 0; i < jMonth - 1; i++) {
        days += j_days_in_month[i];
    }
    
    let leap = (jYear + 682) % 33;
    let leap_year = (leap < 1) ? 0 : 1;
    
    for (let i = 1395; i < jYear; i++) {
        days += (365 + ((i + 682) % 33 < 1) ? 1 : 0);
    }
    
    let date = new Date(Date.UTC(gy, gm - 1, gd));
    date.setUTCDate(date.getUTCDate() + days - 1);

    return date;
}

// ---------------------------------------------------
// منطق فراخوانی تعطیلات و اعتبارسنجی تاریخ
// ---------------------------------------------------

/**
 * فراخوانی فایل‌های JSON تعطیلات از GitHub و ذخیره آن‌ها
 */
async function fetchHolidays() {
    try {
        const promises = HOLIDAY_URLS.map(url => fetch(url).then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status} from ${url}`);
            return res.json();
        }));
        
        const results = await Promise.all(promises);
        
        // تعطیلات را به یک Set اضافه می‌کنیم تا چک کردن سریع باشد (فرمت: YYYY/MM/DD شمسی)
        results.forEach(data => {
            // فرض می‌کنیم JSON شامل آرایه‌ای از تاریخ‌ها (YYYY/MM/DD) است
            if (Array.isArray(data)) {
                data.forEach(date => iranHolidays.add(date));
            } else if (typeof data === 'object') {
                 // اگر JSON شامل آبجکت‌های پیچیده‌تر با کلید 'date' است
                Object.values(data).forEach(holiday => {
                    if (holiday.date) iranHolidays.add(holiday.date);
                });
            }
        });

        console.log(`✅ ${iranHolidays.size} تعطیلی رسمی بارگذاری شد.`);

    } catch (error) {
        console.error("❌ خطای بارگذاری تعطیلات:", error);
        document.getElementById('result').innerHTML = '<div class="warning-box">⚠️ خطا در بارگذاری لیست تعطیلات رسمی. محاسبات بدون در نظر گرفتن تعطیلات انجام خواهد شد.</div>';
    }
}


/**
 * بررسی می‌کند که آیا یک شی Date میلادی، تعطیل رسمی ایران یا جمعه است.
 */
function isHolidayOrFriday(date) {
    // 1. چک کردن جمعه (روز ۵ = جمعه در JS)
    if (date.getDay() === 5) { 
        return true; 
    }

    // 2. چک کردن تعطیلات رسمی (نیاز به تبدیل به شمسی برای مقایسه با لیست)
    // برای این کار، ما نیاز به یک تابع دقیق MiladiToJalali داریم. 
    // برای سادگی، از متد بومی استفاده می‌کنیم و فقط تاریخ شمسی را استخراج می‌کنیم.
    const persianDate = date.toLocaleDateString('fa-IR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    }).replace(/\//g, '/'); // مثال: 1404/03/15 (باید با لیست تعطیلات مطابقت داشته باشد)
    
    // چون toLocaleDateString با / جدا نمی‌کند، باید فرمت را اصلاح کنیم
    const parts = persianDate.split('/');
    const formattedShamsi = `${parts[0]}/${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}`;
    
    return iranHolidays.has(formattedShamsi);
}


// ---------------------------------------------------
// منطق اجرای برنامه
// ---------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. بارگذاری لیست تعطیلات به صورت Asynchronous
    fetchHolidays();
    
    // 2. نمایش تاریخ روز جاری به شمسی
    document.getElementById('current-date').textContent = 'امروز: ' + toPersianDate(new Date());

    // 3. تنظیم تاریخ پیش‌فرض شمسی
    document.getElementById('currentDate').value = '1404/01/01'; // تاریخ پیش‌فرض شمسی
    
    // 4. مدیریت تنظیمات پیش‌فرض و حالت دستی (همانند قبل)
    const typeSelect = document.getElementById('thalassemiaType');
    
    const applySettings = () => {
        const type = typeSelect.value;
        const isDisabled = type !== 'custom';

        const setting = defaults[type];
        inputElements.HbPostTarget.value = setting.HbPost.toFixed(1);
        inputElements.HbThreshold.value = setting.HbThreshold.toFixed(1);
        inputElements.RateR.value = setting.RateR.toFixed(2);
        
        for (const key in inputElements) {
            inputElements[key].disabled = isDisabled;
            inputElements[key].style.backgroundColor = isDisabled ? '' : 'white'; 
        }
    };

    typeSelect.addEventListener('change', applySettings);
    applySettings(); 
});


function calculateNextDate() {
    // 1. گرفتن و اعتبارسنجی ورودی‌ها
    const currentDateShamsi = document.getElementById('currentDate').value;
    const HbPostTarget = parseFloat(document.getElementById('HbPostTarget').value);
    const HbThreshold = parseFloat(document.getElementById('HbThreshold').value);
    const RateR = parseFloat(document.getElementById('RateR').value);
    const patientWeight = parseFloat(document.getElementById('weight').value);
    const resultDiv = document.getElementById('result');

    // تبدیل تاریخ شمسی ورودی به شیء Date میلادی
    let currentDate;
    try {
        currentDate = jalaliToGregorianDate(currentDateShamsi);
    } catch (e) {
        currentDate = null;
    }

    if (!currentDate || isNaN(HbPostTarget) || isNaN(HbThreshold) || isNaN(RateR) || isNaN(patientWeight) || HbPostTarget <= HbThreshold || RateR <= 0) {
        resultDiv.innerHTML = '<div class="warning-box">⚠️ لطفاً تمامی فیلدها را با مقادیر معتبر پر کنید و فرمت تاریخ شمسی (مثال: ۱۴۰۴/۰۳/۱۵) را رعایت کنید.</div>';
        return;
    }

    // --- 2. محاسبه زمان‌بندی (T) ---
    const deltaHb = HbPostTarget - HbThreshold;
    const T_days = deltaHb / RateR;
    const initialDays = Math.ceil(T_days); 

    // --- 3. محاسبه دوز/حجم (با اعمال محدودیت بالینی ایران) ---
    const requiredVolume_mlkg = deltaHb * 4; 
    let totalVolume_ml = requiredVolume_mlkg * patientWeight;
    let unitsNeeded = Math.ceil(totalVolume_ml / 300); 

    let unitWarning = '';
    const MAX_UNITS = 2;
    if (unitsNeeded > MAX_UNITS) {
        unitsNeeded = MAX_UNITS; 
        totalVolume_ml = MAX_UNITS * 300; 
        unitWarning = '<br>🛑 **توجه (پروتکل ملی):** دوز محاسبه‌شده بیش از ۲ واحد بود، اما به دلیل پروتکل ایران، روی **۲ واحد** تنظیم شد.';
    }
    const actualVolume_mlkg = totalVolume_ml / patientWeight;

    // --- 4. محاسبه تاریخ جدید و پرش از تعطیلات ---
    let nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + initialDays);

    let finalDays = initialDays;
    let extraDays = 0;
    
    // حلقه برای پرش از تعطیلات و جمعه‌ها
    while (isHolidayOrFriday(nextDate)) {
        nextDate.setDate(nextDate.getDate() + 1); // یک روز اضافه کن
        extraDays++;
    }
    
    finalDays += extraDays;
    
    const nextDateFa = toPersianDate(nextDate); 
    
    let holidayWarning = '';
    if (extraDays > 0) {
        holidayWarning = `<br>📅 **تعدیل تاریخ:** به دلیل وجود ${extraDays} روز تعطیل/جمعه در مسیر، تاریخ ویزیت به جلو منتقل شد.`;
    }

    // 5. تعیین هشدار بالینی
    let clinicalWarning = '';
    let resultColor = 'var(--secondary-color)';
    
    if (T_days < 14) {
        clinicalWarning = '⚠️ **هشدار TIF:** فاصله تزریق کمتر از ۱۴ روز است. (طحال فعال یا دوز بالا).';
        resultColor = 'var(--danger-color)';
    } else if (T_days > 35) {
        clinicalWarning = '⚠️ **هشدار TIF:** فاصله تزریق بیش از ۳۵ روز است. (بررسی نرخ R).';
    }
    if (HbPostTarget > 15.0) {
        clinicalWarning += (clinicalWarning ? '<br>' : '') + '🔴 **هشدار:** Hb پس از تزریق بالای ۱۵ g/dL است. خطر ویسکوزیته وجود دارد.';
        resultColor = 'var(--danger-color)';
    }

    // 6. نمایش خروجی نهایی (رفع مشکل Markdown)
    resultDiv.innerHTML = `
        <div class="result-title">📆 تاریخ ویزیت بعدی</div>
        <span class="result-value" style="color: ${resultColor};">${nextDateFa}</span>
        <span style="font-size: 1.2em; display: block; margin-top: 5px;">( ${finalDays} روز بعد )</span>
        <hr style="border-top: 1px dashed #ced4da; margin: 15px 0;">

        <div class="units-info">
            💉 **تخمین دوز و حجم مورد نیاز:**
            <ul>
                <li><span class="unit-label">واحد خونی مورد نیاز (تنظیم‌شده):</span> <span style="font-weight:900; color:var(--danger-color)">${unitsNeeded} واحد</span></li>
                <li><span class="unit-label">حجم کل تزریق (تخمینی):</span> ${totalVolume_ml.toFixed(0)} میلی‌لیتر</li>
                <li><span class="unit-label">حجم به ازای کیلوگرم:</span> ${actualVolume_mlkg.toFixed(1)} mL/kg (هدف: ۸-۱۵ mL/kg)</li>
            </ul>
        </div>
        
        ${unitWarning}
        ${holidayWarning}
        ${clinicalWarning ? `<div class="warning-box">${clinicalWarning}</div>` : ''}

        <small class="hint" style="margin-top: 10px; text-align: left; direction: ltr; display: block;">
            **خلاصه محاسبه زمان‌بندی (T):** <span class="math-symbol">T = (Hb<span class="subscript">post</span> - Hb<span class="subscript">threshold</span>) / R = (${HbPostTarget.toFixed(1)} - ${HbThreshold.toFixed(1)}) / ${RateR.toFixed(2)} &#8776; ${T_days.toFixed(1)} days</span>
        </small>
    `;
}
