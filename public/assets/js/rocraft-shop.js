// Rocraft shared storefront module (ES module) — used by index.html and all-products.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBLtls0Gv96pQAEwFORxcZ4PAmr9lAJxT4",
  authDomain: "rocraft-f0e6a.firebaseapp.com",
  projectId: "rocraft-f0e6a",
  storageBucket: "rocraft-f0e6a.firebasestorage.app",
  messagingSenderId: "393495310156",
  appId: "1:393495310156:web:d4e3657b5af8bda30e29e9"
};
export const WA_NUMBER = "201111447123";
export const db = getFirestore(initializeApp(firebaseConfig));

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const productUrl = (id, extra = "") => new URL(`product-details.html?id=${encodeURIComponent(id)}${extra}`, location.href).href;

// وصف قصير: الحقل الجديد، وإلا مقتطف آمن من الوصف القديم
export function shortDesc(p, max = 110) {
  const t = (p.shortDescription || "").trim();
  if (t) return t;
  const old = (p.description || "").replace(/\s+/g, " ").trim();
  return old.length > max ? old.slice(0, max).trim() + "…" : old;
}

export async function fetchProducts() {
  const snap = await getDocs(query(collection(db, "products")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function loadAnnouncements() {
  const box = document.getElementById("dynamic-announcements");
  if (!box) return;
  try {
    const s = await getDoc(doc(db, "settings", "announcements"));
    const msgs = s.exists() && Array.isArray(s.data().messages) ? s.data().messages : [];
    box.innerHTML = (msgs.length ? msgs : ["✨ أهلاً بكم في متجر رو كرافت للكروشيه ✨"])
      .map((m) => `<div class="swiper-slide" style="font-size:15px;font-weight:500">${esc(m)}</div>`).join("");
    setTimeout(() => {
      if (typeof Swiper === "undefined") return;
      const el = document.querySelector(".announcement-slider");
      if (el && el.swiper) el.swiper.destroy(true, true);
      new Swiper(".announcement-slider", { loop: true, speed: 600, autoplay: { delay: 3000, disableOnInteraction: false }, slidesPerView: 1, direction: "vertical" });
    }, 100);
  } catch (e) { console.error("announcements", e); }
}

// ---------- كارت المنتج (بدون تصنيف) ----------
export function cardHtml(p) {
  const img = p.imageUrl || p.image || "assets/img/icon - Copy.png";
  const out = p.stock !== undefined && p.stock !== null && Number(p.stock) === 0;
  const disc = p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
  const tag = out ? '<span class="rc-tag out">نفذت</span>' : disc ? `<span class="rc-tag">-${disc}%</span>` : "";
  const sd = shortDesc(p);
  return `<article class="rc-card">
    <a class="rc-media" href="product-details.html?id=${esc(p.id)}">${tag}<img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy"></a>
    <div class="rc-body">
      <h5 class="rc-name product-title"><a href="product-details.html?id=${esc(p.id)}">${esc(p.name)}</a></h5>
      ${sd ? `<p class="rc-desc">${esc(sd)}</p>` : ""}
      <div class="rc-price"><b>EGP ${esc(p.price)}</b>${disc ? `<s>EGP ${esc(p.oldPrice)}</s>` : ""}</div>
      <button type="button" class="rc-order" data-order-id="${esc(p.id)}" ${out ? "disabled" : ""}>${out ? "غير متوفر" : "اطلب الآن"}</button>
    </div>
  </article>`;
}

// ---------- قائمة خيارات الطلب ----------
export function initOrderSheet(getProduct) {
  if (!document.getElementById("rcSheet")) {
    document.body.insertAdjacentHTML("beforeend", `
    <div class="rc-sheet" id="rcSheet" hidden>
      <div class="rc-sheet-bg" data-close></div>
      <div class="rc-sheet-box" role="dialog" aria-modal="true" aria-labelledby="rcSheetTitle">
        <button class="rc-sheet-x" data-close aria-label="إغلاق"><i class="bi bi-x-lg"></i></button>
        <h4 id="rcSheetTitle">اختر طريقة الطلب</h4>
        <p class="rc-sheet-p" id="rcSheetName"></p>
        <a class="rc-opt wa" id="rcOptWa" target="_blank" rel="noopener"><i class="bi bi-whatsapp"></i><div><b>الطلب عبر واتساب</b><span>تواصل مباشر مع فريق رو كرافت</span></div></a>
        <a class="rc-opt web" id="rcOptWeb"><i class="bi bi-bag-check"></i><div><b>الطلب عبر الموقع</b><span>أدخل بياناتك وسنتواصل معك لتأكيد الطلب</span></div></a>
      </div>
    </div>`);
    const sheet = document.getElementById("rcSheet");
    sheet.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target.closest(".rc-opt")) sheet.hidden = true; });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") sheet.hidden = true; });
  }
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-order-id]");
    if (!btn) return;
    const p = getProduct(btn.dataset.orderId);
    if (!p) return;
    const msg = `أهلاً، عايز أطلب المنتج ده:\n${p.name}${p.sku ? `\nكود المنتج: ${p.sku}` : ""}\nالسعر: ${p.price} جنيه\nالرابط: ${productUrl(p.id)}`;
    document.getElementById("rcSheetName").textContent = `${p.name} — EGP ${p.price}`;
    document.getElementById("rcOptWa").href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    document.getElementById("rcOptWeb").href = productUrl(p.id, "&order=1");
    document.getElementById("rcSheet").hidden = false;
  });
}

// ---------- تنظيف النص العربي للبحث ----------
export const norm = (s) => String(s || "").toLowerCase()
  .replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
  .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/\s+/g, " ").trim();

// ارتفاع الهيدر الثابت → متغير CSS
export function syncHeaderHeight() {
  const h = document.getElementById("header");
  const set = () => h && document.documentElement.style.setProperty("--hdr", h.offsetHeight + "px");
  set(); addEventListener("resize", set); addEventListener("load", set);
  setTimeout(set, 600);
}
