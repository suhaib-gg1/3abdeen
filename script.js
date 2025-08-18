lucide.createIcons();

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
const toggleBtn = document.getElementById("toggle-dark");
toggleBtn.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  toggleBtn.textContent = document.documentElement.classList.contains("dark") ? "☀️" : "🌙";
});

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

      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.alignItems = "center";
      li.style.gap = "0.5rem";
      
      const span = document.createElement("span");
      span.textContent = `${names[key]} - ${formatted}`;
      
      const btn = document.createElement("button");
      btn.className = "prayer-btn";
      btn.innerHTML = "🕌";
      
      if (now < prayerTime) {
        btn.disabled = true;
      }
      
             btn.addEventListener("click", () => {
         btn.classList.add("done");
         btn.innerHTML = "✅";
         btn.disabled = true;
         
         // تحديث النقاط فوراً
         updateLeaderboard();
       });
      
      li.appendChild(span);
      li.appendChild(btn);
      list.appendChild(li);
    }
  } catch (e) {
    console.error(e);
  }
}
fetchPrayerTimes();

// القرآن
let quranProgress = 0;
function updateQuranProgress() {
  const choice = document.getElementById("quran-choice").value;
  let step = choice === "rubu" ? (2.5 / 604) * 100 : choice === "hizb" ? (10 / 604) * 100 : (20 / 604) * 100;
  quranProgress += step;
  if (quranProgress > 100) quranProgress = 100;
  document.getElementById("quran-progress").style.width = quranProgress + "%";
  
  // تحديث النقاط فوراً
  updateLeaderboard();
}

// الأذكار
let dhikrCount = 0;
function doneDhikr() {
  dhikrCount++;
  let percent = (dhikrCount / 3) * 100;
  if (percent > 100) percent = 100;
  document.getElementById("dhikr-progress").style.width = percent + "%";
  
  // تحديث النقاط فوراً
  updateLeaderboard();
}

// الامتنان
function saveGratitude() {
  const text = document.getElementById("gratitude-text").value;
  alert("تم الحفظ: " + text);
  
  // تحديث النقاط فوراً
  updateLeaderboard();
}

// تحديث النقاط عند كتابة الامتنان
document.addEventListener('DOMContentLoaded', function() {
  const gratitudeText = document.getElementById('gratitude-text');
  if (gratitudeText) {
    gratitudeText.addEventListener('input', function() {
      // تحديث النقاط عند الكتابة
      setTimeout(updateLeaderboard, 100);
    });
  }
});

// وظائف المجتمع
function joinCommunity() {
  alert("مرحباً بك في مجتمع عابدين! 🌟\nستتمكن من التواصل مع الأعضاء الآخرين ومشاركة تقدمك.");
}

function shareProgress() {
  const progress = {
    quran: quranProgress,
    dhikr: dhikrCount,
    prayers: document.querySelectorAll('.prayer-btn.done').length
  };
  
  const userPoints = calculateUserPoints();
  const userLevel = Math.floor(userPoints / 5) + 1; // مستوى جديد كل 5 نقاط
  
  let message = "تقدمي اليوم:\n";
  if (progress.quran > 0) {
    message += `📖 القرآن: ${progress.quran.toFixed(1)}%\n`;
  }
  if (progress.dhikr > 0) {
    message += `💙 الأذكار: ${progress.dhikr}/3\n`;
  }
  if (progress.prayers > 0) {
    message += `🕌 الصلوات: ${progress.prayers}/5\n`;
  }
  
  message += `\n🏆 النقاط: ${userPoints} نقطة\n`;
  message += `⭐ المستوى: ${userLevel}\n`;
  
  if (progress.quran === 0 && progress.dhikr === 0 && progress.prayers === 0) {
    message = "لم أكمل أي نشاط بعد اليوم. سأبدأ الآن! 💪";
  }
  
  alert(message);
}

// تحديث إحصائيات المجتمع
function updateCommunityStats() {
  const totalMembers = Math.floor(Math.random() * 500) + 1000;
  const dailyQuran = Math.floor(Math.random() * 200) + 400;
  const groupPrayers = Math.floor(Math.random() * 50) + 50;
  
  document.querySelectorAll('.stat-number')[0].textContent = totalMembers.toLocaleString();
  document.querySelectorAll('.stat-number')[1].textContent = dailyQuran.toLocaleString();
  document.querySelectorAll('.stat-number')[2].textContent = groupPrayers.toLocaleString();
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
  if (quranProgress > 0) {
    points += 1;
  }
  
  // نقاط الأذكار - نقطة واحدة عند إكمال الأذكار الثلاثة
  if (dhikrCount >= 3) {
    points += 1;
  }
  
  // نقاط الصلوات - نقطة واحدة لكل صلاة مكتملة
  const completedPrayers = document.querySelectorAll('.prayer-btn.done').length;
  points += completedPrayers;
  
  // نقاط الامتنان - نقطة واحدة عند كتابة الامتنان
  const gratitudeText = document.getElementById('gratitude-text');
  if (gratitudeText && gratitudeText.value.trim()) {
    points += 1;
  }
  
  console.log(`النقاط المحسوبة: القرآن=${quranProgress > 0 ? 1 : 0}, الأذكار=${dhikrCount >= 3 ? 1 : 0}, الصلوات=${completedPrayers}, الامتنان=${gratitudeText && gratitudeText.value.trim() ? 1 : 0}`);
  
  return Math.max(points, 1); // الحد الأدنى نقطة واحدة
}

// تحديث الترتيب كل دقيقة
setInterval(updateLeaderboard, 60000);

// تحديث النقاط عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  updateLeaderboard();
});
