try { lucide.createIcons(); } catch (e) { /* ignore if CDN not loaded */ }

// تخزين محلي آمن
function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* تجاهل */ }
}
function safeGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch (e) { return fallback; }
}
function todayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// راية داخلية: هل تم مسح تخزين الموقع أثناء فتح الصفحة؟
let storageWasCleared = false;

// مفتاح اليوم بناءً على فترة الفجر: يبدأ اليوم من الفجر وينتهي عند فجر اليوم التالي
function fajrDayKey(now = new Date()) {
  const { Fajr, nextFajr } = PRAYER_TIMES;
  if (Fajr instanceof Date && nextFajr instanceof Date) {
    if (now >= Fajr && now < nextFajr) {
      // داخل نافذة اليوم الحالي (من فجر اليوم إلى فجر الغد)
      const d = new Date(Fajr);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    }
    if (now < Fajr) {
      // قبل فجر اليوم: ننسبه إلى فجر الأمس
      const y = new Date(Fajr);
      y.setDate(y.getDate() - 1);
      const mm = String(y.getMonth() + 1).padStart(2, '0');
      const dd = String(y.getDate()).padStart(2, '0');
      return `${y.getFullYear()}-${mm}-${dd}`;
    }
  }
  // إن لم تتوفر المواقيت بعد، استخدم تاريخ اليوم القياسي
  return todayKey();
}

// حساب عدد الأذكار لليوم النشط (0-2) بالاعتماد على الرايات لكل فترة
function getDhikrCountForActiveDay() {
  const key = fajrDayKey();
  let cnt = 0;
  if (safeGet(`dhikrDone:morning:${key}`, false)) cnt++;
  if (safeGet(`dhikrDone:evening:${key}`, false)) cnt++;
  return cnt;
}

// مفاتيح الأسبوع والشهر
function weekKey(date = new Date()) {
  // نجعل السبت هو أول يوم في الأسبوع (الجمعة آخر يوم)
  const d = new Date(date);
  const day = d.getDay(); // 0=الأحد ... 6=السبت
  const offsetToSaturday = (day + 1) % 7; // يُعيد 0 للسبت، 1 للأحد، ... 6 للجمعة
  const start = new Date(d);
  start.setHours(0,0,0,0);
  start.setDate(d.getDate() - offsetToSaturday);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const dd = String(start.getDate()).padStart(2, '0');
  // نستخدم تاريخ السبت كبُعد أسبوعي ثابت
  return `${y}-${m}-${dd}`;
}

function monthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// حفظ شامل للتقدّم قبل إغلاق/تحديث الصفحة
function persistAll() {
  // إذا تم مسح التخزين أثناء الجلسة، لا تعِد حفظ القيم القديمة حتى لا نعيد بناء ما مُسِح
  if (storageWasCleared || safeGet('appMarker', null) === null) {
    return;
  }
  // القرآن
  safeSet('quranProgress', quranProgress);
  safeSet('quranCount', quranCount);
  const sel = document.getElementById('quran-choice');
  if (sel) safeSet('quranChoice', sel.value);

  // الأذكار (عدد اليوم الحالي عبر فجر)
  const dhikrKey = `dhikrCount:${fajrDayKey()}`;
  safeSet(dhikrKey, getDhikrCountForActiveDay());

  // الامتنان
  const gInput = document.getElementById('gratitude-text');
  if (gInput) safeSet('gratitudeText', gInput.value || '');
}

// التبديل بين التبويبات
const tabWorship = document.getElementById("tab-worship");
const tabCommunity = document.getElementById("tab-community");
const worshipSection = document.getElementById("worship-section");
const communitySection = document.getElementById("community-section");

function switchTab(activeTab, activeSection) {
  // إزالة الفئة النشطة من جميع التبويبات والأقسام
  [tabWorship, tabCommunity].forEach(tab => tab.classList.remove("active"));
  [worshipSection, communitySection].forEach(section => section.classList.remove("active"));
  
  // إضافة الفئة النشطة للتبويب والقسم المحدد
  activeTab.classList.add("active");
  activeSection.classList.add("active");
}

tabWorship.addEventListener("click", () => switchTab(tabWorship, worshipSection));
tabCommunity.addEventListener("click", () => switchTab(tabCommunity, communitySection));

// الوضع الليلي مع تبديل الهلال والشمس
// تم حذف زر toggle-dark من الهيدر، لذا نحذف الكود التالي:
// const toggleBtn = document.getElementById("toggle-dark");
// toggleBtn.addEventListener("click", () => {
//   document.documentElement.classList.toggle("dark");
//   toggleBtn.textContent = document.documentElement.classList.contains("dark") ? "☀️" : "🌙";
// });

// تطبيق الوضع الليلي من التخزين عند التحميل (نسخة احتياطية لو لم يعمل سكربت head)
document.addEventListener('DOMContentLoaded', () => {
  const theme = safeGet('theme', null);
  if (theme === 'dark') document.documentElement.classList.add('dark');

  // ضع علامة تثبت وجود بيانات للموقع؛ إن اختفت أثناء الجلسة فنكتشف المسح
  if (safeGet('appMarker', null) === null) safeSet('appMarker', true);

  // راقب إذا تم مسح بيانات الموقع من إعدادات المتصفح أثناء فتح الصفحة
  setInterval(() => {
    if (safeGet('appMarker', null) === null && !storageWasCleared) {
      storageWasCleared = true;
      // صفّر بيانات القرآن في الذاكرة والواجهة فورًا
      try {
        quranProgress = 0;
        quranCount = 0;
        const bar = document.getElementById('quran-progress');
        if (bar) bar.style.width = '0%';
        updateLeaderboard();
      } catch (_) { /* تجاهل */ }
    }
  }, 3000);
});

// حفظ عند محاولة إغلاق/تحديث الصفحة
window.addEventListener('beforeunload', persistAll);

// الساعة الحية
function updateClock() {
  const now = new Date();
  const formatted = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });
  document.getElementById("clock").textContent = formatted;
}
setInterval(updateClock, 1000);
updateClock();

// =================== أذكار الصباح والمساء ===================
let PRAYER_TIMES = { Fajr: null, Dhuhr: null, Asr: null, nextFajr: null };
let fajrResetTimer = null; // مؤقت لإعادة الضبط عند الفجر
const AZKAR_MORNING = [
  { text: 'أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير، ربِّ أسألك خير ما في هذا اليوم وخير ما بعده، وأعوذ بك من شر ما في هذا اليوم وشر ما بعده، ربِّ أعوذ بك من الكسل وسوء الكبر، ربَّ أعوذ بك من عذابٍ في النار وعذابٍ في القبر.', repeat: 1 },
  { text: 'اللَّهُ لا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لا تَأْخُذُهُ سِنَةٌ وَلا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ.', repeat: 1 },
  { text: 'سورة الإخلاص', repeat: 3 },
  { text: 'سورة الفلقَ', repeat: 3 },
  { text: 'سورة الناسِ', repeat: 3 },
  { text: 'رضيت بالله رباً وبالإسلام ديناً وبمحمد ﷺ نبياً', repeat: 3 },
];
const AZKAR_EVENING = [
  { text: 'أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير، ربِّ أسألك خير ما في هذه الليلة وخير ما بعدها، وأعوذ بك من شر ما في هذه الليلة وشر ما بعدها، ربِّ أعوذ بك من الكسل وسوء الكبر، ربَّ أعوذ بك من عذابٍ في النار وعذابٍ في القبر.', repeat: 1 },
  { text: 'اللَّهُ لا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لا تَأْخُذُهُ سِنَةٌ وَلا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ.', repeat: 1 },
  { text: 'سورة الإخلاص', repeat: 3 },
  { text: 'سورة الفلقَ', repeat: 3 },
  { text: 'سورة الناسِ', repeat: 3 },
  { text: 'رضيت بالله رباً وبالإسلام ديناً وبمحمد ﷺ نبياً', repeat: 3 },
];

let azkarState = { list: AZKAR_MORNING, index: 0, remain: 1, period: 'morning' };

function currentPeriod(now = new Date()) {
  // يعتمد على مواقيت: صباح من الفجر إلى الظهر، مساء من العصر إلى الفجر التالي
  const { Fajr, Dhuhr, Asr, nextFajr } = PRAYER_TIMES;
  if (Fajr && Dhuhr && now >= Fajr && now < Dhuhr) return 'morning';
  if (Asr && ((now >= Asr && (!nextFajr || now < nextFajr)) || (!Asr && !nextFajr))) return 'evening';
  // في حال عدم توفر المواقيت بعد: حدد بحسب الوقت المحلي التقريبي
  const h = now.getHours();
  return (h >= 4 && h < 12) ? 'morning' : 'evening';
}

function setAzkarButtonLabel() {
  const btn = document.getElementById('btn-azkar-open');
  const title = document.getElementById('azkar-modal-title');
  if (!btn) return;
  const period = currentPeriod();
  btn.textContent = period === 'morning' ? 'أذكار الصباح' : 'أذكار المساء';
  if (title) title.textContent = btn.textContent;
}

function openAzkarModal() {
  const modal = document.getElementById('azkar-modal');
  if (!modal) return;
  const period = currentPeriod();
  azkarState.period = period;
  azkarState.list = period === 'morning' ? AZKAR_MORNING : AZKAR_EVENING;
  azkarState.index = 0;
  azkarState.remain = azkarState.list[0]?.repeat || 1;
  updateAzkarView();
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeAzkarModal() {
  const modal = document.getElementById('azkar-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function updateAzkarView() {
  const item = azkarState.list[azkarState.index];
  const textEl = document.getElementById('azkar-text');
  const remEl = document.getElementById('azkar-remaining');
  const title = document.getElementById('azkar-modal-title');
  if (title) title.textContent = azkarState.period === 'morning' ? 'أذكار الصباح' : 'أذكار المساء';
  if (textEl) textEl.textContent = item ? item.text : '';
  if (remEl) remEl.textContent = String(azkarState.remain || 1);
  // تمكين/تعطيل الأزرار
  const prev = document.getElementById('azkar-prev');
  const next = document.getElementById('azkar-next');
  if (prev) prev.disabled = azkarState.index === 0;
  if (next) next.disabled = azkarState.index >= azkarState.list.length - 1 && azkarState.remain <= 1;
}

function azkarNext() {
  if (azkarState.remain > 1) {
    azkarState.remain -= 1;
  } else if (azkarState.index < azkarState.list.length - 1) {
    azkarState.index += 1;
    azkarState.remain = azkarState.list[azkarState.index].repeat || 1;
  }
  updateAzkarView();
}

function azkarPrev() {
  if (azkarState.index > 0) {
    azkarState.index -= 1;
    azkarState.remain = azkarState.list[azkarState.index].repeat || 1;
    updateAzkarView();
  }
}

function azkarFinish() {
  // إذا كان المستخدم في نافذة أذكار المسجد (mosqueAzkarState.list && mosqueAzkarState.list.length > 0)
  if (mosqueAzkarState.list && mosqueAzkarState.list.length > 0) {
    const modal = document.getElementById('azkar-modal');
    modal.classList.add('hidden');
    const prayerKey = mosqueAzkarState.prayerKey;
    const mosqueBtn = document.querySelector(`.mosque-btn[data-prayer-key="${prayerKey}"]`);
    if (mosqueBtn) {
      mosqueBtn.classList.add('done');
      mosqueBtn.innerHTML = '✅';
    }
    const completedKey = `completedMosqueAzkar:${todayKey()}`;
    const completed = new Set(safeGet(completedKey, []));
    completed.add(prayerKey);
    safeSet(completedKey, Array.from(completed));
    console.log('تم إنهاء أذكار المسجد:', Array.from(completed));
    updateCombinedProgress();
    updateLeaderboard();
    mosqueAzkarState = { list: [], index: 0, remain: 1, prayerKey: '' };
    const title = document.getElementById('azkar-modal-title');
    const period = currentPeriod();
    title.textContent = period === 'morning' ? 'أذكار الصباح' : 'أذكار المساء';
    return;
  }

  // إذا كان المستخدم في نافذة أذكار الصباح/المساء
  const period = azkarState.period || currentPeriod();
  const key = fajrDayKey();
  const flagKey = `dhikrDone:${period}:${key}`;
  if (!safeGet(flagKey, false)) {
    safeSet(flagKey, true);
    console.log('تم إنهاء أذكار الفترة:', period, 'المفتاح:', flagKey);
  }
  // تحديث المتغير في الذاكرة
  dhikrCount = getDhikrCountForActiveDay();
  console.log('dhikrCount بعد الإنهاء:', dhikrCount);
  // تحديث الشريط دائماً بعد محاولة الإنهاء
  updateCombinedProgress();
  updateLeaderboard();
  closeAzkarModal();
}

// التحكم بالكروت
const cards = [
  { btn: "btn-salah", content: "salah", arrow: "arrow-salah" },
  { btn: "btn-quran", content: "quran", arrow: "arrow-quran" },
  { btn: "btn-azkar", content: "azkar", arrow: "arrow-azkar" },
  { btn: "btn-gratitude", content: "gratitude", arrow: "arrow-gratitude" }
];

cards.forEach(c => {
  document.getElementById(c.btn).addEventListener("click", () => {
    const section = document.getElementById(c.content);
    const arrow = document.getElementById(c.arrow);
    section.classList.toggle("hidden");
    arrow.classList.toggle("rotate-180");
  });
});

// =================== التحديات: بيانات وحالة ===================
const DEFAULT_CHALLENGES = {
  daily: {
    fixed: [
      { id: 'd-f-prayers', title: 'الصلاه في المسجد خمس صلوات' },
      { id: 'd-f-quran', title: 'قراءة القران' },
      { id: 'd-f-adhkar', title: 'اذكار الصباح و المساء' }
    ],
    rotatingPool: [
      { id: 'd-r-1', title: 'صلاة الوتر' },
      { id: 'd-r-2', title: 'قراءة 5 صفحات قرآن' },
      { id: 'd-r-3', title: 'أذكار الصباح أو المساء' },
      { id: 'd-r-4', title: 'صلة رحم: تواصل مع قريب' },
      { id: 'd-r-5', title: 'صدقة بسيطة' },
      { id: 'd-r-6', title: 'تعلم حديث قصير' },
      { id: 'd-r-7', title: '10 دقائق تدبر' },
      { id: 'd-r-8', title: 'قيام ركعتين' },
      { id: 'd-r-9', title: 'شكر الله على نعمة اليوم' },
      { id: 'd-r-10', title: 'الدعاء لنفسك أو للآخرين' },
      { id: 'd-r-11', title: 'ترتيب غرفتك أو مكتبك' },
      { id: 'd-r-12', title: 'قراءة فقرة من كتاب إسلامي' },
      { id: 'd-r-13', title: 'مساعدة أحد أفراد العائلة' },
      { id: 'd-r-14', title: 'المحافظة على الابتسامة' },
      { id: 'd-r-15', title: 'الاستغفار 100 مرة' },
      { id: 'd-r-16', title: 'الدعاء للمسلمين أجمعين' },
      { id: 'd-r-17-mon', title: 'صيام نافلة (الاثنين)', condition: 'mondayOnly' },
      { id: 'd-r-17-thu', title: 'صيام نافلة (الخميس)', condition: 'thursdayOnly' },
      { id: 'd-r-18', title: 'تذكر آية قرآنية من حفظك' },
      { id: 'd-r-19', title: 'تفقد جيرانك والتواصل معهم' },
      { id: 'd-r-20', title: 'شرب 8 أكواب ماء' },
      { id: 'd-r-21', title: 'قراءة دعاء معين 3 مرات' },
      { id: 'd-r-22', title: 'تنظيف مكان في البيت' },
      { id: 'd-r-23', title: 'تقديم نصيحة لطالب أو صديق' },
      { id: 'd-r-24', title: 'تخصيص 15 دقيقة لتعلم شيء جديد' },
      { id: 'd-r-25', title: 'صلاة ركعتين قبل النوم' },
      { id: 'd-r-26', title: 'حفظ آية قصيرة من القرآن' },
      { id: 'd-r-27', title: 'قراءة سيرة نبي أو صحابي' },
      { id: 'd-r-28', title: 'إرسال رسالة شكر لشخص' },
      { id: 'd-r-29', title: 'ممارسة الرياضة 15 دقيقة' },
      { id: 'd-r-30', title: 'تنظيف الهاتف أو الجهاز' },
      { id: 'd-r-31', title: 'ترتيب الأدوات المكتبية' },
      { id: 'd-r-32', title: 'كتابة أهداف اليوم غدًا' },
      { id: 'd-r-33', title: 'قراءة حديث يوميًا' },
      { id: 'd-r-34', title: 'الاستماع لمحاضرة قصيرة' },
      { id: 'd-r-35', title: 'الدعاء للوالدين' },
      { id: 'd-r-36', title: 'تصفح موضوع علمي مفيد' },
      { id: 'd-r-37', title: 'قراءة فقرة من تفسير القرآن' },
      { id: 'd-r-38', title: 'مشاركة معلومة دينية' },
      { id: 'd-r-39', title: 'ترديد "لا إله إلا الله وحده لا شريك له" 100 مرة' },
      { id: 'd-r-40', title: 'كتابة ملاحظة شكر لله' },
      { id: 'd-r-41', title: 'تذكر فضل اليوم' }
    ]
  },
  weekly: {
    fixed: [
      { id: 'w-f-prayers', title: 'الصلاه في المسجد خمس صلوات لمدة اسبوع' },
      { id: 'w-f-quran', title: 'قراءة القران لمدة اسبوع' },
      { id: 'w-f-adhkar', title: 'اذكار الصباح و المساء لمدة اسبوع' }
    ],
    rotatingPool: [
      { id: 'w-r-1', title: 'صلاة الوتر كل ليلة خلال الأسبوع' },
      { id: 'w-r-2', title: 'قراءة 15 صفحة قرآن في الأسبوع' },
      { id: 'w-r-3', title: 'أذكار الصباح والمساء كاملة كل يوم' },
      { id: 'w-r-4', title: 'صلة رحم: تواصل مع 3 أقارب خلال الأسبوع' },
      { id: 'w-r-5', title: 'صدقة بسيطة + الدعاء لكل محتاج تعرفه' },
      { id: 'w-r-6', title: 'تعلم حديث قصير وحفظه عن ظهر قلب' },
      { id: 'w-r-7', title: '20 دقيقة تدبر وتأمل في القرآن أو الحديث' },
      { id: 'w-r-8', title: 'شكر الله على كل نعمة في نهاية كل يوم' },
      { id: 'w-r-9', title: 'الدعاء لنفسك وللآخرين في أوقات محددة خلال الأسبوع' },
      { id: 'w-r-10', title: 'صيام تطوع' },
      { id: 'w-r-11', title: 'حفظ آية أطول من القرآن أو تفسيرها' },
      { id: 'w-r-12', title: 'قراءة سيرة نبي أو صحابي يوميًا' },
      { id: 'w-r-13', title: 'الاستماع لمحاضرة أو درس قصير' },
      { id: 'w-r-14', title: 'الدعاء للوالدين كل يوم' },
      { id: 'w-r-15', title: 'تصفح موضوع علمي مفيد مرة على الأقل' },
      { id: 'w-r-16', title: 'قراءة فقرة من تفسير القرآن مع التأمل' },
      { id: 'w-r-17', title: 'مشاركة معلومة دينية مع شخص' },
      { id: 'w-r-18', title: 'كتابة ملاحظة شكر لله عن كل يوم' }
    ]
  }
};

function getChallenges() {
  return safeGet('challenges:data', DEFAULT_CHALLENGES);
}
function saveChallenges(data) {
  safeSet('challenges:data', data);
}

function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

// مفاتيح الاختيار اليومي/الأسبوعي والتاريخ
function selectedDailyKey(dateStr) { return `daily:selected:${dateStr}`; }
function dailyHistoryKey(wKey) { return `daily:history:${wKey}`; }
function selectedWeeklyKey(wKey) { return `weekly:selected:${wKey}`; }
function weeklyHistoryKey(mKey) { return `weekly:history:${mKey}`; }
function doneDailyKey(dateStr) { return `daily:done:${dateStr}`; }
function doneWeeklyKey(wKey) { return `weekly:done:${wKey}`; }

// اختيار عناصر متغيرة بدون تكرار ضمن نافذة زمنية
function isMondayOrThursday(date = new Date()) {
  // getDay(): 0=الأحد, 1=الاثنين, 2=الثلاثاء, 3=الأربعاء, 4=الخميس, 5=الجمعة, 6=السبت
  const d = date.getDay();
  return d === 1 || d === 4;
}
function isMonday(date = new Date()) { return date.getDay() === 1; }
function isThursday(date = new Date()) { return date.getDay() === 4; }

// اختيار عناصر متغيرة بدون تكرار ضمن نافذة زمنية مع إمكانية فلترة شرطية
function pickRotating(pool, count, historySet, filterFn = null) {
  let base = pool;
  if (typeof filterFn === 'function') base = base.filter(filterFn);
  const available = base.filter(it => !historySet.has(it.id));
  let source = available.length >= count ? available : base; // إن لم يكفِ، نسمح بإعادة التدوير من المصفوفة المُفلترة
  // خلط بسيط
  source = [...source].sort(() => Math.random() - 0.5);
  return source.slice(0, count);
}

// تهيئة تحديات اليوم/الأسبوع المختارة
function ensureSelections() {
  const data = getChallenges();
  const today = todayKey();
  const wKey = weekKey();
  const mKey = monthKey();

  // اليومية المتغيرة لليوم
  if (!safeGet(selectedDailyKey(today))) {
    const histArr = safeGet(dailyHistoryKey(wKey), []);
    const histSet = new Set(histArr);
    // فلترة بحسب الشرط: صيام التطوع يظهر فقط الاثنين/الخميس
    const picks = pickRotating(
      data.daily.rotatingPool,
      3,
      histSet,
      (item) => {
        if (item.condition === 'monThuOnly') return isMondayOrThursday();
        if (item.condition === 'mondayOnly') return isMonday();
        if (item.condition === 'thursdayOnly') return isThursday();
        return true;
      }
    );
    safeSet(selectedDailyKey(today), picks.map(p => p.id));
    // تحديث السجل الأسبوعي
    const newHist = new Set(histArr);
    picks.forEach(p => newHist.add(p.id));
    safeSet(dailyHistoryKey(wKey), Array.from(newHist));
  }

  // الأسبوعية المتغيرة للأسبوع: اختيار متسلسل مع الرجوع للبداية
  if (!safeGet(selectedWeeklyKey(wKey))) {
    const pool = data.weekly.rotatingPool || [];
    const n = pool.length;
    if (n > 0) {
      let cursor = safeGet('weekly:seqCursor', 0);
      const picks = [
        pool[cursor % n],
        pool[(cursor + 1) % n],
        pool[(cursor + 2) % n]
      ];
      safeSet(selectedWeeklyKey(wKey), picks.map(p => p.id));
      cursor = (cursor + 3) % n;
      safeSet('weekly:seqCursor', cursor);
    } else {
      safeSet(selectedWeeklyKey(wKey), []);
    }
  }
}

// إكمال/إلغاء إكمال
function toggleDone(id, scope) {
  // منع تبديل التحديات الثابتة (يتم حسابها تلقائيًا من تبويب عباداتي)
  if (id.startsWith('d-f-') || id.startsWith('w-f-')) {
    return;
  }
  if (scope === 'daily') {
    const key = doneDailyKey(todayKey());
    const set = new Set(safeGet(key, []));
    set.has(id) ? set.delete(id) : set.add(id);
    safeSet(key, Array.from(set));
  } else {
    const wk = weekKey();
    const key = doneWeeklyKey(wk);
    const set = new Set(safeGet(key, []));
    set.has(id) ? set.delete(id) : set.add(id);
    safeSet(key, Array.from(set));
  }
  renderChallenges();
}

// حساب إحصائيات الأسبوع الحالي
function getWeekDates(base = new Date()) {
  // أسبوع يبدأ بالسبت وينتهي بالجمعة
  const d = new Date(base);
  const day = d.getDay(); // 0=الأحد ... 6=السبت
  const offsetToSaturday = (day + 1) % 7;
  const start = new Date(d);
  start.setHours(0,0,0,0);
  start.setDate(d.getDate() - offsetToSaturday);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    const mm = String(x.getMonth() + 1).padStart(2, '0');
    const dd = String(x.getDate()).padStart(2, '0');
    days.push(`${x.getFullYear()}-${mm}-${dd}`);
  }
  return days;
}

// عدد الأيام المتبقية حتى نهاية الأسبوع (الجمعة)
function daysLeftInWeek(base = new Date()) {
  const d = new Date(base);
  const day = d.getDay(); // 0=الأحد ... 6=السبت
  const indexFromSaturday = (day + 1) % 7; // السبت=0 ... الجمعة=6
  return 6 - indexFromSaturday; // الجمعة يعطي 0
}

function computeWeeklyStats() {
  const days = getWeekDates();
  let total = 0;
  // اليوميات: العدّ اليدوي (المتغيرة) + العدّ التلقائي (الثابتة)
  days.forEach(ds => {
    // المتغيرة (المخزنة يدويًا)
    const manualDaily = (safeGet(doneDailyKey(ds), []) || []).filter(id => !id.startsWith('d-f-'));
    total += manualDaily.length;
    // الثابتة (تُحسب تلقائيًا من عباداتي)
    let fixedCount = 0;
    // الصلاة الخمس
    const completed = new Set(safeGet(`completedPrayers:${ds}`, []));
    const all = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
    if (all.every(k => completed.has(k))) fixedCount++;
    // القرآن
    if (safeGet(`quranRead:${ds}`, false)) fixedCount++;
    // الأذكار (نستخدم قيمة مخزنة لذلك اليوم إن وُجدت وإلا 0)
    const dCnt = safeGet(`dhikrCount:${ds}`, 0);
    if ((typeof dCnt === 'number' ? dCnt : 0) >= 2) fixedCount++;
    total += fixedCount;
  });
  // الأسبوعيات: المتغيرة (مخزنة) + الثابتة (تلقائية)
  const wk = weekKey();
  const wkArr = (safeGet(doneWeeklyKey(wk), []) || []).filter(id => !id.startsWith('w-f-'));
  total += wkArr.length;
  // الأسبوعيات الثابتة (3 عناصر): احسب تحقق كل واحد منها لهذا الأسبوع
  let weeklyFixedAchieved = 0;
  // 1) الصلوات خمس يوميًا طوال الأسبوع
  const prayersAllWeek = days.every(ds => {
    const completed = new Set(safeGet(`completedPrayers:${ds}`, []));
    const all = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
    return all.every(k => completed.has(k));
  });
  if (prayersAllWeek) weeklyFixedAchieved++;
  // 2) القرآن يوميًا طوال الأسبوع
  const quranAllWeek = days.every(ds => !!safeGet(`quranRead:${ds}`, false));
  if (quranAllWeek) weeklyFixedAchieved++;
  // 3) أذكار الصباح والمساء يوميًا طوال الأسبوع
  const dhikrAllWeek = days.every(ds => {
    const dCnt = safeGet(`dhikrCount:${ds}`, 0);
    return (typeof dCnt === 'number' ? dCnt : 0) >= 2;
  });
  if (dhikrAllWeek) weeklyFixedAchieved++;
  total += weeklyFixedAchieved;

  let maxWeek = safeGet('challenges:maxWeekly', 0);
  if (total > maxWeek) {
    maxWeek = total;
    safeSet('challenges:maxWeekly', maxWeek);
  }
  return { totalThisWeek: total, maxWeek };
}

// بناء عنصر تحدي
function createChallengeItem(ch, scope, isDone) {
  const li = document.createElement('li');
  li.className = 'challenge-item';
  const btn = document.createElement('button');
  btn.className = 'challenge-check' + (isDone ? ' done' : '');
  // لا نستخدم إيموجي للعرض؛ نعتمد على CSS لإظهار العلامة
  btn.textContent = '';
  btn.addEventListener('click', () => toggleDone(ch.id, scope));
  const span = document.createElement('span');
  span.className = 'challenge-title';
  span.textContent = ch.title;
  li.appendChild(btn);
  li.appendChild(span);
  return li;
}

// عرض التحديات والإحصائيات
function renderChallenges() {
  ensureSelections();
  const data = getChallenges();
  const today = todayKey();
  const wk = weekKey();
  const selectedDaily = safeGet(selectedDailyKey(today), []);
  const selectedWeekly = safeGet(selectedWeeklyKey(wk), []);
  // نظّف أي معرّفات ثابتة قد تم تخزينها بالخطأ
  const rawDaily = safeGet(doneDailyKey(today), []);
  const cleanDaily = (rawDaily || []).filter(id => !id.startsWith('d-f-'));
  if (rawDaily && rawDaily.length !== cleanDaily.length) safeSet(doneDailyKey(today), cleanDaily);
  const doneDaily = new Set(cleanDaily);
  const rawWeekly = safeGet(doneWeeklyKey(wk), []);
  const cleanWeekly = (rawWeekly || []).filter(id => !id.startsWith('w-f-'));
  if (rawWeekly && rawWeekly.length !== cleanWeekly.length) safeSet(doneWeeklyKey(wk), cleanWeekly);
  const doneWeekly = new Set(cleanWeekly);

  // قوائم
  const dailyFixedUl = document.getElementById('daily-fixed-list');
  const dailyRotUl = document.getElementById('daily-rotating-list');
  const weeklyFixedUl = document.getElementById('weekly-fixed-list');
  const weeklyRotUl = document.getElementById('weekly-rotating-list');
  if (!(dailyFixedUl && dailyRotUl && weeklyFixedUl && weeklyRotUl)) return; // لا شيء لعرضه

  // تفريغ
  [dailyFixedUl, dailyRotUl, weeklyFixedUl, weeklyRotUl].forEach(ul => ul.innerHTML = '');

  // اليومية الثابتة: احسب الإنجاز تلقائيًا من تبويب عباداتي (عناصر قراءة فقط)
  data.daily.fixed.forEach(ch => {
    let autoDone = false;
    if (ch.id === 'd-f-prayers') {
      const completed = new Set(safeGet(`completedPrayers:${today}`, []));
      const all = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
      autoDone = all.every(k => completed.has(k));
    } else if (ch.id === 'd-f-quran') {
      autoDone = !!safeGet(`quranRead:${today}`, false);
    } else if (ch.id === 'd-f-adhkar') {
      const cnt = safeGet(`dhikrCount:${today}`, getDhikrCountForActiveDay());
      autoDone = (typeof cnt === 'number' ? cnt : 0) >= 2;
    } else {
      autoDone = doneDaily.has(ch.id);
    }
    const li = createChallengeItem(ch, 'daily', autoDone);
    const btn = li.querySelector('.challenge-check');
    if (btn && ch.id.startsWith('d-f-')) { btn.disabled = true; btn.title = 'يُحدَّد تلقائيًا من عباداتي'; }
    dailyFixedUl.appendChild(li);
  });
  // اليومية المتغيرة المختارة لهذا اليوم
  const rotDaily = data.daily.rotatingPool.filter(ch => selectedDaily.includes(ch.id)).slice(0, 3);
  rotDaily.forEach(ch => {
    dailyRotUl.appendChild(createChallengeItem(ch, 'daily', doneDaily.has(ch.id)));
  });

  // الأسبوعية الثابتة: احسب الإنجاز من تجميع أيام الأسبوع الحالي (عناصر قراءة فقط)
  data.weekly.fixed.forEach(ch => {
    let autoDone = false;
    const days = getWeekDates();
    if (ch.id === 'w-f-prayers') {
      autoDone = days.every(ds => {
        const completed = new Set(safeGet(`completedPrayers:${ds}`, []));
        const all = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
        return all.every(k => completed.has(k));
      });
    } else if (ch.id === 'w-f-quran') {
      autoDone = days.every(ds => !!safeGet(`quranRead:${ds}`, false));
    } else if (ch.id === 'w-f-adhkar') {
      autoDone = days.every(ds => {
        const cnt = safeGet(`dhikrCount:${ds}`, 0);
        return (typeof cnt === 'number' ? cnt : 0) >= 2;
      });
    } else {
      autoDone = doneWeekly.has(ch.id);
    }
    const li = createChallengeItem(ch, 'weekly', autoDone);
    const btn = li.querySelector('.challenge-check');
    if (btn && ch.id.startsWith('w-f-')) { btn.disabled = true; btn.title = 'يُحدَّد تلقائيًا من عباداتي'; }
    weeklyFixedUl.appendChild(li);
  });
  // الأسبوعية المتغيرة المختارة للأسبوع
  const rotWeekly = data.weekly.rotatingPool.filter(ch => selectedWeekly.includes(ch.id)).slice(0, 3);
  rotWeekly.forEach(ch => {
    weeklyRotUl.appendChild(createChallengeItem(ch, 'weekly', doneWeekly.has(ch.id)));
  });

  // إحصائيات الرأس
  const { totalThisWeek, maxWeek } = computeWeeklyStats();
  const statWeek = document.getElementById('stat-week-completed');
  const statMax = document.getElementById('stat-max-week');
  const statLeft = document.getElementById('stat-today-left');
  if (statWeek) statWeek.textContent = String(totalThisWeek);
  if (statMax) statMax.textContent = String(maxWeek);
  if (statLeft) statLeft.textContent = String(daysLeftInWeek());
}

// نافذة الإضافة
function openChallengeModal(presetScope = null) {
  const modal = document.getElementById('challenge-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  const scopeSel = document.getElementById('challenge-scope');
  if (presetScope && scopeSel) scopeSel.value = presetScope;
}

function closeChallengeModal() {
  const modal = document.getElementById('challenge-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  const title = document.getElementById('challenge-title');
  if (title) title.value = '';
}

function saveChallengeFromModal() {
  const scope = document.getElementById('challenge-scope').value; // daily | weekly
  const mode = document.getElementById('challenge-mode').value;   // fixed | rotating
  const title = (document.getElementById('challenge-title').value || '').trim();
  if (!title) { alert('يرجى إدخال اسم التحدي'); return; }
  const data = getChallenges();
  const newItem = { id: uid(), title };
  if (scope === 'daily') {
    if (mode === 'fixed') data.daily.fixed.unshift(newItem);
    else data.daily.rotatingPool.unshift(newItem);
  } else {
    if (mode === 'fixed') data.weekly.fixed.unshift(newItem);
    else data.weekly.rotatingPool.unshift(newItem);
  }
  saveChallenges(data);
  closeChallengeModal();
  renderChallenges();
}

// ربط أحداث واجهة التحديات عند تحميل DOM
document.addEventListener('DOMContentLoaded', () => {
  const btnDaily = document.getElementById('btn-add-daily');
  const btnWeekly = document.getElementById('btn-add-weekly');
  const modalClose = document.getElementById('modal-close');
  const modalSave = document.getElementById('modal-save');
  const backdrop = document.querySelector('#challenge-modal .modal-backdrop');
  if (btnDaily) btnDaily.addEventListener('click', () => openChallengeModal('daily'));
  if (btnWeekly) btnWeekly.addEventListener('click', () => openChallengeModal('weekly'));
  if (modalClose) modalClose.addEventListener('click', closeChallengeModal);
  if (backdrop) backdrop.addEventListener('click', closeChallengeModal);
  if (modalSave) modalSave.addEventListener('click', saveChallengeFromModal);

  // اعرض التحديات عند فتح تبويب التحديات
  const tabCommunity = document.getElementById('tab-community');
  if (tabCommunity) tabCommunity.addEventListener('click', () => setTimeout(renderChallenges, 50));
  // واعرضها مباشرة أيضًا
  setTimeout(renderChallenges, 0);
  
  // أذكار: ربط أزرار النافذة
  const azkarBtn = document.getElementById('btn-azkar-open');
  const azkarClose = document.getElementById('azkar-modal-close');
  const azkarBackdrop = document.querySelector('#azkar-modal .modal-backdrop');
  const azkarNextBtn = document.getElementById('azkar-next');
  const azkarPrevBtn = document.getElementById('azkar-prev');
  const azkarFinishBtn = document.getElementById('azkar-finish');
  if (azkarBtn) azkarBtn.addEventListener('click', openAzkarModal);
  if (azkarClose) azkarClose.addEventListener('click', closeAzkarModal);
  if (azkarBackdrop) azkarBackdrop.addEventListener('click', closeAzkarModal);
  if (azkarNextBtn) azkarNextBtn.addEventListener('click', azkarNext);
  if (azkarPrevBtn) azkarPrevBtn.addEventListener('click', azkarPrev);
  if (azkarFinishBtn) azkarFinishBtn.addEventListener('click', azkarFinish);
  setAzkarButtonLabel();
});

// مواقيت الصلاة مع زر المسجد الجديد
async function fetchPrayerTimes() {
  try {
    const res = await fetch("https://api.aladhan.com/v1/timingsByCity?city=Jeddah&country=SA&method=4");
    const data = await res.json();
    const times = data.data.timings;
    const list = document.getElementById("prayer-times");
    list.innerHTML = "";
    const names = {
      Fajr: "الفجر",
      Dhuhr: "الظهر",
      Asr: "العصر",
      Maghrib: "المغرب",
      Isha: "العشاء"
    };
    const now = new Date();
    const completedKey = `completedPrayers:${todayKey()}`;
    const completed = new Set(safeGet(completedKey, []));
    
    for (let key in names) {
      let [hour, minute] = times[key].split(":");
      let prayerTime = new Date();
      prayerTime.setHours(parseInt(hour));
      prayerTime.setMinutes(parseInt(minute));
      prayerTime.setSeconds(0);
      let formatted = prayerTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });

      // حفظ المواقيت المهمة لنظام الأذكار
      if (key === 'Fajr') PRAYER_TIMES.Fajr = new Date(prayerTime);
      if (key === 'Dhuhr') PRAYER_TIMES.Dhuhr = new Date(prayerTime);
      if (key === 'Asr') PRAYER_TIMES.Asr = new Date(prayerTime);

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.alignItems = "center";
      li.style.gap = "0.5rem";
      
      const span = document.createElement("span");
      span.textContent = `${names[key]} - ${formatted}`;
      
      const btn = document.createElement("button");
      btn.className = "prayer-btn";
      btn.innerHTML = "🕌";
      btn.dataset.prayerKey = key;
      
      if (now < prayerTime) {
        btn.disabled = true;
      }

      // تطبيق الحالة المكتملة من التخزين
      if (completed.has(key)) {
        btn.classList.add("done");
        btn.innerHTML = "✅";
        btn.disabled = true;
      }

      btn.addEventListener("click", () => {
        btn.classList.add("done");
        btn.innerHTML = "✅";
        btn.disabled = true;
        // حفظ في التخزين لليوم الحالي
        completed.add(key);
        safeSet(completedKey, Array.from(completed));
        // تحديث النقاط فوراً
        updateLeaderboard();
        // تحديث تحدياتي لتنعكس حالة الصلاة
        try { renderChallenges(); } catch (_) {}
      });

      // إضافة زر المسجد
      const mosqueBtn = document.createElement("button");
      mosqueBtn.className = "mosque-btn";
      mosqueBtn.innerHTML = "📚";
      mosqueBtn.title = "أذكار المسجد";
      mosqueBtn.dataset.prayerKey = key;
      mosqueBtn.dataset.prayerName = names[key];
      
      // التحقق من حالة الإنجاز المحفوظة
      const completedMosqueKey = `completedMosqueAzkar:${todayKey()}`;
      const completedMosque = new Set(safeGet(completedMosqueKey, []));
      if (completedMosque.has(key)) {
        mosqueBtn.classList.add("done");
        mosqueBtn.innerHTML = "✅";
        // لا نعطل الزر ليتمكن من إعادة فتح النافذة
      }
      
      mosqueBtn.addEventListener("click", () => {
        openMosqueModal(key, names[key]);
      });
      
      li.appendChild(span);
      li.appendChild(btn);
      li.appendChild(mosqueBtn);
      list.appendChild(li);
    }
    // تقدير فجر الغد لحدود فترة المساء
    if (PRAYER_TIMES.Fajr) {
      const nf = new Date(PRAYER_TIMES.Fajr);
      nf.setDate(nf.getDate() + 1);
      PRAYER_TIMES.nextFajr = nf;
    }
    setAzkarButtonLabel();
    // جدولة إعادة ضبط الواجهة عند فجر الغد
    scheduleFajrReset();
  } catch (e) {
    console.error(e);
  }
}
fetchPrayerTimes();

// القرآن
let quranProgress = 0;
let quranCount = 0; // عدد مرات إنجاز الورد
function updateQuranProgress() {
  const choice = document.getElementById("quran-choice").value;
  const completedFlag = !!safeGet('quranCompleted', false);

  // إذا كان مكتملًا مسبقًا، ابدأ دورة جديدة من الصفر أولًا
  if (completedFlag) {
    quranProgress = 0;
    safeSet('quranProgress', quranProgress);
    safeSet('quranCompleted', false);
  }

  const step = choice === "rubu" ? (2.5 / 604) * 100 : choice === "hizb" ? (10 / 604) * 100 : (20 / 604) * 100;
  quranProgress += step;
  if (quranProgress > 100) quranProgress = 100;
  document.getElementById("quran-progress").style.width = quranProgress + "%";

  // حفظ التقدم والاختيار أولًا
  safeSet('quranProgress', quranProgress);
  safeSet('quranChoice', choice);
  // اعتبر أي تقدم في القرآن قراءة لليوم
  safeSet(`quranRead:${todayKey()}`, true);

  // في حال الاكتمال: ثبّت 100% واحسب إنجازًا واحدًا وخزّن راية الاكتمال
  if (quranProgress >= 100) {
    quranProgress = 100;
    safeSet('quranProgress', quranProgress);
    // احسب الإنجاز مرة واحدة فقط لكل يوم (باعتبار اليوم يبدأ من الفجر)
    const qFlagKey = `quranDone:${fajrDayKey()}`;
    if (!safeGet(qFlagKey, false)) {
      safeSet(qFlagKey, true);
      let cnt = safeGet('quranCount', quranCount);
      cnt = (typeof cnt === 'number' ? cnt : 0) + 1;
      quranCount = cnt;
      safeSet('quranCount', quranCount);
    }
    safeSet('quranCompleted', true);
    safeSet('quranCompletedAt', todayKey());
  }

  // تحديث النقاط فوراً
  updateLeaderboard();
  // تحدياتي
  try { renderChallenges(); } catch (_) {}
}

// جدولة إعادة ضبط واجهة الأذكار عند حلول فجر اليوم التالي
function scheduleFajrReset() {
  try { if (fajrResetTimer) clearTimeout(fajrResetTimer); } catch (_) {}
  const { nextFajr } = PRAYER_TIMES;
  if (!(nextFajr instanceof Date)) return;
  const now = new Date();
  const delay = nextFajr - now;
  if (delay <= 0) return;
  fajrResetTimer = setTimeout(() => {
    // عند الفجر: أعِد حساب العداد من الرايات لليوم الجديد، وحدّث الواجهة
    dhikrCount = getDhikrCountForActiveDay();
    const bar = document.getElementById('dhikr-progress');
    const percent = Math.min(100, (dhikrCount / 2) * 100);
    if (bar) bar.style.width = percent + '%';
    setAzkarButtonLabel();
    updateLeaderboard();
    // جلب مواقيت اليوم الجديد وإعادة الجدولة
    fetchPrayerTimes();
  }, delay);
}

// الأذكار
let dhikrCount = 0;
function doneDhikr() {
  dhikrCount++;
  // تخزين يومي للأذكار
  const dhikrKey = `dhikrCount:${fajrDayKey()}`;
  safeSet(dhikrKey, dhikrCount);
  
  // تحديث الشريط المشترك
  updateCombinedProgress();
  
  // تحديث النقاط فوراً
  updateLeaderboard();
}

// الامتنان - النسخة المحسنة مع قائمة الامتنانات
function saveGratitude() {
  const text = document.getElementById("gratitude-text").value.trim();
  
  if (text) {
    // حفظ في القائمة الجديدة
    saveGratitudeToList(text);
    
    // الحفظ في النظام القديم (للتوافق)
    safeSet('gratitudeText', text);
    
    // مسح النص من الحقل
    document.getElementById("gratitude-text").value = '';
    
    // إظهار تأثير "تم الحفظ"
    showSaveSuccess();
    
    // تحديث النقاط فوراً
    updateLeaderboard();
  }
}

// دالة إظهار تأثير نجاح الحفظ
function showSaveSuccess() {
  const saveBtn = document.querySelector('#gratitude .btn-purple');
  if (saveBtn) {
    const originalText = saveBtn.textContent;
    
    // إضافة كلاس النجاح
    saveBtn.classList.add('success');
    saveBtn.textContent = 'تم الحفظ ✓';
    
    // إزالة كلاس النجاح وإعادة النص الأصلي بعد ثانيتين
    setTimeout(() => {
      saveBtn.classList.remove('success');
      saveBtn.textContent = originalText;
    }, 2000);
  }
}

// تحديث النقاط عند كتابة الامتنان
document.addEventListener('DOMContentLoaded', function() {
  const gratitudeText = document.getElementById('gratitude-text');
  if (gratitudeText) {
    gratitudeText.addEventListener('input', function() {
      // تحديث النقاط عند الكتابة
      setTimeout(updateLeaderboard, 100);
      safeSet('gratitudeText', gratitudeText.value);
    });
  }
});

// تحديث إحصائيات المجتمع
function updateCommunityStats() {
  const totalMembers = Math.floor(Math.random() * 500) + 1000;
  const dailyQuran = Math.floor(Math.random() * 200) + 400;
  const groupPrayers = Math.floor(Math.random() * 50) + 50;

  // قيّد التحديث داخل قسم المجتمع القديم فقط لتجنّب الكتابة فوق إحصائيات "تحدياتي"
  const container = document.getElementById('community-overview');
  if (!container) return; // لا يوجد قسم مجتمع قديم؛ لا تُحدّث شيئًا

  const stats = container.querySelectorAll('.stat-number');
  if (!stats || stats.length < 3) return;

  stats[0].textContent = totalMembers.toLocaleString();
  stats[1].textContent = dailyQuran.toLocaleString();
  stats[2].textContent = groupPrayers.toLocaleString();
}

// تحديث الإحصائيات كل 30 ثانية
setInterval(updateCommunityStats, 30000);
updateCommunityStats();

// تحديث النقاط والترتيب
function updateLeaderboard() {
  const myRankItem = document.querySelector('.my-rank-item');
  
  if (myRankItem) {
    // تحديث نقاط المستخدم الحالي بناءً على نشاطاته
    const userPoints = calculateUserPoints();
    const userLevel = Math.floor(userPoints / 5) + 1; // مستوى جديد كل 5 نقاط
    
    // تحديث النقاط والمستوى
    const pointsElement = myRankItem.querySelector('.user-points');
    const levelElement = myRankItem.querySelector('.user-level');
    
    if (pointsElement) {
      pointsElement.textContent = `${userPoints} نقطة`;
    }
    
    if (levelElement) {
      levelElement.textContent = `مستوى ${userLevel}`;
    }
    
    // حساب الترتيب الحقيقي بناءً على النقاط
    const userRank = calculateUserRank(userPoints);
    const rankElement = myRankItem.querySelector('.rank');
    if (rankElement) {
      rankElement.textContent = userRank;
    }
    
    // تحديث الترتيب في الواجهة بناءً على النقاط الحقيقية
    updateLeaderboardDisplay(userPoints);
    
    console.log(`تم تحديث النقاط: ${userPoints} نقطة، المستوى: ${userLevel}، الترتيب: ${userRank}`);
  }
}

// تحديث عرض الترتيب في الواجهة
function updateLeaderboardDisplay(userPoints) {
  // إنشاء قائمة بجميع المستخدمين مع المستخدم الحالي
  const allUsers = [...simulatedUsers, { name: "أنت", points: userPoints, level: Math.floor(userPoints / 5) + 1 }];
  
  // ترتيب المستخدمين حسب النقاط
  allUsers.sort((a, b) => b.points - a.points);
  
  // البحث عن موقع المستخدم في الترتيب
  const userIndex = allUsers.findIndex(user => user.name === "أنت");
  const userRank = userIndex + 1;
  
  // تحديث الترتيب في الواجهة
  const leaderboardItems = document.querySelectorAll('.leaderboard-item');
  
  leaderboardItems.forEach((item, index) => {
    if (index < 5 && allUsers[index]) {
      const user = allUsers[index];
      const rankElement = item.querySelector('.rank');
      const nameElement = item.querySelector('.user-name');
      const levelElement = item.querySelector('.user-level');
      const pointsElement = item.querySelector('.user-points');
      
      if (rankElement) {
        rankElement.textContent = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1);
      }
      
      if (nameElement) {
        nameElement.textContent = user.name;
      }
      
      if (levelElement) {
        levelElement.textContent = `مستوى ${user.level}`;
      }
      
      if (pointsElement) {
        pointsElement.textContent = `${user.points} نقطة`;
      }
      
      // إضافة الفئات للترتيب
      item.className = 'leaderboard-item';
      if (index === 0) item.classList.add('top-1');
      else if (index === 1) item.classList.add('top-2');
      else if (index === 2) item.classList.add('top-3');
    }
  });
  
  // تحديث ترتيب المستخدم في قسم "ترتيبك الحالي"
  const myRankItem = document.querySelector('.my-rank-item');
  if (myRankItem) {
    const rankElement = myRankItem.querySelector('.rank');
    if (rankElement) {
      rankElement.textContent = userRank;
    }
  }
  
  console.log(`الترتيب الجديد: المستخدم في المركز ${userRank} من ${allUsers.length}`);
}

// محاكاة مستخدمين آخرين في الترتيب
const simulatedUsers = [
  { name: "أحمد محمد", points: 8, level: 2 },
  { name: "خالد علي", points: 7, level: 2 },
  { name: "محمد حسن", points: 6, level: 2 },
  { name: "علي أحمد", points: 5, level: 1 },
  { name: "علي محمود", points: 4, level: 1 },
  { name: "فاطمة علي", points: 3, level: 1 },
  { name: "عائشة أحمد", points: 2, level: 1 },
  { name: "مريم حسن", points: 1, level: 1 }
];

// تحديث نقاط المستخدمين المحاكيين (لإضافة واقعية)
function updateSimulatedUsers() {
  simulatedUsers.forEach(user => {
    // إضافة نقاط عشوائية للمستخدمين المحاكيين (محاكاة النشاط)
    if (Math.random() < 0.3) { // 30% احتمال إضافة نقطة
      user.points += Math.floor(Math.random() * 2); // 0 أو 1 نقطة
      user.level = Math.floor(user.points / 5) + 1;
    }
  });
}

// تحديث المستخدمين المحاكيين كل 5 دقائق
setInterval(updateSimulatedUsers, 300000);

// حساب الترتيب الحقيقي بناءً على النقاط
function calculateUserRank(userPoints) {
  // إنشاء قائمة بجميع النقاط (المستخدمين المحاكيين + المستخدم الحالي)
  const allPoints = [...simulatedUsers.map(user => user.points), userPoints];
  
  // ترتيب القائمة تنازلياً
  allPoints.sort((a, b) => b - a);
  
  // البحث عن موقع المستخدم في الترتيب
  const userRank = allPoints.indexOf(userPoints) + 1;
  
  // حساب الترتيب النهائي (معالجة النقاط المتساوية)
  let finalRank = userRank;
  let samePointsCount = 0;
  
  for (let i = 0; i < allPoints.indexOf(userPoints); i++) {
    if (allPoints[i] === userPoints) {
      samePointsCount++;
    }
  }
  
  finalRank -= samePointsCount;
  
  return finalRank;
}

// حساب نقاط المستخدم بناءً على نشاطاته
function calculateUserPoints() {
  let points = 0;
  
  // نقاط القرآن - نقطة واحدة لكل ورد مكتمل
  points += quranCount;
  
  // نقاط الأذكار - نقطة واحدة عند إكمال ذكرين
  if (dhikrCount >= 2) {
    points += 1;
  }
  
  // نقاط الصلوات - نقطة واحدة لكل صلاة مكتملة
  const completedPrayers = document.querySelectorAll('.prayer-btn.done').length;
  points += completedPrayers;
  
  // نقاط أذكار المسجد - نقطة واحدة لكل أذكار مسجد مكتملة
  const completedMosqueKey = `completedMosqueAzkar:${todayKey()}`;
  const completedMosque = safeGet(completedMosqueKey, []);
  points += completedMosque.length;
  
  // نقاط الامتنان - نقطة واحدة عند كتابة الامتنان
  const gratitudeText = document.getElementById('gratitude-text');
  if (gratitudeText && gratitudeText.value.trim()) {
    points += 1;
  }
  
  console.log(`النقاط المحسوبة: القرآن=${quranCount}, الأذكار=${dhikrCount >= 2 ? 1 : 0}, الصلوات=${completedPrayers}, أذكار المسجد=${completedMosque.length}, الامتنان=${gratitudeText && gratitudeText.value.trim() ? 1 : 0}`);
  
  return Math.max(points, 1); // الحد الأدنى نقطة واحدة
}

// تحديث شريط التقدم المشترك (أذكار الصباح/المساء + أذكار المسجد)
function updateCombinedProgress() {
  // عدد أذكار الصباح والمساء المكتملة (0-2)
  const dhikrCount = getDhikrCountForActiveDay();
  
  // عدد أذكار المسجد المكتملة (0-5)
  const completedMosqueKey = `completedMosqueAzkar:${todayKey()}`;
  const completedMosque = safeGet(completedMosqueKey, []);
  const mosqueCount = completedMosque.length;
  
  // إجمالي التقدم المشترك (من أصل 7)
  // - أذكار الصباح والمساء: 2 نقطة
  // - أذكار المسجد: 5 نقاط (كل صلاة = نقطة واحدة)
  const totalProgress = dhikrCount + mosqueCount;
  const percent = Math.min(100, (totalProgress / 7) * 100);
  
  // تحديث شريط التقدم المشترك
  const bar = document.getElementById('dhikr-progress');
  if (bar) {
    bar.style.width = percent + '%';
    // لون موحد للشريط المشترك
    bar.className = 'progress-bar-fill combined-fill';
  }
  
  console.log(`التقدم المشترك: ${totalProgress}/7 (${percent.toFixed(1)}%) - أذكار: ${dhikrCount}, مسجد: ${mosqueCount}`);
}

// تحديث الترتيب كل دقيقة
setInterval(updateLeaderboard, 60000);

// استرجاع الحالة (قرآن/أذكار/امتنان)
function restoreState() {
  // استرجاع القرآن
  const savedQuranProgress = safeGet('quranProgress', 0);
  const savedQuranCount = safeGet('quranCount', 0);
  const savedQuranChoice = safeGet('quranChoice', null);
  if (typeof savedQuranProgress === 'number') {
    quranProgress = savedQuranProgress;
    const bar = document.getElementById('quran-progress');
    if (bar) bar.style.width = quranProgress + '%';
  }
  if (typeof savedQuranCount === 'number') {
    quranCount = savedQuranCount;
  }
  const sel = document.getElementById('quran-choice');
  if (sel) {
    if (savedQuranChoice) sel.value = savedQuranChoice;
    // حفظ الاختيار فور تغييره ليبقى بعد التحديث
    sel.addEventListener('change', () => safeSet('quranChoice', sel.value));
  }

  // استرجاع الأذكار: احتسب من رايات الفترات لليوم حسب الفجر
  dhikrCount = getDhikrCountForActiveDay();

  // استرجاع الامتنان
  const savedGratitude = safeGet('gratitudeText', '');
  const gInput = document.getElementById('gratitude-text');
  if (gInput && typeof savedGratitude === 'string') {
    gInput.value = savedGratitude;
  }

  // تحديث الشريط المشترك
  updateCombinedProgress();

  updateLeaderboard();
}

// نفّذ الاسترجاع مباشرة إن كانت الصفحة جاهزة، وإلا انتظر DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', restoreState);
} else {
  restoreState();
}

// =================== أذكار المسجد ===================
const MOSQUE_AZKAR = {
  Fajr: [
    { text: 'أستغفر الله، أستغفر الله، أستغفر الله', repeat: 3 },
    { text: 'اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام', repeat: 1 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. لا حول ولا قوة إلا بالله، لا إله إلا الله، ولا نعبد إلا إياه، له النعمة وله الفضل وله الثناء الحسن، لا إله إلا الله مخلصين له الدين ولو كره الكافرون.', repeat: 1 },
    { text: 'اللهم لا مانع لما أعطيت، ولا معطي لما منعت، ولا ينفع ذا الجد منك الجد.', repeat: 1 },
    { text: 'سبحان الله', repeat: 33 },
    { text: 'الحمد لله', repeat: 33 },
    { text: 'الله أكبر', repeat: 33 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير', repeat: 1 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد يحيي ويميت وهو على كل شيء قدير.', repeat: 10 },
    { text: 'اللّهُ لا إِلَهَ إِلاّ هُوَ الْحَيّ الْقَيّومُ لا تَأْخُذُهُ سِنَةٌ وَلا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلاّ بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاّ بِمَا شَاء وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ', repeat: 1 },
    { text: 'سورة الإخلاص', repeat: 3 },
    { text: 'سورة الفلق', repeat: 3 },
    { text: 'سورة الناس', repeat: 3 }
  ],
  Dhuhr: [
    { text: 'أستغفر الله، أستغفر الله، أستغفر الله', repeat: 3 },
    { text: 'اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام', repeat: 1 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. لا حول ولا قوة إلا بالله، لا إله إلا الله، ولا نعبد إلا إياه، له النعمة وله الفضل وله الثناء الحسن، لا إله إلا الله مخلصين له الدين ولو كره الكافرون.', repeat: 1 },
    { text: 'اللهم لا مانع لما أعطيت، ولا معطي لما منعت، ولا ينفع ذا الجد منك الجد.', repeat: 1 },
    { text: 'سبحان الله', repeat: 33 },
    { text: 'الحمد لله', repeat: 33 },
    { text: 'الله أكبر', repeat: 33 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير', repeat: 1 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد يحيي ويميت وهو على كل شيء قدير.', repeat: 1 },
    { text: 'اللّهُ لا إِلَهَ إِلاّ هُوَ الْحَيّ الْقَيّومُ لا تَأْخُذُهُ سِنَةٌ وَلا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلاّ بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاّ بِمَا شَاء وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ', repeat: 1 },
    { text: 'سورة الإخلاص', repeat: 1 },
    { text: 'سورة الفلق', repeat: 1 },
    { text: 'سورة الناس', repeat: 1 }
  ],
  Asr: [
    { text: 'أستغفر الله، أستغفر الله، أستغفر الله', repeat: 3 },
    { text: 'اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام', repeat: 1 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. لا حول ولا قوة إلا بالله، لا إله إلا الله، ولا نعبد إلا إياه، له النعمة وله الفضل وله الثناء الحسن، لا إله إلا الله مخلصين له الدين ولو كره الكافرون.', repeat: 1 },
    { text: 'اللهم لا مانع لما أعطيت، ولا معطي لما منعت، ولا ينفع ذا الجد منك الجد.', repeat: 1 },
    { text: 'سبحان الله', repeat: 33 },
    { text: 'الحمد لله', repeat: 33 },
    { text: 'الله أكبر', repeat: 33 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير', repeat: 1 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد يحيي ويميت وهو على كل شيء قدير.', repeat: 1 },
    { text: 'اللّهُ لا إِلَهَ إِلاّ هُوَ الْحَيّ الْقَيّومُ لا تَأْخُذُهُ سِنَةٌ وَلا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلاّ بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاّ بِمَا شَاء وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ', repeat: 1 },
    { text: 'سورة الإخلاص', repeat: 1 },
    { text: 'سورة الفلق', repeat: 1 },
    { text: 'سورة الناس', repeat: 1 }
  ],
  Maghrib: [
    { text: 'أستغفر الله، أستغفر الله، أستغفر الله', repeat: 3 },
    { text: 'اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام', repeat: 1 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. لا حول ولا قوة إلا بالله، لا إله إلا الله، ولا نعبد إلا إياه، له النعمة وله الفضل وله الثناء الحسن، لا إله إلا الله مخلصين له الدين ولو كره الكافرون.', repeat: 1 },
    { text: 'اللهم لا مانع لما أعطيت، ولا معطي لما منعت، ولا ينفع ذا الجد منك الجد.', repeat: 1 },
    { text: 'سبحان الله', repeat: 33 },
    { text: 'الحمد لله', repeat: 33 },
    { text: 'الله أكبر', repeat: 33 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير', repeat: 1 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد يحيي ويميت وهو على كل شيء قدير.', repeat: 10 },
    { text: 'اللّهُ لا إِلَهَ إِلاّ هُوَ الْحَيّ الْقَيّومُ لا تَأْخُذُهُ سِنَةٌ وَلا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلاّ بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاّ بِمَا شَاء وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ', repeat: 1 },
    { text: 'سورة الإخلاص', repeat: 3 },
    { text: 'سورة الفلق', repeat: 3 },
    { text: 'سورة الناس', repeat: 3 }
  ],
  Isha: [
    { text: 'أستغفر الله، أستغفر الله، أستغفر الله', repeat: 3 },
    { text: 'اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام', repeat: 1 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. لا حول ولا قوة إلا بالله، لا إله إلا الله، ولا نعبد إلا إياه، له النعمة وله الفضل وله الثناء الحسن، لا إله إلا الله مخلصين له الدين ولو كره الكافرون.', repeat: 1 },
    { text: 'اللهم لا مانع لما أعطيت، ولا معطي لما منعت، ولا ينفع ذا الجد منك الجد.', repeat: 1 },
    { text: 'سبحان الله', repeat: 33 },
    { text: 'الحمد لله', repeat: 33 },
    { text: 'الله أكبر', repeat: 33 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير', repeat: 1 },
    { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد يحيي ويميت وهو على كل شيء قدير.', repeat: 1 },
    { text: 'اللّهُ لا إِلَهَ إِلاّ هُوَ الْحَيّ الْقَيّومُ لا تَأْخُذُهُ سِنَةٌ وَلا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلاّ بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاّ بِمَا شَاء وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ', repeat: 1 },
    { text: 'سورة الإخلاص', repeat: 1 },
    { text: 'سورة الفلق', repeat: 1 },
    { text: 'سورة الناس', repeat: 1 }
  ]
};

let mosqueAzkarState = { list: [], index: 0, remain: 1, prayerKey: '' };

function openMosqueModal(prayerKey, prayerName) {
  const azkarList = MOSQUE_AZKAR[prayerKey] || [];
  if (azkarList.length === 0) {
    alert('لا توجد أذكار متاحة لهذه الصلاة');
    return;
  }

  mosqueAzkarState = {
    list: azkarList,
    index: 0,
    remain: azkarList[0].repeat,
    prayerKey: prayerKey
  };

  // تحديث عنوان النافذة
  const title = document.getElementById('azkar-modal-title');
  title.textContent = `أذكار المسجد - ${prayerName}`;

  // عرض الذكر الأول
  showMosqueAzkar();

  // فتح النافذة
  const modal = document.getElementById('azkar-modal');
  modal.classList.remove('hidden');
}

function showMosqueAzkar() {
  const { list, index, remain, prayerKey } = mosqueAzkarState;
  if (index >= list.length) {
    // انتهت الأذكار
    const modal = document.getElementById('azkar-modal');
    modal.classList.add('hidden');
    return;
  }

  const azkar = list[index];
  const textElement = document.getElementById('azkar-text');
  const remainingElement = document.getElementById('azkar-remaining');
  const titleElement = document.getElementById('azkar-modal-title');
  
  textElement.textContent = azkar.text;
  remainingElement.textContent = remain;
  
  // الحفاظ على عنوان النافذة كما هو
  const prayerNames = {
    Fajr: "الفجر",
    Dhuhr: "الظهر", 
    Asr: "العصر",
    Maghrib: "المغرب",
    Isha: "العشاء"
  };
  if (titleElement && prayerKey) {
    titleElement.textContent = `أذكار المسجد - ${prayerNames[prayerKey]}`;
  }

  // تحديث حالة الأزرار
  const prevBtn = document.getElementById('azkar-prev');
  const nextBtn = document.getElementById('azkar-next');
  const finishBtn = document.getElementById('azkar-finish');

  prevBtn.disabled = index === 0;
  nextBtn.disabled = index >= list.length - 1 && remain <= 1; // معطل فقط في آخر ذكر وآخر تكرار
  finishBtn.disabled = false;
}

// تعديل الدوال الأصلية للعمل مع أذكار المسجد
const originalAzkarNext = azkarNext;
const originalAzkarPrev = azkarPrev;
const originalAzkarFinish = azkarFinish;

// إعادة تعريف دالة azkarNext
function azkarNext() {
  if (mosqueAzkarState.list.length > 0) {
    // أذكار المسجد
    mosqueAzkarState.remain--;
    if (mosqueAzkarState.remain <= 0) {
      mosqueAzkarState.index++;
      if (mosqueAzkarState.index < mosqueAzkarState.list.length) {
        mosqueAzkarState.remain = mosqueAzkarState.list[mosqueAzkarState.index].repeat;
      }
    }
    showMosqueAzkar();
  } else {
    // أذكار الصباح والمساء (الكود الأصلي)
    if (azkarState.remain > 1) {
      azkarState.remain -= 1;
    } else if (azkarState.index < azkarState.list.length - 1) {
      azkarState.index += 1;
      azkarState.remain = azkarState.list[azkarState.index].repeat || 1;
    }
    updateAzkarView();
  }
}

// إعادة تعريف دالة azkarPrev
function azkarPrev() {
  if (mosqueAzkarState.list.length > 0) {
    // أذكار المسجد
    if (mosqueAzkarState.remain < mosqueAzkarState.list[mosqueAzkarState.index].repeat) {
      mosqueAzkarState.remain++;
    } else if (mosqueAzkarState.index > 0) {
      mosqueAzkarState.index--;
      mosqueAzkarState.remain = mosqueAzkarState.list[mosqueAzkarState.index].repeat;
    }
    showMosqueAzkar();
  } else {
    // أذكار الصباح والمساء (الكود الأصلي)
    if (azkarState.index > 0) {
      azkarState.index -= 1;
      azkarState.remain = azkarState.list[azkarState.index].repeat || 1;
      updateAzkarView();
    }
  }
}

// إعادة تعريف دالة azkarFinish
function azkarFinish() {
  if (mosqueAzkarState.list.length > 0) {
    // أذكار المسجد
    const modal = document.getElementById('azkar-modal');
    modal.classList.add('hidden');
    
    // تغيير حالة الزر إلى مكتمل (بدون تعطيل)
    const prayerKey = mosqueAzkarState.prayerKey;
    const mosqueBtn = document.querySelector(`.mosque-btn[data-prayer-key="${prayerKey}"]`);
    if (mosqueBtn) {
      mosqueBtn.classList.add('done');
      mosqueBtn.innerHTML = '✅';
      // لا نعطل الزر ليتمكن من إعادة فتح النافذة
    }
    
    // حفظ حالة الإنجاز في التخزين
    const completedKey = `completedMosqueAzkar:${todayKey()}`;
    const completed = new Set(safeGet(completedKey, []));
    completed.add(prayerKey);
    safeSet(completedKey, Array.from(completed));
    
    // تحديث الشريط المشترك
    updateCombinedProgress();
    
    // تحديث النقاط
    updateLeaderboard();
    
    // إعادة تعيين حالة أذكار المسجد
    mosqueAzkarState = { list: [], index: 0, remain: 1, prayerKey: '' };
    
    // إعادة تعيين عنوان النافذة حسب الفترة الحالية
    const title = document.getElementById('azkar-modal-title');
    const period = currentPeriod();
    title.textContent = period === 'morning' ? 'أذكار الصباح' : 'أذكار المساء';
  } else {
    // أذكار الصباح والمساء (الكود الأصلي)
    const period = azkarState.period || currentPeriod();
    const key = fajrDayKey();
    const flagKey = `dhikrDone:${period}:${key}`;
    if (!safeGet(flagKey, false)) {
      safeSet(flagKey, true);
      // تحديث الشريط المشترك
      updateCombinedProgress();
      updateLeaderboard();
    }
    closeAzkarModal();
  }
}

// وظائف إدارة قائمة الامتنانات
function showGratitudeList() {
  const modal = document.getElementById('gratitude-list-modal');
  const container = document.getElementById('gratitude-list-container');
  
  // جلب جميع الامتنانات المحفوظة
  const gratitudeList = getGratitudeList();
  
  if (gratitudeList.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666; margin: 2rem 0;">لا توجد امتنانات محفوظة بعد</p>';
  } else {
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    
    gratitudeList.forEach((item, index) => {
      const date = new Date(item.date);
      const dateStr = date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
      
      html += `
        <div class="gratitude-item">
          <div class="gratitude-header">
            <small class="gratitude-date">${dateStr}</small>
            <button onclick="deleteGratitude(${index})" class="gratitude-delete-btn">حذف</button>
          </div>
          <p class="gratitude-text">${item.text}</p>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  }
  
  modal.classList.remove('hidden');
}

function getGratitudeList() {
  try {
    const saved = localStorage.getItem('gratitudeList');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn('خطأ في قراءة قائمة الامتنانات:', e);
    return [];
  }
}

function saveGratitudeToList(text) {
  try {
    const list = getGratitudeList();
    const newItem = {
      text: text,
      date: new Date().toISOString()
    };
    list.unshift(newItem); // إضافة في البداية
    
    // الاحتفاظ بآخر 50 امتنان فقط
    if (list.length > 50) {
      list.splice(50);
    }
    
    localStorage.setItem('gratitudeList', JSON.stringify(list));
  } catch (e) {
    console.warn('خطأ في حفظ الامتنان:', e);
  }
}

function deleteGratitude(index) {
  try {
    const list = getGratitudeList();
    list.splice(index, 1);
    localStorage.setItem('gratitudeList', JSON.stringify(list));
    
    // إعادة عرض القائمة
    showGratitudeList();
  } catch (e) {
    console.warn('خطأ في حذف الامتنان:', e);
  }
}

// إضافة مستمعي الأحداث لنافذة قائمة الامتنانات
document.addEventListener('DOMContentLoaded', function() {
  const gratitudeListModal = document.getElementById('gratitude-list-modal');
  const gratitudeListModalClose = document.getElementById('gratitude-list-modal-close');
  const gratitudeListClose = document.getElementById('gratitude-list-close');
  const modalBackdrop = gratitudeListModal?.querySelector('.modal-backdrop');
  
  // إغلاق النافذة
  function closeGratitudeListModal() {
    gratitudeListModal.classList.add('hidden');
  }
  
  if (gratitudeListModalClose) {
    gratitudeListModalClose.addEventListener('click', closeGratitudeListModal);
  }
  
  if (gratitudeListClose) {
    gratitudeListClose.addEventListener('click', closeGratitudeListModal);
  }
  
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeGratitudeListModal);
  }
});

// ===== الأذكار الجديدة - لا تسكت =====

// بيانات الأذكار الجديدة
const newDhikrData = {
  taj: {
    title: 'تاج الذكر',
    text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير',
    repeat: 10
  },
  wudu: {
    title: 'بعد الوضوء',
    text: 'أشهد أن لا إله إلا الله وحده لا شريك له، وأشهد أن محمداً عبدُه ورسوله، اللهم اجعلني من التَّوابين، واجعلني من المتطهِّرين',
    repeat: 1
  },
  subhan: {
    title: 'ولو كانت مثل زبد البحر',
    text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    repeat: 100
  }
};

// حالة الأذكار الجديدة
let newDhikrState = {
  current: null,
  remaining: 1,
  completed: 0
};

// دالة فتح نافذة الأذكار الجديدة
function openDhikrModal(type) {
  const dhikr = newDhikrData[type];
  if (!dhikr) return;
  
  // تعيين الحالة
  newDhikrState.current = type;
  newDhikrState.remaining = dhikr.repeat;
  newDhikrState.completed = 0;
  
  // تحديث النافذة
  const modal = document.getElementById('dhikr-new-modal');
  const title = document.getElementById('dhikr-new-title');
  const text = document.getElementById('dhikr-new-text');
  const remaining = document.getElementById('dhikr-new-remaining');
  
  title.textContent = dhikr.title;
  text.textContent = dhikr.text;
  remaining.textContent = newDhikrState.remaining;
  
  // إظهار النافذة
  modal.classList.remove('hidden');
}

// دالة التالي للأذكار الجديدة
function newDhikrNext() {
  if (newDhikrState.remaining > 1) {
    newDhikrState.remaining--;
    newDhikrState.completed++;
    updateNewDhikrView();
  } else {
    // انتهى التكرار
    newDhikrFinish();
  }
}

// دالة السابق للأذكار الجديدة
function newDhikrPrev() {
  if (newDhikrState.completed > 0) {
    newDhikrState.remaining++;
    newDhikrState.completed--;
    updateNewDhikrView();
  }
}

// دالة تحديث عرض الأذكار الجديدة
function updateNewDhikrView() {
  const remaining = document.getElementById('dhikr-new-remaining');
  if (remaining) {
    remaining.textContent = newDhikrState.remaining;
  }
}

// دالة إنهاء الأذكار الجديدة
function newDhikrFinish() {
  const modal = document.getElementById('dhikr-new-modal');
  modal.classList.add('hidden');
  
  // حفظ الإنجاز
  const today = todayKey();
  const key = `newDhikrCompleted:${newDhikrState.current}:${today}`;
  safeSet(key, true);
  
  // تحديث النقاط
  updateLeaderboard();
  
  // إعادة تعيين الحالة
  newDhikrState = {
    current: null,
    remaining: 1,
    completed: 0
  };
}

// إضافة مستمعي الأحداث لنافذة الأذكار الجديدة
document.addEventListener('DOMContentLoaded', function() {
  const newDhikrModal = document.getElementById('dhikr-new-modal');
  const newDhikrModalClose = document.getElementById('dhikr-new-modal-close');
  const newDhikrPrevBtn = document.getElementById('dhikr-new-prev');
  const newDhikrNextBtn = document.getElementById('dhikr-new-next');
  const newDhikrFinishBtn = document.getElementById('dhikr-new-finish');
  const modalBackdrop = newDhikrModal?.querySelector('.modal-backdrop');
  
  // إغلاق النافذة
  function closeNewDhikrModal() {
    newDhikrModal.classList.add('hidden');
  }
  
  if (newDhikrModalClose) {
    newDhikrModalClose.addEventListener('click', closeNewDhikrModal);
  }
  
  if (newDhikrFinishBtn) {
    newDhikrFinishBtn.addEventListener('click', newDhikrFinish);
  }
  
  if (newDhikrNextBtn) {
    newDhikrNextBtn.addEventListener('click', newDhikrNext);
  }
  
  if (newDhikrPrevBtn) {
    newDhikrPrevBtn.addEventListener('click', newDhikrPrev);
  }
  
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeNewDhikrModal);
  }
  
  // إضافة مستمع للضغط على Enter للانتقال
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !newDhikrModal.classList.contains('hidden')) {
      newDhikrNext();
    }
  });
});


