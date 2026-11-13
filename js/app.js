const $ = (s, p = document) => p.querySelector(s), $$ = (s, p = document) => [...p.querySelectorAll(s)];
const DB = new Map(), money = n => '$' + n.toFixed(2);
const orig = p => p.price / (1 - p.discountPercentage / 100);
const stars = r => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
const COUPONS = { STACK10: { pct: 10 }, FASHION20: { pct: 20, min: 100 }, WELCOME15: { pct: 15 }, FREESHIP: { ship: true } };
let ALL = [], shop = { list: [], page: 1, per: 8 }, tab = 'cart';

/* ---------- helpers ---------- */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t.h); t.h = setTimeout(() => t.classList.remove('on'), 2400); }
function card(p) {
  DB.set(p.id, p);
  return `<article class="card" data-id="${p.id}" data-aos="fade-up"><div class="cimg"><img loading="lazy" src="${p.thumbnail}" alt="${p.title}" data-act="view"><span class="tag">-${Math.round(p.discountPercentage)}%</span><button class="heart ${Store.inWish(p.id) ? 'on' : ''}" data-act="wish" aria-label="Toggle wishlist">♥</button></div><div class="cbody"><small>${p.category.replace(/-/g, ' ')}</small><h3 data-act="view">${p.title}</h3><div class="rate">${stars(p.rating)} <em>${p.rating.toFixed(1)}</em></div><div class="price"><b>${money(p.price)}</b><s>${money(orig(p))}</s></div><button class="btn sm" data-act="add">Add to cart</button></div></article>`;
}
function skeleton(el, n = 4) { el.innerHTML = '<div class="sk"></div>'.repeat(n); }
function fail(el, msg, retry) { el.innerHTML = `<div class="state"><h3>Something went wrong</h3><p>${msg}</p><button class="btn">Try again</button></div>`; $('button', el).onclick = retry; }
function render(el, list) { el.innerHTML = list.length ? list.map(card).join('') : '<div class="state"><h3>No products found</h3><p>Try a different name or clear the category filter.</p></div>'; window.AOS && AOS.refreshHard(); }
function sortList(l, s) { const a = [...l]; return s === 'pa' ? a.sort((x, y) => x.price - y.price) : s === 'pd' ? a.sort((x, y) => y.price - x.price) : s === 'rd' ? a.sort((x, y) => y.rating - x.rating) : s === 'ra' ? a.sort((x, y) => x.rating - y.rating) : a; }

/* ---------- text animation ---------- */
function splitText() {
  $$('[data-ta]').forEach(el => {
    const m = el.dataset.ta, t = el.textContent.trim();
    if (['rise', 'blur'].includes(m)) el.innerHTML = t.split(' ').map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span> `).join('');
    if (['pop', 'flip', 'wave'].includes(m)) { let i = 0; el.innerHTML = t.split(' ').map(w => `<span class="w" style="overflow:visible">${[...w].map(c => `<span class="c" style="--i:${i++}">${c}</span>`).join('')}</span>`).join(' '); }
    el.setAttribute('aria-label', t);
  });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.dataset.count) countUp(e.target); } }), { threshold: .3 });
  $$('[data-ta]').forEach(e => io.observe(e));
  $$('[data-count]').forEach(e => io.observe(e));
}
function countUp(el) { const to = +el.dataset.count, dec = to % 1 ? 1 : 0, t0 = performance.now(); (function f(t) { const k = Math.min((t - t0) / 1600, 1); el.textContent = (to * k).toFixed(dec); k < 1 && requestAnimationFrame(f); })(t0); }


/* ---------- data loading ---------- */
async function loadHome() {
  const grids = ['#newGrid', '#trendGrid', '#bestGrid'].map(s => $(s));
  grids.forEach(g => skeleton(g));
  try {
    ALL = await Api.all(); ALL.forEach(p => DB.set(p.id, p));
    const byId = [...ALL].sort((a, b) => b.id - a.id), best = [...ALL].sort((a, b) => b.rating - a.rating).slice(0, 4);
    render($('#newGrid'), byId.slice(0, 8));
    render($('#trendGrid'), [...ALL].sort((a, b) => a.stock - b.stock).filter(p => !best.includes(p)).slice(0, 8));
    render($('#bestGrid'), best);
    const cats = [...new Set(ALL.map(p => p.category))]; $('#cat').innerHTML += cats.map(c => `<option value="${c}">${c.replace(/-/g, ' ')}</option>`).join('');
    loadShop();
  } catch (e) { grids.forEach(g => fail(g, e.message, loadHome)); fail($('#shopGrid'), e.message, loadHome); }
}
async function loadShop() {
  const g = $('#shopGrid'), q = $('#q').value.trim(), c = $('#cat').value; skeleton(g, 8); $('#more').hidden = true;
  try {
    let l = q ? await Api.search(q) : c ? await Api.byCategory(c) : ALL;
    if (q && c) l = l.filter(p => p.category === c);
    shop.list = sortList(l, $('#sort').value); shop.page = 1; drawShop();
  } catch (e) { fail(g, e.message, loadShop); }
}
function drawShop() {
  const n = shop.page * shop.per, l = shop.list.slice(0, n); render($('#shopGrid'), l);
  $('#count').textContent = `Showing ${l.length} of ${shop.list.length} products`; $('#more').hidden = n >= shop.list.length;
}

/* ---------- cart / wishlist ---------- */
function totals() {
  const sub = Store.cart.reduce((s, i) => s + i.price * i.qty, 0), c = COUPONS[Store.coupon];
  const disc = c?.pct && sub >= (c.min || 0) ? sub * c.pct / 100 : 0, ship = !sub || c?.ship || sub - disc >= 150 ? 0 : 9.99;
  return { sub, disc, ship, total: sub - disc + ship };
}
function updateCounts() { $('#cartCount').textContent = Store.cart.reduce((s, i) => s + i.qty, 0); $('#wishCount').textContent = Store.wish.length; }
function drawDrawer() {
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const body = $('#dbody'), foot = $('#dfoot');
  if (tab === 'cart') {
    body.innerHTML = Store.cart.length ? Store.cart.map(i => `<div class="row" data-id="${i.id}"><img src="${i.thumbnail}" alt=""><div><h4>${i.title}</h4><small>${money(i.price)}</small><div class="qty"><button data-act="dec" aria-label="Decrease">−</button><span>${i.qty}</span><button data-act="inc" aria-label="Increase">+</button></div></div><div><b>${money(i.price * i.qty)}</b><button class="rm" data-act="rm">Remove</button></div></div>`).join('') : '<div class="empty"><h3>Your cart is empty</h3><p>Add a piece you love to start your stack.</p></div>';
    const t = totals(), c = COUPONS[Store.coupon], note = Store.coupon ? (c?.pct && t.disc === 0 ? `<span class="bad">${Store.coupon} needs a $${c.min} subtotal.</span>` : `<span class="ok">${Store.coupon} applied</span>`) : '';
    foot.innerHTML = Store.cart.length ? `<div class="cp"><input id="cpIn" placeholder="Coupon code" value="${Store.coupon}"><button data-act="coupon">Apply</button></div>${note}<div class="tl"><span>Subtotal</span><span>${money(t.sub)}</span></div><div class="tl"><span>Discount</span><span>−${money(t.disc)}</span></div><div class="tl"><span>Shipping</span><span>${t.ship ? money(t.ship) : 'Free'}</span></div><div class="tl big"><span>Total</span><span>${money(t.total)}</span></div><button class="btn" data-act="checkout">Place order</button>` : '';
  } else {
    body.innerHTML = Store.wish.length ? Store.wish.map(i => `<div class="row" data-id="${i.id}"><img src="${i.thumbnail}" alt=""><div><h4>${i.title}</h4><small>${money(i.price)}</small><button class="rm" style="color:#567" data-act="wish">Remove</button></div><button class="btn sm" data-act="add">Add</button></div>`).join('') : '<div class="empty"><h3>No saved items</h3><p>Tap the heart on any product to save it.</p></div>'; foot.innerHTML = '';
  }
  updateCounts();
}
function openDrawer(t) { tab = t; drawDrawer(); $('#drawer').classList.add('on'); $('#overlay').classList.add('on'); }
function closeAll() { $('#drawer').classList.remove('on'); $('#overlay').classList.remove('on'); $('#modal').classList.remove('on'); $('#nav').classList.remove('on'); }
function checkout() {
  const t = totals(), o = { id: 'STK' + Date.now().toString().slice(-7), date: new Date().toLocaleString(), items: Store.cart, ...t, coupon: Store.coupon };
  Store.orders.push(o); Store.cart = []; Store.coupon = ''; Store.save(); drawDrawer(); closeAll();
  $('#mbody').innerHTML = `<div class="done"><div class="chk">✓</div><h2>Order confirmed</h2><p>Thank you! Your order <b>${o.id}</b> for <b>${money(o.total)}</b> is being packed.</p><p class="count">${o.items.length} item(s) · placed ${o.date}</p><button class="btn" data-close>Keep shopping</button></div>`;
  $('#modal').classList.add('on');
}
async function openProduct(id) {
  $('#mbody').innerHTML = '<div class="state">Loading product…</div>'; $('#modal').classList.add('on');
  try {
    const p = await Api.one(id); DB.set(p.id, p);
    $('#mbody').innerHTML = `<div class="pd" data-id="${p.id}"><div><img class="main" id="mainImg" src="${p.images[0] || p.thumbnail}" alt="${p.title}"><div class="thumbs">${p.images.map(i => `<img src="${i}" alt="" data-act="thumb">`).join('')}</div></div><div><small>${p.category.replace(/-/g, ' ')}${p.brand ? ' · ' + p.brand : ''}</small><h2>${p.title}</h2><div class="rate">${stars(p.rating)} <em>${p.rating.toFixed(1)} (${p.reviews?.length || 0} reviews)</em></div><div class="price"><b style="font-size:1.6rem">${money(p.price)}</b><s>${money(orig(p))}</s></div><p>${p.description}</p><ul><li>${p.availabilityStatus || 'In stock'} · ${p.stock} left</li><li>${p.shippingInformation || 'Ships in 2 days'}</li><li>${p.returnPolicy || '30 days return policy'}</li></ul><button class="btn" data-act="add">Add to cart</button> <button class="btn ghost" data-act="wish">${Store.inWish(p.id) ? 'Saved ♥' : 'Save ♡'}</button>${(p.reviews || []).slice(0, 2).map(r => `<div class="rev"><b>${r.reviewerName}</b> ${stars(r.rating)}<br>${r.comment}</div>`).join('')}</div></div>`;
  } catch (e) { fail($('#mbody'), e.message, () => openProduct(id)); }
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'), id = +(e.target.closest('[data-id]')?.dataset.id);
  if (e.target.closest('[data-close]') || e.target === $('#overlay') || e.target === $('#modal')) return closeAll();
  const o = e.target.closest('[data-open]'); if (o) return openDrawer(o.dataset.open);
  const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; return drawDrawer(); }
  const ct = e.target.closest('[data-cat]'); if (ct) { $('#cat').value = ct.dataset.cat; $('#q').value = ''; loadShop(); return $('#shop').scrollIntoView(); }
  const of = e.target.closest('[data-code]'); if (of) { navigator.clipboard?.writeText(of.dataset.code).catch(() => {}); Store.coupon = of.dataset.code; Store.save(); return toast(`Code ${of.dataset.code} copied and saved to your cart`); }
  if (!a) return; const p = DB.get(id) || Store.cart.find(x => x.id === id) || Store.wish.find(x => x.id === id), act = a.dataset.act;
  if (act === 'view') openProduct(id);
  else if (act === 'add') { Store.add(p); toast('Added to cart'); drawDrawer(); }
  else if (act === 'wish') { Store.toggleWish(p); $$(`.card[data-id="${id}"] .heart`).forEach(h => h.classList.toggle('on', Store.inWish(id))); toast(Store.inWish(id) ? 'Saved to wishlist' : 'Removed from wishlist'); drawDrawer(); }
  else if (act === 'inc') { Store.qty(id, 1); drawDrawer(); } else if (act === 'dec') { Store.qty(id, -1); drawDrawer(); } else if (act === 'rm') { Store.remove(id); drawDrawer(); }
  else if (act === 'coupon') { const c = $('#cpIn').value.trim().toUpperCase(); if (!COUPONS[c]) { Store.coupon = ''; Store.save(); drawDrawer(); return toast('That code is not valid'); } Store.coupon = c; Store.save(); drawDrawer(); toast('Coupon applied'); }
  else if (act === 'checkout') checkout();
  else if (act === 'thumb') $('#mainImg').src = e.target.src;
});
let deb; $('#q').addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(loadShop, 450); });
$('#cat').onchange = loadShop; $('#sort').onchange = loadShop;
$('#more').onclick = () => { shop.page++; drawShop(); };
$('#searchBtn').onclick = () => { $('#shop').scrollIntoView(); setTimeout(() => $('#q').focus(), 600); };
$('#burger').onclick = () => { $('#nav').classList.toggle('on'); $('#overlay').classList.toggle('on'); };
$$('#nav a').forEach(a => a.onclick = closeAll);
document.addEventListener('keydown', e => e.key === 'Escape' && closeAll());
window.addEventListener('scroll', () => $('#header').classList.toggle('sc', scrollY > 20));
$('#nlForm').onsubmit = e => {
  e.preventDefault(); const em = $('#nlEmail').value.trim(), m = $('#nlMsg');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return m.textContent = 'Enter a valid email address.';
  const subs = LS.get('stk_subs', []); if (!subs.includes(em)) subs.push(em); LS.set('stk_subs', subs); m.textContent = 'You are in! Check your inbox for STACK10.'; e.target.reset();
};
function countdown() { let end = LS.get('stk_end', 0); if (end < Date.now()) { end = Date.now() + 3 * 864e5; LS.set('stk_end', end); } const f = n => String(n).padStart(2, '0'); (function t() { const d = Math.max(end - Date.now(), 0), s = d / 1e3; $('#cd').textContent = `${Math.floor(s / 86400)}d ${f(Math.floor(s % 86400 / 3600))}h ${f(Math.floor(s % 3600 / 60))}m ${f(Math.floor(s % 60))}s`; setTimeout(t, 1000); })(); }

/* ---------- init ---------- */
(function preload() {
  const pl = $('#preloader'), num = $('#pnum'), bar = $('#pbar'), w = $('#plw'), words = ['Dresses', 'Shirts', 'Shoes', 'Bags', 'Shades'];
  let loaded = false, k = 0; const t0 = performance.now(); addEventListener('load', () => loaded = true);
  const wi = setInterval(() => { w.textContent = words[++k % words.length]; w.classList.remove('sw'); void w.offsetWidth; w.classList.add('sw'); }, 600);
  (function f(t) {
    if (t - t0 > 7000) loaded = true; let p = Math.min((t - t0) / 2600, 1); if (!loaded) p = Math.min(p, .92);
    num.textContent = Math.round(p * 100); bar.style.width = p * 100 + '%';
    if (p < 1) return requestAnimationFrame(f);
    clearInterval(wi); pl.classList.add('hide'); setTimeout(() => $('.hero h1')?.classList.add('in'), 500); setTimeout(() => pl.remove(), 1600);
  })(t0);
})();
const PHRASES = ['dresses that move with you', 'shirts made for layering', 'shoes with a story', 'bags that carry it all', 'shades for every season'];
(function typer() { const el = $('#typed'); let i = 0, j = 0, del = false; (function tick() { const s = PHRASES[i]; j += del ? -1 : 1; el.textContent = s.slice(0, j); let d = del ? 35 : 75; if (!del && j === s.length) { del = true; d = 1400; } else if (del && j === 0) { del = false; i = (i + 1) % PHRASES.length; d = 400; } setTimeout(tick, d); })(); })();
$('#toTop').onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
document.addEventListener('DOMContentLoaded', () => {
  AOS.init({ duration: 800, once: true, offset: 60 }); splitText(); countdown(); updateCounts(); loadHome();
  $$('img[src*="unsplash"]').forEach(i => i.onerror = () => i.style.visibility = 'hidden');
});
