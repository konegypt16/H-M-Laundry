// ================= إعدادات الاتصال بسيرفر جـوجـل Firebase الخاص بك =================
const firebaseConfig = {
    apiKey: "AIzaSyBEZ3bO4IPyPBBy4XWbudTgkR4eDhWqdxo", 
    authDomain: "h-laund.firebaseapp.com",
    databaseURL: "https://h-laund-default-rtdb.firebaseio.com/", 
    projectId: "h-laund",
    storageBucket: "h-laund.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:1234:web:1234"
};

// تهيئة وتشغيل الـ Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ================= إدارة الحالة المحلية المؤقتة (Local State) =================
const state = {
    user: { name: "", phone: "", points: 0 },
    config: { whatsapp: "201000000000", pointsRatio: 20, discountPerPoint: 0.5 },
    categories: ["الكل", "رجالي", "حريمي", "مفروشات"],
    services: [], 
    cart: {},
    activeCategory: "الكل",
    isDiscountApplied: false
};

// ================= الاستماع اللحظي للبيانات العالمية (Realtime Listeners) =================
// جلب الإعدادات (رقم الواتساب ونظام النقاط) تلقائياً بمجرد فتح الموقع
db.ref('config').on('value', (snapshot) => {
    if (snapshot.exists()) {
        state.config = snapshot.val();
        // تحديث خانات لوحة التحكم تلقائياً إذا كان الأدمن فاتح الصفحة
        document.getElementById('adm-whatsapp-phone').value = state.config.whatsapp;
        document.getElementById('adm-fallback-points').value = state.config.pointsRatio;
        document.getElementById('adm-discount-value').value = state.config.discountPerPoint;
        recalculateCart();
    }
});

// جلب قائمة الخدمات الحية من السيرفر وعرضها فوراً
db.ref('services').on('value', (snapshot) => {
    state.services = [];
    if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach(id => {
            state.services.push({ id, ...data[id] });
        });
    } else {
        // خدمات أولية افتراضية تظهر فقط لو كانت قاعدة البيانات فارغة تماماً لأول مرة
        state.services = [
            { id: "s1", name: "غسيل ومكواة قميص", price: 15, cat: "رجالي", icon: "👕" },
            { id: "s2", name: "بدلة كاملة ديركت", price: 70, cat: "رجالي", icon: "🧥" },
            { id: "s3", name: "فستان سهرة حريمي", price: 80, cat: "حريمي", icon: "👗" },
            { id: "s4", name: "بطانية كبيرة", price: 60, cat: "مفروشات", icon: "🛏️" }
        ];
    }
    renderCategories();
    renderServices();
});

// ================= نظام التنقل السلس والتحقق الصامت من الحسابات =================
function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(scr => scr.classList.remove('active'));
    setTimeout(() => {
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
    }, 50);
}

document.getElementById('btn-start').addEventListener('click', () => navigateTo('screen-auth'));

// منطق التحقق والإنشاء التلقائي للحسابات بكلمة المرور في السيرفر السحابي
document.getElementById('auth-form').addEventListener('submit', (e) => {
    const name = document.getElementById('user-name').value.trim();
    const phone = document.getElementById('user-phone').value.trim();
    const password = document.getElementById('user-password').value;
    
    // تنظيف رقم الهاتف ليكون معرفاً فريداً لكل مستخدم بالسيرفر
    const userKey = 'u_' + phone.replace(/[^0-9]/g, '');

    // استعلام صامت وسريع من السيرفر عن هذا الحساب
    db.ref('users/' + userKey).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const existingUser = snapshot.val();
            // التحقق من كلمة المرور
            if (existingUser.password === password) {
                state.user = existingUser;
            } else {
                alert("⚠️ كلمة المرور خاطئة لهذا الرقم، يرجى التأكد وإعادة المحاولة.");
                return;
            }
        } else {
            // حساب جديد تماماً -> إنشاؤه فوراً بنقاط ترحيبية (10 نقاط) وحفظ كلمة المرور
            state.user = { name: name, phone: phone, password: password, points: 10 };
            db.ref('users/' + userKey).set(state.user);
            alert("✨ أهلاً بك! تم إنشاء حساب جديد لك ومنحك 10 نقاط ترحيبية هدية.");
        }

        // تحديث واجهة العميل بالبيانات السحابية الجديدة
        document.getElementById('display-user-name').innerText = state.user.name;
        document.getElementById('display-user-points').innerText = state.user.points;
        
        recalculateCart();
        navigateTo('screen-services');
    });
});

document.getElementById('btn-logout').addEventListener('click', () => {
    state.cart = {};
    state.isDiscountApplied = false;
    navigateTo('screen-welcome');
});

// ================= إدارة بناء الخدمات والتبويبات =================
function renderCategories() {
    const wrapper = document.getElementById('tabs-wrapper');
    wrapper.innerHTML = "";
    state.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${state.activeCategory === cat ? 'active' : ''}`;
        btn.innerText = cat;
        btn.addEventListener('click', () => {
            state.activeCategory = cat;
            renderCategories();
            renderServices();
        });
        wrapper.appendChild(btn);
    });

    const select = document.getElementById('adm-service-category');
    if(select) {
        select.innerHTML = "";
        state.categories.filter(c => c !== "الكل").forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat; opt.innerText = cat; select.appendChild(opt);
        });
    }
}

function renderServices() {
    const wrapper = document.getElementById('services-wrapper');
    wrapper.innerHTML = "";
    
    const filtered = state.activeCategory === "الكل" 
        ? state.services 
        : state.services.filter(s => s.cat === state.activeCategory);
        
    filtered.forEach(srv => {
        const qty = state.cart[srv.id] || 0;
        const card = document.createElement('div');
        card.className = `service-card ${qty > 0 ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="service-img-sim">${srv.icon}</div>
            <div class="service-name">${srv.name}</div>
            <div class="service-price">${srv.price} جنيه</div>
            <div class="quantity-control">
                <button class="btn-qty" onclick="changeQty('${srv.id}', -1)">-</button>
                <span class="qty-val">${qty}</span>
                <button class="btn-qty" onclick="changeQty('${srv.id}', 1)">+</button>
            </div>
        `;
        wrapper.appendChild(card);
    });
}

window.changeQty = function(id, delta) {
    const currentQty = state.cart[id] || 0;
    const newQty = currentQty + delta;
    if (newQty <= 0) { delete state.cart[id]; } else { state.cart[id] = newQty; }
    renderServices();
    recalculateCart();
};

function recalculateCart() {
    let totalItems = 0;
    let basePrice = 0;
    
    Object.keys(state.cart).forEach(id => {
        const srv = state.services.find(s => s.id == id);
        const qty = state.cart[id];
        if (srv) { totalItems += qty; basePrice += (srv.price * qty); }
    });
    
    const deliveryRadio = document.querySelector('input[name="delivery"]:checked');
    if (deliveryRadio && deliveryRadio.value === 'delivery' && basePrice > 0) {
        basePrice += 20;
    }
    
    const loyaltyBox = document.getElementById('loyalty-discount-section');
    if (state.user.points > 0 && basePrice > 0) {
        loyaltyBox.classList.remove('hidden');
    } else {
        loyaltyBox.classList.add('hidden');
        state.isDiscountApplied = false;
    }
    
    if (state.isDiscountApplied) {
        const discountAmount = state.user.points * state.config.discountPerPoint;
        basePrice = Math.max(0, basePrice - discountAmount);
        document.getElementById('btn-apply-discount').innerText = "تم تطبيق الخصم ✓";
        document.getElementById('btn-apply-discount').classList.add('applied');
    } else {
        document.getElementById('btn-apply-discount').innerText = "تطبيق الخصم";
        document.getElementById('btn-apply-discount').classList.remove('applied');
    }
    
    document.getElementById('total-items').innerText = totalItems;
    document.getElementById('total-price').innerText = basePrice;
}

document.querySelectorAll('input[name="delivery"]').forEach(radio => {
    radio.addEventListener('change', () => recalculateCart());
});

document.getElementById('btn-apply-discount').addEventListener('click', () => {
    state.isDiscountApplied = !state.isDiscountApplied;
    recalculateCart();
});

// ================= تشغيل لوحة التحكم السرية العالمية للأدمن =================
let copyrightClickCount = 0;
let copyrightTimeout;

document.getElementById('copyright-text').addEventListener('click', () => {
    copyrightClickCount++;
    clearTimeout(copyrightTimeout);
    copyrightTimeout = setTimeout(() => { copyrightClickCount = 0; }, 2000);
    
    if (copyrightClickCount === 5) {
        copyrightClickCount = 0;
        const pass = prompt("الرجاء إدخال كلمة المرور السرية للوحة التحكم:");
        if (pass === "@#20*60@#") {
            document.getElementById('admin-dashboard').classList.add('open');
        } else if (pass !== null) {
            alert("كلمة المرور خاطئة!");
        }
    }
});

document.getElementById('btn-close-admin').addEventListener('click', () => {
    document.getElementById('admin-dashboard').classList.remove('open');
});

// حفظ إعدادات النظام وتغيير رقم الواتساب حياً في السيرفر للكل
document.getElementById('btn-save-sys-config').addEventListener('click', () => {
    const wpNum = document.getElementById('adm-whatsapp-phone').value.trim();
    const ratio = Number(document.getElementById('adm-fallback-points').value);
    const disc = Number(document.getElementById('adm-discount-value').value);
    
    if(!wpNum || isNaN(wpNum)) { alert("برجاء إدخال رقم هاتف صحيح!"); return; }

    db.ref('config').set({ whatsapp: wpNum, pointsRatio: ratio, discountPerPoint: disc })
    .then(() => alert("تم تحديث الإعدادات السحابية بنجاح لملايين المستخدمين!"));
});

// إضافة خدمة جديدة ومزامنتها للسيرفر في نفس الثانية
document.getElementById('btn-add-service').addEventListener('click', () => {
    const name = document.getElementById('adm-service-name').value.trim();
    const price = Number(document.getElementById('adm-service-price').value);
    const cat = document.getElementById('adm-service-category').value;
    const icon = document.getElementById('adm-service-icon').value.trim();
    
    if (!name || !price) { alert("أكمل البيانات أولاً!"); return; }
    
    const newServiceRef = db.ref('services').push(); 
    newServiceRef.set({ name, price, cat, icon })
    .then(() => {
        alert(`تم رفع خدمة [${name}] على السيرفر بنجاح!`);
        document.getElementById('adm-service-name').value = "";
        document.getElementById('adm-service-price').value = "";
    });
});

// ================= إرسال الطلب وتحديث النقاط الحية بالسيرفر =================
document.getElementById('btn-whatsapp-confirm').addEventListener('click', () => {
    let orderDetails = [];
    let currentTotal = 0;
    
    Object.keys(state.cart).forEach(id => {
        const srv = state.services.find(s => s.id == id);
        if (srv) {
            orderDetails.push(`- ${srv.name} (العدد: ${state.cart[id]})`);
            currentTotal += (srv.price * state.cart[id]);
        }
    });
    
    if (orderDetails.length === 0) { alert("سلتك فارغة! اختر خدماتك أولاً."); return; }
    
    // حساب النقاط الجديدة بناءً على معدل الأسعار من السيرفر
    const earnedPoints = Math.floor(currentTotal / state.config.pointsRatio);
    let finalPoints = state.user.points + earnedPoints;
    
    if (state.isDiscountApplied) {
        finalPoints = earnedPoints; // تصفير النقاط القديمة لأنها استُبدلت بخصم
    }
    
    // تحديث نقاط المستخدم صامتاً في قاعدة البيانات السحابية فوراً قبل فتح الواتساب
    const userKey = 'u_' + state.user.phone.replace(/[^0-9]/g, '');
    db.ref('users/' + userKey + '/points').set(finalPoints);
    
    state.user.points = finalPoints;
    document.getElementById('display-user-points').innerText = finalPoints;

    const deliveryType = document.querySelector('input[name="delivery"]:checked').value;
    const deliveryStr = deliveryType === 'delivery' ? 'توصيل للمنزل 🛵' : 'استلام من المغسلة 🧺';
    const grandTotal = document.getElementById('total-price').innerText;
    
    const textMsg = `مرحباً H&M Laundry 🧼\n` +
                    `طلب حجز غسيل جديد من:\n` +
                    `الاسم: ${state.user.name}\n` +
                    `الهاتف: ${state.user.phone}\n` +
                    `---------------------------\n` +
                    `القطع المطلوبة:\n${orderDetails.join('\n')}\n` +
                    `---------------------------\n` +
                    `طريقة التوصيل: ${deliveryStr}\n` +
                    `الخصم المطبق: ${state.isDiscountApplied ? 'نعم (تم استبدال نقاط الولاء بالخصم)' : 'لا'}\n` +
                    `الحساب الإجمالي النهائي: *${grandTotal} جنيه مصري*\n` +
                    `النقاط الحالية بحسابي: ${finalPoints} نقطة ✨`;
                    
    window.open(`https://wa.me/${state.config.whatsapp}?text=${encodeURIComponent(textMsg)}`, '_blank');
});
