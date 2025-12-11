
// مقادیر پیش‌فرض پروتکل بر اساس TIF 2021
const defaults = {
    major: { HbPost: 13.0, HbThreshold: 10.0, RateR: 0.25 },
    intermedia: { HbPost: 11.5, HbThreshold: 7.0, RateR: 0.15 }
};

// عناصر ورودی که با حالت "دستی" فعال/غیرفعال می‌شوند
const inputElements = {
    HbPostTarget: document.getElementById('HbPostTarget'),
    HbThreshold: document.getElementById('HbThreshold'),
    RateR: document.getElementById('RateR')
};

// ---------------------------------------------------
// تابع کمکی برای تبدیل تاریخ میلادی به شمسی (بومی‌سازی)
// ---------------------------------------------------
function toPersianDate(date) {
    // از توابع بومی جاوااسکریپت برای تبدیل به شمسی استفاده می‌کند
    return date.toLocaleDateString('fa-IR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' ,
        weekday: 'long'
    });
}
// ---------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. نمایش تاریخ روز جاری به شمسی
    document.getElementById('current-date').textContent = 'امروز: ' + toPersianDate(new Date());

    // 2. تنظیم تاریخ پیش‌فرض ورودی روی تاریخ روز جاری (فرمت YYYY-MM-DD میلادی برای input[type="date"])
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('currentDate').value = `${yyyy}-${mm}-${dd}`;
    
    // 3. مدیریت تنظیمات پیش‌فرض و حالت دستی (فعال/غیرفعال کردن ورودی‌ها)
    const typeSelect = document.getElementById('thalassemiaType');
    
    const applySettings = () => {
        const type = typeSelect.value;
        const isDisabled = type !== 'custom';

        if (!isDisabled) {
            // حالت دستی: ورودی‌ها فعال و با پس‌زمینه سفید
            for (const key in inputElements) {
                inputElements[key].disabled = false;
                inputElements[key].style.backgroundColor = 'white';
            }
        } else {
            // حالت پیش‌فرض: ورودی‌ها غیرفعال و مقادیر پر می‌شوند
            const setting = defaults[type];
            inputElements.HbPostTarget.value = setting.HbPost.toFixed(1);
            inputElements.HbThreshold.value = setting.HbThreshold.toFixed(1);
            inputElements.RateR.value = setting.RateR.toFixed(2);
            
            for (const key in inputElements) {
                inputElements[key].disabled = true;
                inputElements[key].style.backgroundColor = ''; 
            }
        }
    };

    typeSelect.addEventListener('change', applySettings);
    applySettings(); 
});


function calculateNextDate() {
    // 1. گرفتن و اعتبارسنجی ورودی‌ها
    const currentDateStr = document.getElementById('currentDate').value;
    const HbPostTarget = parseFloat(document.getElementById('HbPostTarget').value);
    const HbThreshold = parseFloat(document.getElementById('HbThreshold').value);
    const RateR = parseFloat(document.getElementById('RateR').value);
    const patientWeight = parseFloat(document.getElementById('weight').value);
    const resultDiv = document.getElementById('result');

    if (isNaN(HbPostTarget) || isNaN(HbThreshold) || isNaN(RateR) || isNaN(patientWeight) || HbPostTarget <= HbThreshold || RateR <= 0) {
        resultDiv.innerHTML = '<div class="warning-box">⚠️ لطفاً تمامی فیلدها را با مقادیر معتبر پر کنید و مطمئن شوید Hb هدف بزرگتر از آستانه است.</div>';
        return;
    }

    // --- 2. محاسبه زمان‌بندی (T) ---
    const deltaHb = HbPostTarget - HbThreshold;
    const T_days = deltaHb / RateR;
    const roundedDays = Math.ceil(T_days); 

    // --- 3. محاسبه دوز/حجم (با اعمال محدودیت بالینی ایران) ---
    // فرض: هر g/dL افزایش Hb ≈ 4 mL/kg packed RBC
    const requiredVolume_mlkg = deltaHb * 4; 
    let totalVolume_ml = requiredVolume_mlkg * patientWeight;
    let unitsNeeded = Math.ceil(totalVolume_ml / 300); // فرض هر واحد RBC فشرده ≈ 300 mL

    // اعمال محدودیت دوز در ایران (حداکثر ۲ واحد)
    let unitWarning = '';
    const MAX_UNITS = 2;
    
    if (unitsNeeded > MAX_UNITS) {
        unitsNeeded = MAX_UNITS; // محدود کردن تعداد واحد به حداکثر ۲
        totalVolume_ml = MAX_UNITS * 300; // تنظیم حجم بر اساس ۲ واحد (2 * 300 mL)
        unitWarning = '<br>🛑 **توجه (پروتکل ملی):** دوز محاسبه‌شده بیش از ۲ واحد بود، اما به دلیل پروتکل ایران، روی **۲ واحد** تنظیم شد.';
    }
    
    // حجم واقعی به ازای کیلوگرم پس از اعمال محدودیت
    const actualVolume_mlkg = totalVolume_ml / patientWeight;

    // 4. محاسبه تاریخ جدید به شمسی
    const currentDate = new Date(currentDateStr);
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + roundedDays);
    const nextDateFa = toPersianDate(nextDate); // استفاده از تابع بومی‌ساز
    
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

    // 6. نمایش خروجی با رفع مشکلات کاراکتر
    resultDiv.innerHTML = `
        <div class="result-title">📆 تاریخ ویزیت بعدی</div>
        <span class="result-value" style="color: ${resultColor};">${nextDateFa}</span>
        <span style="font-size: 1.2em; display: block; margin-top: 5px;">( ${roundedDays} روز بعد )</span>
        <hr style="border-top: 1px dashed #ced4da; margin: 15px 0;">

        <div class="units-info">
            💉 **تخمین دوز و حجم مورد نیاز:**
            <ul>
                <li>**واحد خونی مورد نیاز (تنظیم‌شده):** <span style="font-weight:900; color:var(--danger-color)">${unitsNeeded} واحد</span></li>
                <li>**حجم کل تزریق (تخمینی):** ${totalVolume_ml.toFixed(0)} میلی‌لیتر</li>
                <li>**حجم به ازای کیلوگرم:** ${actualVolume_mlkg.toFixed(1)} mL/kg (هدف: ۸-۱۵ mL/kg)</li>
            </ul>
        </div>
        
        ${unitWarning}
        ${clinicalWarning ? `<div class="warning-box">${clinicalWarning}</div>` : ''}

        <small class="hint" style="margin-top: 10px; text-align: left; direction: ltr; display: block;">
            **خلاصه محاسبه زمان‌بندی (T):** <span class="math-symbol">T = (Hb<span class="subscript">post</span> - Hb<span class="subscript">threshold</span>) / R = (${HbPostTarget.toFixed(1)} - ${HbThreshold.toFixed(1)}) / ${RateR.toFixed(2)} &#8776; ${T_days.toFixed(1)} days</span>
        </small>
    `;
}
