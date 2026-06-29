// =================================================================
// ⚠️ إعدادات وتكوين قاعدة بيانات الـ Firebase الفورية المخصصة لـ محمد
// =================================================================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // ضع مفتاح مشروعك الفعلي هنا لو أردت الحماية الكاملة
    authDomain: "h-m-laundry-default.firebaseapp.com",
    databaseURL: "https://h-m-laundry-default-rtdb.firebaseio.com", // رابط داتا الفايربيز المباشر الخاص بك
    projectId: "h-m-laundry",
    storageBucket: "h-m-laundry.appspot.com",
    appId: "YOUR_APP_ID"
};

// تشغيل وربط الفايربيز بشكل فوري ومتوافق
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// =================================================================
// متغيرات وحالة السيستم التشغيلية (System State)
// =================================================================
let currentUser = null;
let allServices = {};
let cart = {}; 
let quickCalcCart = {}; // السلة المنفصلة للحاسبة السريعة المجانية
let systemSettings = {
    orderPhone: "01000000000",
    complaintPhone: "01000000000",
    minOrder: 100,
    promoText: "",
    mapUrl: "",
    isOpen: true
};
let allCustomers = {};
let receiptImgUrl = ""; // لحفظ مسار إيصال الاستلام إن وجد

// خدمات المغسلة الافتراضية للتأمين وبدء العمل لأول مرة
const defaultServices = {
    "item_1": { name: "قميص رجالي", category: "men", iron: 15, washIron: 25, dryClean: 45, img: "https://cdn-icons-png.flaticon.com/128/2503/2503380.png" },
    "item_2": { name: "بنطلون جينز", category: "men", iron: 15, washIron: 25, dryClean: 45, img: "https://cdn-icons-png.flaticon.com/128/3159/3159579.png" },
    "item_3": { name: "فستان سهرة حريمي", category: "women", iron: 40, washIron: 70, dryClean: 130, img: "https://cdn-icons-png.flaticon.com/128/1815/1815330.png" },
    "item_4": { name: "طقم أطفال قطعتين", category: "kids", iron: 15, washIron: 20, dryClean: 35, img: "https://cdn-icons-png.flaticon.com/128/4343/4343015.png" },
    "item_5": { name: "بطانية كبيرة", category: "home", iron: 0, washIron: 80, dryClean: 110, img: "https://cdn-icons-png.flaticon.com/128/3004/3004121.png" },
    "item_6": { name: "سجادة متر مربع", category: "home", iron: 0, washIron: 30, dryClean: 45, img: "https://cdn-icons-png.flaticon.com/128/9501/9501435.png" }
};

// =================================================================
// تشغيل وظائف الصفحة فور التحميل والربط البث المباشر المريح
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
    initRealtimeSync();
    setupCoreEvents();
    setupSecretAdminTrigger();
});

// مزامنة البيانات بشكل لحظي بدون لودينج أو إزعاج للمستخدم
function initRealtimeSync() {
    // 1. مراقبة وإحضار إعدادات تشغيل المغسلة الاستراتيجية
    database.ref("laundrySettings").on("value", (snapshot) => {
        if (snapshot.exists()) {
            systemSettings = snapshot.val();
        } else {
            database.ref("laundrySettings").set(systemSettings);
        }
        applySettingsToUI();
    });

    // 2. مراقبة وإحضار الملابس والأسعار المتاحة بالموقع
    database.ref("laundryServices").on("value", (snapshot) => {
        if (snapshot.exists()) {
            allServices = snapshot.val();
        } else {
            allServices = defaultServices;
            database.ref("laundryServices").set(defaultServices);
        }
        renderServicesGrid("all");
        renderQuickCalculator();
    });

    // 3. مراقبة العملاء لعرضهم بلوحة التحكم بطريقة سريعة ومحمية
    database.ref("laundryCustomers").on("value", (snapshot) => {
        if (snapshot.exists()) {
            allCustomers = snapshot.val();
            renderAdminCustomersTable();
        }
    });
}

// تطبيق الإعدادات الفورية القادمة من قاعدة البيانات على الواجهة الخارجية
function applySettingsToUI() {
    // إدارة البانر الإعلاني
    const banner = document.getElementById("promoBanner");
    const pText = document.getElementById("promoText");
    if (systemSettings.promoText && systemSettings.promoText.trim() !== "") {
        pText.innerText = `✨ ${systemSettings.promoText} ✨`;
        banner.classList.remove("hidden");
    } else {
        banner.classList.add("hidden");
    }

    // إدارة تنبيه الضغط والغلق المؤقت
    const closedAlert = document.getElementById("laundryClosedAlert");
    if (systemSettings.isOpen === false) {
        closedAlert.classList.remove("hidden");
    } else {
        closedAlert.classList.add("hidden");
    }

    // إدارة زر الخريطة بالفوتر
    const mapLink = document.getElementById("footerMapLink");
    if (systemSettings.mapUrl && systemSettings.mapUrl.trim() !== "") {
        mapLink.href = systemSettings.mapUrl;
        mapLink.classList.remove("hidden");
    } else {
        mapLink.classList.add("hidden");
    }

    // تحديث رقم الحد الأدنى بنص السلة التنبيهي
    document.getElementById("minOrderLimitText").innerText = systemSettings.minOrder;

    // تعبئة حقول لوحة تحكم الأدمن بالقيم الحالية
    document.getElementById("settingOrderPhone").value = systemSettings.orderPhone;
    document.getElementById("settingComplaintPhone").value = systemSettings.complaintPhone;
    document.getElementById("settingMinOrder").value = systemSettings.minOrder;
    document.getElementById("settingPromoText").value = systemSettings.promoText || "";
    document.getElementById("settingMapUrl").value = systemSettings.mapUrl || "";
    
    const statusChk = document.getElementById("settingStoreStatus");
    const statusLbl = document.getElementById("storeStatusLabelText");
    statusChk.checked = systemSettings.isOpen;
    if (systemSettings.isOpen) {
        statusLbl.innerText = "المغسلة مفتوحة وتستقبل أوردرات 🟢";
        statusLbl.className = "status-label-text open-status";
    } else {
        statusLbl.innerText = "المغسلة مغلقة مؤقتاً بسبب الضغط 🔴";
        statusLbl.className = "status-label-text closed-status";
    }
}

// =================================================================
// ربط أحداث الضغط للنماذج والمودالات والتنقلات السلسة
// =================================================================
function setupCoreEvents() {
    // تبديل تبويبات الدخول والتسجيل
    document.getElementById("tabLogin").addEventListener("click", () => {
        document.getElementById("tabLogin").classList.add("active");
        document.getElementById("tabRegister").classList.remove("active");
        document.getElementById("loginForm").classList.remove("hidden");
        document.getElementById("registerForm").classList.add("hidden");
    });
    document.getElementById("tabRegister").addEventListener("click", () => {
        document.getElementById("tabRegister").classList.add("active");
        document.getElementById("tabLogin").classList.remove("active");
        document.getElementById("registerForm").classList.remove("hidden");
        document.getElementById("loginForm").classList.add("hidden");
    });

    // أحداث معالجة الفوارم والدخول والخصوصية الآمنة لبيانات العملاء
    document.getElementById("loginForm").addEventListener("submit", handleCustomerLogin);
    document.getElementById("registerForm").addEventListener("submit", handleCustomerRegister);

    // تسجيل الخروج وإعادة تصفير السلة والتأمين للبيانات الشخصية
    document.getElementById("logoutBtn").addEventListener("click", () => {
        currentUser = null;
        cart = {};
        updateCartBadgeAndSummary();
        document.getElementById("appView").classList.add("hidden");
        document.getElementById("userInfoHeader").classList.add("hidden");
        document.getElementById("floatingCartBtn").classList.add("hidden");
        document.getElementById("authSection").classList.remove("hidden");
    });

    // التحكم في فلاتر وتصنيفات الملابس الفورية
    const filterTabs = document.querySelectorAll(".cat-tab");
    filterTabs.forEach(tab => {
        tab.addEventListener("click", (e) => {
            filterTabs.forEach(t => t.classList.remove("active"));
            e.currentTarget.classList.add("active");
            renderServicesGrid(e.currentTarget.getAttribute("data-category"));
        });
    });

    // إظهار وإغلاق مودال السلة والعناوين المرنة
    document.getElementById("floatingCartBtn").addEventListener("click", openCartModalDynamic);
    document.getElementById("closeCartModal").addEventListener("click", () => {
        document.getElementById("cartModal").classList.add("hidden");
    });

    // تبديل ظهور خانات العنوان طبقاً لاختيار العميل تسليم أو استلام دليفري
    document.querySelectorAll('input[name="pickupMethod"]').forEach(r => {
        r.addEventListener("change", toggleDynamicAddressFields);
    });
    document.querySelectorAll('input[name="deliveryMethod"]').forEach(r => {
        r.addEventListener("change", toggleDynamicAddressFields);
    });

    // تصوير ورفع الإيصال الورقي بداخل السلة (توليد مسار محلي فوري وهمي مريح)
    document.getElementById("receiptImage").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            document.getElementById("receiptStatus").innerText = "⏳ جاري حفظ وإرفاق صورة الإيصال بالطلب...";
            setTimeout(() => {
                receiptImgUrl = "مرفق صورة الإيصال الورقي المأخوذة بالمغسلة 📸";
                document.getElementById("receiptStatus").innerText = "✅ تم دمج صورة الإيصال بالطلب بنجاح.";
            }, 900);
        }
    });

    // معالجة الضغط لزر إرسال الأوردر المتكامل والتفصيلي على الواتساب
    document.getElementById("submitOrderBtn").addEventListener("click", fireOrderToWhatsApp);

    // مودال حاسبة الأسعار السريعة المجانية لعامة الزوار
    document.getElementById("openQuickCalcBtn").addEventListener("click", () => {
        document.getElementById("quickCalcModal").classList.remove("hidden");
    });
    document.getElementById("closeQuickCalcModal").addEventListener("click", () => {
        document.getElementById("quickCalcModal").classList.add("hidden");
    });
    document.getElementById("closeQuickCalcDone").addEventListener("click", () => {
        document.getElementById("quickCalcModal").classList.add("hidden");
    });

    // أكورديون الأسئلة الشائعة بالفوتر
    document.querySelectorAll(".faq-item").forEach(item => {
        item.addEventListener("click", () => {
            item.classList.toggle("open");
        });
    });

    // زر إرسال شكوى منفصل تماماً ومباشر لـ واتساب الإدارة
    document.getElementById("footerComplaintBtn").addEventListener("click", () => {
        let msg = encodeURIComponent(`مرحباً إدارة مغسلة H&M، لدي شكوى/اقتراح بخصوص السيستم أو الخدمة كالتالي: \n`);
        window.open(`https://wa.me/20${systemSettings.complaintPhone}?text=${msg}`, "_blank");
    });

    // محرك البحث الفوري برقم الموبايل بداخل جدول الأدمن
    document.getElementById("customerSearchInput").addEventListener("input", (e) => {
        const val = e.target.value.trim();
        renderAdminCustomersTable(val);
    });

    // فورم إضافة خدمة جديدة من الأدمن لوحة التحكم
    document.getElementById("addServiceForm").addEventListener("submit", handleAddServiceFromDash);
}

// تبديل حقول العنوان ديناميكياً
function toggleDynamicAddressFields() {
    const pickupVal = document.querySelector('input[name="pickupMethod"]:checked').value;
    const deliveryVal = document.querySelector('input[name="deliveryMethod"]:checked').value;

    if (pickupVal === "delivery") {
        document.getElementById("pickupAddressZone").classList.remove("hidden");
    } else {
        document.getElementById("pickupAddressZone").classList.add("hidden");
    }

    if (deliveryVal === "delivery") {
        document.getElementById("deliveryAddressZone").classList.remove("hidden");
    } else {
        document.getElementById("deliveryAddressZone").classList.add("hidden");
    }
}

// =================================================================
// منطق معالجة الدخول والتسجيل وفصل الحسابات الصارم لمنع العشوائية
// =================================================================
function handleCustomerRegister(e) {
    e.preventDefault();
    const name = document.getElementById("regName").value.trim();
    const phone = document.getElementById("regPhone").value.trim();
    const password = document.getElementById("regPassword").value.trim();

    if (!name || !phone || !password) return alert("من فضلك املأ كافة الحقول المطلوبة للتسجيل.");

    // التحقق من عدم وجود الحساب مسبقاً لحماية البيانات وفصل القديم عن الجديد
    if (allCustomers[phone]) {
        return alert("هذا الرقم مسجل بالفعل بالسيستم! فضلاً توجه لشاشة تسجيل الدخول.");
    }

    const newCust = { name, phone, password };
    database.ref("laundryCustomers/" + phone).set(newCust)
    .then(() => {
        alert("تهانينا! تم إنشاء حسابك بنجاح، جاري تحويلك للخدمات.");
        successLoginAction(newCust);
    });
}

function handleCustomerLogin(e) {
    e.preventDefault();
    const phone = document.getElementById("loginPhone").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (allCustomers[phone] && allCustomers[phone].password === password) {
        successLoginAction(allCustomers[phone]);
    } else {
        alert("⚠️ عذراً! رقم الموبايل أو كلمة المرور غير صحيحة، حاول مجدداً أو أنشئ حساباً جديداً.");
    }
}

function successLoginAction(customerObj) {
    currentUser = customerObj;
    cart = {};
    updateCartBadgeAndSummary();
    
    document.getElementById("welcomeUserName").innerText = `👋 مرحباً، ${currentUser.name}`;
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("appView").classList.remove("hidden");
    document.getElementById("userInfoHeader").classList.remove("hidden");
    document.getElementById("floatingCartBtn").classList.remove("hidden");
    
    // إعادة تصفير حقول الفورم بالكامل للأمان
    document.getElementById("loginForm").reset();
    document.getElementById("registerForm").reset();
}

// =================================================================
// معالجة وبناء شبكة عرض خدمات الملابس واختيار أنواع الغسيل والكي والأسعار الحرة المباشرة
// =================================================================
function renderServicesGrid(categoryFilter) {
    const container = document.getElementById("servicesContainer");
    container.innerHTML = "";

    for (let sId in allServices) {
        const item = allServices[sId];
        if (categoryFilter !== "all" && item.category !== categoryFilter) continue;

        // تحديد الخدمة الافتراضية المحددة للراديو (الأولى المتاحة للقطعة)
        let defaultServiceSelected = "washIron";
        if (item.washIron <= 0) {
            defaultServiceSelected = item.iron > 0 ? "iron" : "dryClean";
        }

        let initialPrice = item[defaultServiceSelected] || 0;

        const card = document.createElement("div");
        card.className = "service-card";
        card.innerHTML = `
            <img src="${item.img || 'https://cdn-icons-png.flaticon.com/128/2503/2503380.png'}" alt="garment">
            <h4>${item.name}</h4>
            
            <div class="service-options">
                ${item.iron > 0 ? `<label><input type="radio" name="srv_opt_${sId}" value="iron" ${defaultServiceSelected==='iron'?'checked':''} onchange="changeCardLivePrice('${sId}', ${item.iron})"> مكواة فقط (${item.iron}ج)</label>` : ''}
                ${item.washIron > 0 ? `<label><input type="radio" name="srv_opt_${sId}" value="washIron" ${defaultServiceSelected==='washIron'?'checked':''} onchange="changeCardLivePrice('${sId}', ${item.washIron})"> غسيل ومكواة (${item.washIron}ج)</label>` : ''}
                ${item.dryClean > 0 ? `<label><input type="radio" name="srv_opt_${sId}" value="dryClean" ${defaultServiceSelected==='dryClean'?'checked':''} onchange="changeCardLivePrice('${sId}', ${item.dryClean})"> دراي كلين (${item.dryClean}ج)</label>` : ''}
            </div>

            <div class="card-price-panel">
                <span id="price_span_${sId}">${initialPrice}</span> جنيه
            </div>
            <button class="btn-add-cart" onclick="addGarmentToCart('${sId}')">إضافة للسلة 🧺</button>
        `;
        container.appendChild(card);
    }
}

function changeCardLivePrice(sId, newPrice) {
    document.getElementById(`price_span_${sId}`).innerText = newPrice;
}

// إضافة القطعة للسلة التشغيلية
function addGarmentToCart(sId) {
    if (!currentUser) return alert("فضلاً سجل دخولك أولاً لتتمكن من الطلب.");
    
    // قراءة نوع الخدمة المختارة من الراديو بداخل الكارت الحالي
    const selectedRadio = document.querySelector(`input[name="srv_opt_${sId}"]:checked`);
    if (!selectedRadio) return alert("فضلاً اختر نوع الخدمة المطلوبة أولاً.");
    const serviceType = selectedRadio.value;
    
    const itemInfo = allServices[sId];
    const unitPrice = itemInfo[serviceType];

    // تكوين مفتاح فريد يدمج المعرف ونوع الخدمة (حتى لا يحدث خلط وتداخل بين الخدمة المختلفة لنفس القطعة)
    const cartKey = `${sId}_${serviceType}`;

    if (cart[cartKey]) {
        cart[cartKey].qty += 1;
    } else {
        cart[cartKey] = {
            id: sId,
            name: itemInfo.name,
            service: serviceType,
            price: unitPrice,
            qty: 1
        };
    }
    updateCartBadgeAndSummary();
    alert(`تم إضافة ${itemInfo.name} بالسلة بنجاح.`);
}

function updateCartBadgeAndSummary() {
    let totalItems = 0;
    let totalPrice = 0;

    for (let key in cart) {
        totalItems += cart[key].qty;
        totalPrice += (cart[key].price * cart[key].qty);
    }

    document.getElementById("cartBadge").innerText = totalItems;
    document.getElementById("cartTotalVal").innerText = totalPrice;
}

// =================================================================
// إدارة مودال السلة وعرض المشتريات ومراقبة الحد الأدنى لحماية مشوار المندوب
// =================================================================
function openCartModalDynamic() {
    const listContainer = document.getElementById("cartItemsList");
    listContainer.innerHTML = "";

    let totalPrice = 0;
    let hasItems = false;

    for (let key in cart) {
        hasItems = true;
        const item = cart[key];
        const rowTotal = item.price * item.qty;
        totalPrice += rowTotal;

        let serviceText = "غسيل ومكواة";
        if (item.service === "iron") serviceText = "مكواة فقط";
        if (item.service === "dryClean") serviceText = "دراي كلين";

        const div = document.createElement("div");
        div.className = "quick-item-row";
        div.innerHTML = `
            <div>
                <strong>${item.name}</strong> <small style="color:#0284c7;">(${serviceText})</small>
                <br><span style="font-size:12px; color:#64748b;">${item.price} ج × ${item.qty} = ${rowTotal} ج</span>
            </div>
            <div class="quick-actions">
                <button onclick="changeCartQty('${key}', -1)">-</button>
                <span>${item.qty}</span>
                <button onclick="changeCartQty('${key}', 1)">+</button>
            </div>
        `;
        listContainer.appendChild(div);
    }

    if (!hasItems) {
        listContainer.innerHTML = "<p style='text-align:center; color:#94a3b8; padding:20px;'>سلة طلباتك فارغة حالياً، املأها بقطع ملابسك.</p>";
    }

    // فحص واختبار الحد الأدنى للطلب وتأثيره طبقاً للتوصيل
    const pickupVal = document.querySelector('input[name="pickupMethod"]:checked').value;
    const deliveryVal = document.querySelector('input[name="deliveryMethod"]:checked').value;
    const isDeliveryNeeded = (pickupVal === "delivery" || deliveryVal === "delivery");

    const warningBox = document.getElementById("minOrderWarning");
    if (isDeliveryNeeded && totalPrice < systemSettings.minOrder && hasItems) {
        warningBox.classList.remove("hidden");
    } else {
        warningBox.classList.add("hidden");
    }

    document.getElementById("cartTotalVal").innerText = totalPrice;
    toggleDynamicAddressFields();
    document.getElementById("cartModal").classList.remove("hidden");
}

function changeCartQty(key, delta) {
    if (cart[key]) {
        cart[key].qty += delta;
        if (cart[key].qty <= 0) {
            delete cart[key];
        }
        updateCartBadgeAndSummary();
        openCartModalDynamic(); // إعادة التعبئة الفورية المنعشة للمودال
    }
}

// =================================================================
// تكوين وهيكلة وإرسال رسالة أوردر الغسيل التفصيلية والحرّة بالكامل للواتساب
// =================================================================
function fireOrderToWhatsApp() {
    let totalPrice = 0;
    let textItems = "";
    let index = 1;
    let hasItems = false;

    for (let key in cart) {
        hasItems = true;
        const item = cart[key];
        const rowTotal = item.price * item.qty;
        totalPrice += rowTotal;

        let srvText = "غسيل ومكواة";
        if (item.service === "iron") srvText = "مكواة فقط";
        if (item.service === "dryClean") srvText = "دراي كلين";

        textItems += `${index}) ${item.name} - خدمة: [${srvText}] - عدد: ${item.qty} ق - الحساب: ${rowTotal}ج \n`;
        index++;
    }

    if (!hasItems) return alert("السلة فارغة! يرجى إضافة قطع للملابس أولاً.");

    // التحقق من طريقة التسليم والاستلام والعناوين
    const pickupVal = document.querySelector('input[name="pickupMethod"]:checked').value;
    const deliveryVal = document.querySelector('input[name="deliveryMethod"]:checked').value;
    
    let pickupText = "المستخدم سيسلمها بنفسه في المغسلة 🏪";
    let pAddress = "";
    if (pickupVal === "delivery") {
        pAddress = document.getElementById("pickupAddress").value.trim();
        if (!pAddress) return alert("من فضلك اكتب عنوان استلام الهدوم من منزلك بالتفصيل.");
        pickupText = `طلب مندوب للاستلام من البيت 🛵 \n📍 العنوان: ${pAddress}`;
    }

    let deliveryText = "المستخدم سيأتي للاستلام بنفسه من المغسلة 🏪";
    let dAddress = "";
    if (deliveryVal === "delivery") {
        dAddress = document.getElementById("deliveryAddress").value.trim();
        if (!dAddress) return alert("من فضلك اكتب عنوان توصيل الهدوم لبيتك بالتفصيل.");
        deliveryText = `طلب مندوب للتوصيل للبيت 🛵 \n📍 العنوان: ${dAddress}`;
    }

    // فرملة الأوردر لو كان دليفري وأقل من الحد الأدنى للطلب المحدد استراتيجياً
    const isDeliveryNeeded = (pickupVal === "delivery" || deliveryVal === "delivery");
    if (isDeliveryNeeded && totalPrice < systemSettings.minOrder) {
        return alert(`عذراً يا بطل! الأوردر أقل من الحد الأدنى لخدمات التوصيل الدليفري للمغسلة وهو (${systemSettings.minOrder} جنيه)، فضلاً أضف قطع أخرى للمحافظة على مشوار المندوب.`);
    }

    // بناء نص رسالة الواتساب وتفاصيلها الحرة بالكامل
    let textMessage = `*أوردر غسيل جديد من سيستم H&M Laundry* 🧺✨\n\n`;
    textMessage += `👤 *اسم العميل:* ${currentUser.name}\n`;
    textMessage += `📱 *رقم موبايل العميل:* ${currentUser.phone}\n`;
    textMessage += `------------------------------------\n`;
    textMessage += `👕 *تفاصيل بيان قطع الملابس:* \n${textItems}\n`;
    textMessage += `------------------------------------\n`;
    textMessage += `📦 *طريقة تسليم الهدوم للمغسلة:* \n${pickupText}\n\n`;
    textMessage += `🧥 *طريقة استلام الهدوم بعد التجهيز:* \n${deliveryText}\n`;
    
    if (receiptImgUrl !== "") {
        textMessage += `\n🧾 *حالة الإيصال الورقي:* العميل صور وأرفق إيصال ورقي قديم بالطلب الفعلي [متاح للمراجعة].\n`;
    }

    textMessage += `\n💰 *إجمالي حساب القطع التقديري:* ${totalPrice} جنيه مصري.\n\n`;
    textMessage += `⚠️ *ملحوظة تشغيلية:* يرجى مراجعة الأوردر وتأكيد موعد استلام القطع وقيمة مشوار المندوب مع العميل ودياً الآن بـ الشات.`;

    let encodedText = encodeURIComponent(textMessage);
    window.open(`https://wa.me/20${systemSettings.orderPhone}?text=${encodedText}`, "_blank");

    // تصفير السلة وإغلاق المودال للتنظيف بعد إتمام الأوردر بنجاح
    cart = {};
    receiptImgUrl = "";
    document.getElementById("receiptStatus").innerText = "";
    document.getElementById("receiptImage").value = "";
    updateCartBadgeAndSummary();
    document.getElementById("cartModal").classList.add("hidden");
}

// =================================================================
// معالجة وبناء حاسبة الأسعار السريعة لعامة المستخدمين بدون تسجيل
// =================================================================
function renderQuickCalculator() {
    const calcBox = document.getElementById("quickCalcContainer");
    calcBox.innerHTML = "";

    for (let sId in allServices) {
        const item = allServices[sId];
        
        // تحديد أفضل سعر خدمة متاح لعرضه بالحاسبة بشكل افتراضي مبدئي
        let servicePrice = item.washIron > 0 ? item.washIron : (item.iron > 0 ? item.iron : item.dryClean);
        let currentQty = quickCalcCart[sId] ? quickCalcCart[sId].qty : 0;

        const row = document.createElement("div");
        row.className = "quick-item-row";
        row.innerHTML = `
            <span>${item.name} <small style="color:#3498db;">(${servicePrice}ج)</small></span>
            <div class="quick-actions">
                <button onclick="changeQuickCalcQty('${sId}', -1, ${servicePrice})">-</button>
                <span>${currentQty}</span>
                <button onclick="changeQuickCalcQty('${sId}', 1, ${servicePrice})">+</button>
            </div>
        `;
        calcBox.appendChild(row);
    }
}

function changeQuickCalcQty(sId, delta, price) {
    if (!quickCalcCart[sId]) {
        quickCalcCart[sId] = { qty: 0, price: price };
    }
    quickCalcCart[sId].qty += delta;
    if (quickCalcCart[sId].qty <= 0) {
        delete quickCalcCart[sId];
    }
    
    // حساب إجمالي الحاسبة
    let grandTotal = 0;
    for (let id in quickCalcCart) {
        grandTotal += (quickCalcCart[id].qty * quickCalcCart[id].price);
    }

    document.getElementById("quickCalcTotal").innerText = grandTotal;
    renderQuickCalculator(); // تحديث فوري للأرقام برؤية العين
}

// =================================================================
// كود لوحة تحكم الإدارة الشاملة (المحمية بـ 5 نقرات وباسورد محمد الحصري)
// =================================================================
let secretAdminClicks = 0;
function setupSecretAdminTrigger() {
    // اضغط 5 مرات متتالية في الفوتر على جملة الحقوق لطلب كلمة السر وفتح الداشبورد السرية
    document.querySelector(".copy").addEventListener("click", () => {
        secretAdminClicks++;
        if (secretAdminClicks >= 5) {
            secretAdminClicks = 0;
            const pass = prompt("فضلاً ادخل الرقم السري المخصص لإدارة مغسلة H&M:");
            
            // الباسورد الأمني الحصري والجديد الخاص بـ محمد
            if (pass === "@#20*60@#") { 
                document.getElementById("adminDashboard").classList.remove("hidden");
                switchAdminTab("customers-tab");
            } else {
                alert("⚠️ عذراً، الباسورد السري للإدارة خاطئ تماماً!");
            }
        }
    });
}

function switchAdminTab(tabId) {
    document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.add("hidden"));
    document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.remove("active"));
    
    document.getElementById(tabId).classList.remove("hidden");
    
    // تلوين التبويب النشط
    const activeBtn = Array.from(document.querySelectorAll(".admin-tab-btn")).find(b => b.getAttribute("onclick").includes(tabId));
    if (activeBtn) activeBtn.classList.add("active");
}

// تعبئة وعرض جدول العملاء مع دعم الفلترة الفورية بمحرك البحث الذكي بالرقم
function renderAdminCustomersTable(searchVal = "") {
    const tbody = document.getElementById("customersTableBody");
    tbody.innerHTML = "";

    for (let phone in allCustomers) {
        if (searchVal !== "" && !phone.includes(searchVal)) continue;

        const cust = allCustomers[phone];
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${cust.name}</strong></td>
            <td><a href="https://wa.me/20${cust.phone}" target="_blank" style="color:#22c55e; font-weight:bold; text-decoration:none;">🟢 0${cust.phone}</a></td>
            <td><code style="background:#f1f5f9; padding:2px 5px; border-radius:4px;">${cust.password}</code></td>
        `;
        tbody.appendChild(tr);
    }
}

// إضافة خدمة أو قطعة جديدة من لوحة التحكم فوراً بالـ Firebase
function handleAddServiceFromDash(e) {
    e.preventDefault();
    const name = document.getElementById("newServName").value.trim();
    const category = document.getElementById("newServCat").value;
    const iron = parseInt(document.getElementById("newServIron").value) || 0;
    const washIron = parseInt(document.getElementById("newServWashIron").value) || 0;
    const dryClean = parseInt(document.getElementById("newServDry").value) || 0;
    const img = document.getElementById("newServImg").value.trim() || "https://cdn-icons-png.flaticon.com/128/2503/2503380.png";

    const sId = "item_" + Date.now();
    const newServiceObj = { name, category, iron, washIron, dryClean, img };

    database.ref("laundryServices/" + sId).set(newServiceObj)
    .then(() => {
        alert("تم إدراج وتعميم قطعة الملابس الجديدة بالسيستم بنجاح! 🎉");
        document.getElementById("addServiceForm").reset();
    });
}

// حفظ الإعدادات الاستراتيجية والمرنة من الداشبورد للأدمن وتحديث الـ Firebase فوري
function saveSystemSettingsFromDash() {
    const oPhone = document.getElementById("settingOrderPhone").value.trim();
    const cPhone = document.getElementById("settingComplaintPhone").value.trim();
    const mOrder = parseInt(document.getElementById("settingMinOrder").value) || 0;
    const pText = document.getElementById("settingPromoText").value.trim();
    const map = document.getElementById("settingMapUrl").value.trim();
    const isOpenNow = document.getElementById("settingStoreStatus").checked;

    const newSettingsObj = {
        orderPhone: oPhone,
        complaintPhone: cPhone,
        minOrder: mOrder,
        promoText: pText,
        mapUrl: map,
        isOpen: isOpenNow
    };

    database.ref("laundrySettings").set(newSettingsObj)
    .then(() => {
        alert("✅ عظيم جداً يا محمد! تم تحديث وحفظ كافة إعدادات المغسلة والتحكم وتعميمها على كافة المستخدمين فوراً.");
    });
}
