// script.js

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
// توابع Jalali-Gregorian (بومی‌سازی تاریخ)
// ---------------------------------------------------

/**
 * دریافت تاریخ امروز به فرمت شمسی YYYY/MM/DD (با اعداد فارسی)
 */
function getTodayShamsi() {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    // new Date().toLocaleDateString('fa-IR', options) فرمت مورد نظر (مثال: ۱۴۰۴/۰۹/۲۱) را برمی‌گرداند.
    return new Date().toLocaleDateString('fa-IR', options);
}

/**
 * تبدیل شیء Date میلادی به تاریخ شمسی بلند (برای خروجی)
 */
function toPersianDate(date) {
    return date.toLocaleDateString('fa-IR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' ,
        weekday: 'long'
    });
}

/**
 * تبدیل تاریخ شمسی ورودی (YYYY/MM/DD) به شیء Date میلادی
 * توجه: این یک پیاده‌سازی ساده برای انجام محاسبات داخلی است و در محیط واقعی نیاز به کتابخانه کامل دارد.
 */
function jalaliToGregorianDate(shamsiDateStr) {
    // تبدیل اعداد فارسی به انگلیسی برای پارس کردن داخلی
    const englishNumbersStr = shamsiDateStr.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    const parts = englishNumbersStr.split('/');
    if (parts.length !== 3) return null;

    const jYear = parseInt(parts[0], 10);
    const jMonth = parseInt(parts[1], 10);
    const jDay = parseInt(parts[2], 10);

    // تاریخ مبنای تبدیل (۱ فروردین ۱۳۰۰ = ۲۱ مارس ۱۹۲۱)
    const BASE_DATE = new Date(Date.UTC(1921, 2, 21)); 
    const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    
    let days = jDay - 1; // روزهای ماه جاری
    for (let i = 0; i < jMonth - 1; i++) {
        days += j_days_in_month[i];
    }
    
    // تعداد روزهای سال‌های شمسی قبل از سال جاری
    for (let i = 1300; i < jYear; i++) {
        // تعیین کبیسه بودن سال شمسی: (Year + 682) % 33
        // از سال ۱۳۰۴، هر ۴ سال یکبار کبیسه است (تقریبی)
        days += 365 + ((i % 33 === 1 || i % 33 === 5 || i % 33 === 9 || i % 33 === 13 || i % 33 === 17 || i % 33 === 21 || i % 33 === 26 || i % 33 === 30) ? 1 : 0);
    }
    
    let date = new Date(BASE_DATE);
    date.setDate(date.getDate() + days); // اضافه کردن روزها به تاریخ مبنا

    return date;
}

/**
 * فراخوانی فایل‌های JSON تعطیلات از GitHub و ذخیره آن‌ها
 */
async function fetchHolidays() {
    try {
        const promises = HOLIDAY_URLS.map(url => fetch(url).then(res => res.json()));
        
        const results = await Promise.all(promises);
        
        results.forEach(data => {
            Object.values(data).forEach(holiday => {
                if (holiday.date) iranHolidays.add(holiday.date); // تاریخ‌ها باید با فرمت لیست JSON (مثال: 1404/01/01) ذخیره شوند.
            });
        });

    } catch (error) {
        console.error("❌ خطای بارگذاری لیست تعطیلات:", error);
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

    // 2. چک کردن تعطیلات رسمی (نیاز به تبدیل به شمسی)
    const shamsiDateParts = date.toLocaleDateString('fa-IR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    }).split('/');
    
    // تبدیل اعداد فارسی به انگلیسی برای مقایسه با لیست تعطیلات که اعداد انگلیسی دارند
    const formattedShamsi = shamsiDateParts.map(p => {
        return p.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).padStart(2, '0');
    }).join('/');
    
    // فرمت نهایی برای مقایسه با Set: YYYY/MM/DD (با اعداد انگلیسی)
    return iranHolidays.has(formattedShamsi);
}


// ---------------------------------------------------
// منطق اجرای برنامه
// ---------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. بارگذاری لیست تعطیلات به صورت Asynchronous
    fetchHolidays();
    
    // 2. نمایش تاریخ روز جاری به شمسی در هدر
    document.getElementById('current-date').textContent = 'امروز: ' + toPersianDate(new Date());

    // 3. تنظیم تاریخ پیش‌فرض شمسی روی تاریخ روز جاری (حل مشکل پیش‌فرض)
    document.getElementById('currentDate').value = getTodayShamsi(); 
    
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
    let currentDate = jalaliToGregorianDate(currentDateShamsi);
    

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

    // 5. تعیین هشدار بالینی (همانند قبل)
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

    // 6. نمایش خروجی نهایی 
    resultDiv.innerHTML = `
        <div class="result-title">📆 تاریخ ویزیت بعدی</div>
        <span class="result-value" style="color: ${resultColor};">${nextDateFa}</span>
        <span style="font-size: 1.2em; display: block; margin-top: 5px;">( ${finalDays} روز بعد )</span>
        <hr style="border-top: 1px dashed #ced4da; margin: 15px 0;">

        <div class="units-info">
            💉 تخمین دوز و حجم مورد نیاز:
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
