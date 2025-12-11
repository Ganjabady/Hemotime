// script.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. نمایش تاریخ روز جاری
    document.getElementById('current-date').textContent = 'امروز: ' + new Date().toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 2. تنظیم تاریخ پیش‌فرض ورودی روی تاریخ روز جاری (فرمت YYYY-MM-DD)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('currentDate').value = `${yyyy}-${mm}-${dd}`;
    
    // 3. مدیریت نمایش فیلد نرخ افت دستی
    const rateRSelect = document.getElementById('RateR');
    const customRateRInput = document.getElementById('CustomRateR');

    rateRSelect.addEventListener('change', () => {
        if (rateRSelect.value === 'custom') {
            customRateRInput.style.display = 'block';
            customRateRInput.required = true;
        } else {
            customRateRInput.style.display = 'none';
            customRateRInput.required = false;
        }
    });
});

function calculateNextDate() {
    // گرفتن ورودی‌ها و اعتبارسنجی
    const currentDateStr = document.getElementById('currentDate').value;
    const HbPostTarget = parseFloat(document.getElementById('HbPostTarget').value);
    const HbThreshold = parseFloat(document.getElementById('HbThreshold').value);
    const resultDiv = document.getElementById('result');
    const weight = parseFloat(document.getElementById('weight').value); // وزن برای مرجع دهی

    let R_rate;
    const rateRSelect = document.getElementById('RateR').value;
    if (rateRSelect === 'custom') {
        R_rate = parseFloat(document.getElementById('CustomRateR').value);
    } else {
        R_rate = parseFloat(rateRSelect);
    }

    // اعتبارسنجی ورودی‌های عددی
    if (!currentDateStr || isNaN(HbPostTarget) || isNaN(HbThreshold) || isNaN(R_rate) || HbPostTarget <= HbThreshold || R_rate <= 0) {
        resultDiv.innerHTML = '⚠️ لطفاً تمامی فیلدها را با مقادیر صحیح پر کنید. (Hb هدف باید از Hb آستانه بزرگتر باشد).';
        return;
    }

    // --- اعمال فرمول استاندارد زمان تزریق (T) ---
    // T (روز) = (Hb_post - Hb_threshold) / R
    const T_days = (HbPostTarget - HbThreshold) / R_rate;
    const roundedDays = Math.ceil(T_days); // گرد کردن به بالا برای احتیاط

    // --- محاسبه تاریخ جدید ---
    const currentDate = new Date(currentDateStr);
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + roundedDays);

    // تبدیل تاریخ به فرمت شمسی برای نمایش
    const nextDateFa = nextDate.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // --- نمایش خروجی ---
    resultDiv.innerHTML = `
        📅 **تاریخ ویزیت بعدی:** <span style="color: #d9534f; font-size: 1.4em;">${nextDateFa}</span><br>
        <span style="font-size: 0.9em;">( ${roundedDays} روز بعد از ویزیت فعلی )</span>
        <hr style="border-top: 1px solid #ccc; margin: 10px 0;">
        
        🔍 **خلاصه محاسبات (بر اساس فرمول $T$):**
        <ul>
            <li>**اختلاف مورد نیاز Hb:** ${HbPostTarget.toFixed(1)} - ${HbThreshold.toFixed(1)} = ${(HbPostTarget - HbThreshold).toFixed(1)} g/dL</li>
            <li>**نرخ افت (R):** ${R_rate.toFixed(2)} g/dL/day</li>
            <li>**فاصله محاسبه شده (T):** ${(T_days).toFixed(1)} روز &rarr; تنظیم شده بر ${roundedDays} روز</li>
        </ul>
        
        <small style="color: #007bff;">* توجه: برای تعیین حجم دقیق خون، از فرمول $\Delta Hb$ استفاده کنید: <br> حجم RBC (mL) ≈ ${(HbPostTarget - HbThreshold).toFixed(1)} g/dL $\times$ وزن ${weight} kg $\times$ ۷۰</small>
    `;
}
