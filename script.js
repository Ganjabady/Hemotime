// script.js

const defaults = {
    major: { HbPost: 13.0, HbThreshold: 10.0, RateR: 0.25 },
    intermedia: { HbPost: 11.5, HbThreshold: 7.0, RateR: 0.15 }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. نمایش تاریخ روز جاری
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 2. تنظیم تاریخ پیش‌فرض ورودی روی تاریخ روز جاری
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('currentDate').value = `${yyyy}-${mm}-${dd}`;
    
    // 3. تنظیمات پیش‌فرض بر اساس نوع تالاسمی
    const typeSelect = document.getElementById('thalassemiaType');
    typeSelect.addEventListener('change', () => {
        const type = typeSelect.value;
        if (type !== 'custom') {
            document.getElementById('HbPostTarget').value = defaults[type].HbPost.toFixed(1);
            document.getElementById('HbThreshold').value = defaults[type].HbThreshold.toFixed(1);
            document.getElementById('RateR').value = defaults[type].RateR.toFixed(2);
        }
    });

    // تنظیم مقادیر پیش‌فرض اولیه (ماژور)
    typeSelect.dispatchEvent(new Event('change'));
});

function calculateNextDate() {
    // 1. گرفتن ورودی‌ها
    const currentDateStr = document.getElementById('currentDate').value;
    const HbPostTarget = parseFloat(document.getElementById('HbPostTarget').value);
    const HbThreshold = parseFloat(document.getElementById('HbThreshold').value);
    const RateR = parseFloat(document.getElementById('RateR').value);
    const patientWeight = parseFloat(document.getElementById('weight').value);
    const resultDiv = document.getElementById('result');

    // 2. اعتبارسنجی
    if (!currentDateStr || isNaN(HbPostTarget) || isNaN(HbThreshold) || isNaN(RateR) || isNaN(patientWeight)) {
        resultDiv.innerHTML = '<div class="warning-box">⚠️ لطفاً تمامی فیلدها را با مقادیر معتبر پر کنید.</div>';
        return;
    }
    if (HbPostTarget <= HbThreshold || RateR <= 0) {
        resultDiv.innerHTML = '<div class="warning-box">⚠️ Hb هدف باید بزرگتر از Hb آستانه باشد و نرخ افت باید مثبت باشد.</div>';
        return;
    }

    // --- 3. محاسبه زمان‌بندی (T) بر اساس فرمول TIF ---
    // T (روز) = (Hb_post - Hb_threshold) / R
    const deltaHb = HbPostTarget - HbThreshold;
    const T_days = deltaHb / RateR;
    const roundedDays = Math.ceil(T_days); 

    // --- 4. محاسبه دوز/حجم مورد نیاز بر اساس فرمول TIF ---
    // حجم (mL/kg) = ΔHb * 4 (هر g/dL ≈ 4 mL/kg packed RBC)
    const requiredVolume_mlkg = deltaHb * 4; 
    const totalVolume_ml = requiredVolume_mlkg * patientWeight;
    const unitsNeeded = Math.ceil(totalVolume_ml / 300); // فرض هر واحد RBC فشرده ≈ 300 mL

    // 5. محاسبه تاریخ جدید
    const currentDate = new Date(currentDateStr);
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + roundedDays);
    const nextDateFa = nextDate.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // 6. تعیین هشدار بالینی
    let clinicalWarning = '';
    let resultColor = 'var(--secondary-color)';
    
    if (T_days < 14) {
        clinicalWarning = '⚠️ **هشدار TIF:** فاصله تزریق کمتر از ۱۴ روز است. بررسی هیپرترانسفوزیون یا طحال فعال توصیه می‌شود.';
        resultColor = 'var(--danger-color)';
    } else if (T_days > 35) {
        clinicalWarning = '⚠️ **هشدار TIF:** فاصله تزریق بیش از ۳۵ روز است. بررسی احتمال R پایین یا اریتروپویزیس ناکارآمد توصیه می‌شود.';
    }
    if (HbPostTarget > 15.0) {
        clinicalWarning += (clinicalWarning ? '<br>' : '') + '🔴 **هشدار:** Hb پس از تزریق (Hb Post) بالای ۱۵ g/dL است. خطر ویسکوزیته وجود دارد.';
        resultColor = 'var(--danger-color)';
    }

    // 7. نمایش خروجی با استایل جدید
    resultDiv.innerHTML = `
        <div class="result-title">📆 تاریخ ویزیت بعدی</div>
        <span class="result-value" style="color: ${resultColor};">${nextDateFa}</span>
        <span style="font-size: 1.1em; display: block;">( ${roundedDays} روز بعد )</span>
        <hr style="border-top: 1px dashed #ced4da; margin: 15px 0;">

        <div class="units-info">
            💉 **تخمین دوز و حجم مورد نیاز:**
            <ul>
                <li>**واحد خونی مورد نیاز:** **${unitsNeeded} واحد** (بر اساس ۳۰۰ mL در واحد)</li>
                <li>**حجم کل تزریق (تخمینی):** ${totalVolume_ml.toFixed(0)} میلی‌لیتر</li>
                <li>**حجم به ازای کیلوگرم:** ${requiredVolume_mlkg.toFixed(1)} mL/kg (حداکثر استاندارد: ۱۵-۲۰ mL/kg)</li>
            </ul>
        </div>
        
        ${clinicalWarning ? `<div class="warning-box">${clinicalWarning}</div>` : ''}

        <small class="hint" style="margin-top: 10px;">
            **خلاصه فرمول زمان‌بندی:** $\frac{${HbPostTarget.toFixed(1)} - ${HbThreshold.toFixed(1)}}{${RateR.toFixed(2)}} = ${T_days.toFixed(1)} \text{ روز} \to {roundedDays} \text{ روز}$
        </small>
    `;
}
