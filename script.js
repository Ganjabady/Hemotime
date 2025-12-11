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
// توابع تاریخ شمسی و تقویم
// ---------------------------------------------------

function getTodayShamsi() {
    return new Date().toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function toPersianDate(date) {
    return date.toLocaleDateString('fa-IR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });
}

function jalaliToGregorianDate(shamsiDateStr) {
    const englishStr = shamsiDateStr.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    const parts = englishStr.split('/');
    if (parts.length !== 3) return null;

    const jYear = parseInt(parts[0], 10);
    const jMonth = parseInt(parts[1], 10);
    const jDay = parseInt(parts[2], 10);

    const BASE_DATE = new Date(Date.UTC(1921, 2, 21));
    const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

    let days = jDay - 1;
    for (let i = 0; i < jMonth - 1; i++) days += j_days_in_month[i];

    for (let i = 1300; i < jYear; i++) {
        days += 365 + ((i % 33 === 1 || i % 33 === 5 || i % 33 === 9 || i % 33 === 13 || 
                        i % 33 === 17 || i % 33 === 21 || i % 33 === 26 || i % 33 === 30) ? 1 : 0);
    }

    let date = new Date(BASE_DATE);
    date.setDate(date.getDate() + days);
    return date;
}

async function fetchHolidays() {
    try {
        const promises = HOLIDAY_URLS.map(url => fetch(url).then(res => res.json()));
        const results = await Promise.all(promises);
        
        results.forEach(data => {
            Object.values(data).forEach(holiday => {
                if (holiday.date) iranHolidays.add(holiday.date);
            });
        });
    } catch (error) {
        console.error("خطا در بارگذاری تعطیلات:", error);
    }
}

function isHolidayOrFriday(date) {
    if (date.getDay() === 5) return true; // جمعه

    const shamsi = date.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' })
                       .split('/').map(p => p.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).padStart(2, '0'))
                       .join('/');
    return iranHolidays.has(shamsi);
}

// ---------------------------------------------------
// راه‌اندازی اولیه
// ---------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    fetchHolidays();
    document.getElementById('current-date').textContent = 'امروز: ' + toPersianDate(new Date());
    document.getElementById('currentDate').value = getTodayShamsi();

    const typeSelect = document.getElementById('thalassemiaType');

    const applySettings = () => {
        const type = typeSelect.value;
        const isDisabled = type !== 'custom';
        const setting = defaults[type];

        inputElements.HbPostTarget.value = setting.HbPost.toFixed(1);
        inputElements.HbThreshold.value = setting.HbThreshold.toFixed(1);
        inputElements.RateR.value = setting.RateR.toFixed(2);

        Object.values(inputElements).forEach(el => {
            el.disabled = isDisabled;
            el.style.backgroundColor = isDisabled ? '' : 'white';
        });
    };

    typeSelect.addEventListener('change', applySettings);
    applySettings();
});

// ---------------------------------------------------
// تابع اصلی محاسبه
// ---------------------------------------------------

function calculateNextDate() {
    const currentDateShamsi = document.getElementById('currentDate').value;
    const HbPostTarget = parseFloat(document.getElementById('HbPostTarget').value);
    const HbThreshold = parseFloat(document.getElementById('HbThreshold').value);
    const RateR = parseFloat(document.getElementById('RateR').value);
    const patientWeight = parseFloat(document.getElementById('weight').value);
    const resultDiv = document.getElementById('result');

    let currentDate = jalaliToGregorianDate(currentDateShamsi);

    if (!currentDate || isNaN(HbPostTarget) || isNaN(HbThreshold) || isNaN(RateR) || isNaN(patientWeight) || HbPostTarget <= HbThreshold || RateR <= 0) {
        resultDiv.innerHTML = '<div class="warning-box">لطفاً تمامی فیلدها را با مقادیر معتبر پر کنید و فرمت تاریخ شمسی را رعایت کنید (مثال: ۱۴۰۴/۰۹/۲۱)</div>';
        return;
    }

    // محاسبه دقیق زمان‌بندی (T)
    const deltaHb = HbPostTarget - HbThreshold;
    const T_days_raw = deltaHb / RateR;           // مقدار خام (اعشاری)
    const T_days = Math.ceil(T_days_raw);         // تعداد روزهای واقعی تزریق (گرد شده به بالا)
    const initialDays = T_days;

    // محاسبه دوز و حجم
    let requiredVolume_mlkg = deltaHb * 4;
    let totalVolume_ml = requiredVolume_mlkg * patientWeight;
    let unitsNeeded = Math.ceil(totalVolume_ml / 300);

    let unitWarning = '';
    const MAX_UNITS = 2;
    if (unitsNeeded > MAX_UNITS) {
        unitsNeeded = MAX_UNITS;
        totalVolume_ml = MAX_UNITS * 300;
        unitWarning = '<br>توجه (پروتکل ملی): دوز بیش از ۲ واحد بود → به ۲ واحد محدود شد.';
    }
    const actualVolume_mlkg = totalVolume_ml / patientWeight;

    // محاسبه تاریخ بعدی + پرش از تعطیلات و جمعه
    let nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + initialDays);

    let extraDays = 0;
    while (isHolidayOrFriday(nextDate)) {
        nextDate.setDate(nextDate.getDate() + 1);
        extraDays++;
    }

    const finalDays = initialDays + extraDays;
    const nextDateFa = toPersianDate(nextDate);

    let holidayWarning = extraDays > 0 
        ? `<br>تعدیل تاریخ: به دلیل ${extraDays} روز تعطیل/جمعه، تاریخ ویزیت جلو کشیده شد.`
        : '';

    // هشدارهای بالینی (اصلاح‌شده و منطقی)
    let clinicalWarning = '';
    let resultColor = 'var(--secondary-color)';

    if (T_days_raw < 13.5) { // واقعاً کمتر از ۱۴ روز (حتی بعد از گرد کردن)
        clinicalWarning = 'هشدار TIF: فاصله تزریق کمتر از ۱۴ روز است → طحال فعال یا دوز بالا؟';
        resultColor = 'var(--danger-color)';
    } else if (T_days_raw > 38) { // بیشتر از ۳۵ روز با حاشیه امن
        clinicalWarning = 'هشدار TIF: فاصله تزریق بیش از ۳۵ روز است → بررسی نرخ R و رعایت رژیم';
        resultColor = 'var(--danger-color)';
    }

    if (HbPostTarget > 15.0) {
        clinicalWarning += (clinicalWarning ? '<br>' : '') + 'خطر ویسکوزیته: Hb پس از تزریق بالای ۱۵ g/dL است!';
        resultColor = 'var(--danger-color)';
    }

    // نمایش نتیجه نهایی
    resultDiv.innerHTML = `
        <div class="result-title">تاریخ ویزیت بعدی</div>
        <span class="result-value" style="color: ${resultColor};">${nextDateFa}</span>
        <span style="font-size: 1.2em; display: block; margin-top: 5px;">( ${finalDays} روز بعد )</span>
        <hr style="border-top: 1px dashed #ced4da; margin: 15px 0;">

        <div class="units-info">
            تخمین دوز و حجم مورد نیاز:
            <ul>
                <li><span class="unit-label">واحد خونی (تنظیم‌شده):</span> <strong style="color:var(--danger-color)">${unitsNeeded} واحد</strong></li>
                <li><span class="unit-label">حجم کل:</span> ${totalVolume_ml.toFixed(0)} میلی‌لیتر</li>
                <li><span class="unit-label">حجم به ازای کیلوگرم:</span> ${actualVolume_mlkg.toFixed(1)} mL/kg (هدف: ۸-۱۵)</li>
            </ul>
        </div>

        ${unitWarning}
        ${holidayWarning}
        ${clinicalWarning ? `<div class="warning-box">${clinicalWarning}</div>` : ''}

        <small class="hint" style="margin-top: 15px; display: block; color: #555;">
            فرمول: T = (Hb<sub>post</sub> - Hb<sub>threshold</sub>) / R ≈ ${T_days_raw.toFixed(1)} روز 
            → گرد شده به ${T_days} روز
        </small>
    `;
}
