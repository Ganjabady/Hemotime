// script.js - نسخه نهایی هموتایم | حرفه‌ای، بدون هشدار اضافه | 1404
const defaults = {
    major: { HbPost: 13.0, HbThreshold: 9.5, RateR: 0.24 },
    intermedia: { HbPost: 11.5, HbThreshold: 7.0, RateR: 0.15 }
};

const inputElements = { HbPostTarget: document.getElementById('HbPostTarget'), HbThreshold: document.getElementById('HbThreshold'), RateR: document.getElementById('RateR') };

let iranHolidays = new Set();
const HOLIDAY_URLS = ['https://raw.githubusercontent.com/iyazdanicharati/IranHollidaysJSON/refs/heads/main/1404.json','https://raw.githubusercontent.com/iyazdanicharati/IranHollidaysJSON/refs/heads/main/1405.json','https://raw.githubusercontent.com/iyazdanicharati/IranHollidaysJSON/refs/heads/main/1406.json'];

function getTodayShamsi() { return new Date().toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
function toPersianDate(date) { return date.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }); }

function jalaliToGregorianDate(str) {
    const e = str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    const [y, m, d] = e.split('/').map(Number);
    const base = new Date(Date.UTC(1921, 2, 21));
    const daysInMonth = [31,31,31,31,31,31,30,30,30,30,30,29];
    let days = d - 1;
    for (let i = 0; i < m - 1; i++) days += daysInMonth[i];
    for (let i = 1300; i < y; i++) days += 365 + ((i % 33 in {1:1,5:1,9:1,13:1,17:1,21:1,26:1,30:1}) ? 1 : 0);
    base.setDate(base.getDate() + days);
    return base;
}

async function fetchHolidays() {
    try {
        const res = await Promise.all(HOLIDAY_URLS.map(u => fetch(u).then(r => r.json())));
        res.forEach(data => Object.values(data).forEach(h => h.date && iranHolidays.add(h.date)));
    } catch (e) { console.error("تعطیلات بارگیری نشد"); }
}

function isHolidayOrFriday(date) {
    if (date.getDay() === 5) return true;
    const s = date.toLocaleDateString('fa-IR', {year:'numeric',month:'2-digit',day:'2-digit'})
                  .split('/').map(p => p.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).padStart(2,'0')).join('/');
    return iranHolidays.has(s);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchHolidays();
    document.getElementById('current-date').textContent = 'امروز: ' + toPersianDate(new Date());
    document.getElementById('currentDate').value = getTodayShamsi();

    const typeSelect = document.getElementById('thalassemiaType');
    const applySettings = () => {
        const t = typeSelect.value;
        const disabled = t !== 'custom';
        const s = defaults[t];
        inputElements.HbPostTarget.value = s.HbPost.toFixed(1);
        inputElements.HbThreshold.value = s.HbThreshold.toFixed(1);
        inputElements.RateR.value = s.RateR.toFixed(2);
        Object.values(inputElements).forEach(el => { el.disabled = disabled; });
    };
    typeSelect.addEventListener('change', applySettings);
    applySettings();
});

function calculateNextDate() {
    const shamsi = document.getElementById('currentDate').value;
    const HbPost = parseFloat(document.getElementById('HbPostTarget').value);
    const HbTh = parseFloat(document.getElementById('HbThreshold').value);
    const R = parseFloat(document.getElementById('RateR').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const result = document.getElementById('result');

    const current = jalaliToGregorianDate(shamsi);
    if (!current || isNaN(HbPost) || isNaN(HbTh) || isNaN(R) || isNaN(weight) || HbPost <= HbTh || R <= 0) {
        result.innerHTML = '<div class="warning-box">لطفاً همه فیلدها را با مقدار معتبر پر کنید</div>';
        return;
    }

    // محاسبه T
    const deltaHb = HbPost - HbTh;
    const T_raw = deltaHb / R;
    const T_days = Math.ceil(T_raw);

    // حجم خون (متغیر 260-300، میانگین 280)
    const volumePerUnit = 280;
    const totalVolume = deltaHb * 4 * weight;
    const unitsNeeded = Math.round(totalVolume / volumePerUnit * 10) / 10; // یک رقم اعشار

    // تاریخ بعدی + پرش از تعطیلات
    let next = new Date(current);
    next.setDate(current.getDate() + T_days);
    let extra = 0;
    while (isHolidayOrFriday(next)) { next.setDate(next.getDate() + 1); extra++; }
    const finalDays = T_days + extra;

    // هشدارهای محدود و منطقی
    let warning = '';
    let color = 'var(--secondary-color)';
    if (T_raw > 38) { warning = 'فاصله بیش از ۳۸ روز → بررسی رعایت رژیم تزریق'; color = 'var(--danger-color)'; }
    if (HbPost > 14.5) { warning += (warning?'<br>':'') + 'Hb پس از تزریق بالای ۱۴.۵ → خطر ویسکوزیته'; color = 'var(--danger-color)'; }

    result.innerHTML = `
        <div class="result-title">تاریخ ویزیت بعدی</div>
        <span class="result-value" style="color:${color}">${toPersianDate(next)}</span>
        <div style="margin:10px 0;font-size:1.2em">(${finalDays} روز بعد${extra?` — ${extra} روز تعطیلی پرش کرد`:''})</div>
        <hr style="border:dashed 1px #ddd;margin:15px 0">
        <div class="units-info">
            تخمین دوز:
            <ul>
                <li><strong>${unitsNeeded.toFixed(1)} واحد خون</strong> (تقریبی — هر واحد ≈ 280 ml)</li>
                <li>حجم کل ≈ ${Math.round(totalVolume)} میلی‌لیتر</li>
                <li>حجم به ازای کیلو: ${(totalVolume/weight).toFixed(1)} mL/kg</li>
            </ul>
        </div>
        ${warning ? `<div class="warning-box">${warning}</div>` : ''}
        <small class="hint">فرمول: T = (${HbPost} - ${HbTh}) ÷ ${R} ≈ ${T_raw.toFixed(1)} روز → ${T_days} روز عملی</small>
    `;
}
