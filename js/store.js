const LS = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
function slim(p) { return { id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail, rating: p.rating, discountPercentage: p.discountPercentage, category: p.category }; }
const Store = {
  cart: LS.get('stk_cart', []), wish: LS.get('stk_wish', []), orders: LS.get('stk_orders', []), coupon: LS.get('stk_coupon', ''),
  save() { LS.set('stk_cart', this.cart); LS.set('stk_wish', this.wish); LS.set('stk_orders', this.orders); LS.set('stk_coupon', this.coupon); },
  inWish(id) { return this.wish.some(p => p.id === id); },
  toggleWish(p) { this.inWish(p.id) ? this.wish = this.wish.filter(x => x.id !== p.id) : this.wish.push(slim(p)); this.save(); },
  add(p, n = 1) { const i = this.cart.find(x => x.id === p.id); i ? i.qty += n : this.cart.push({ ...slim(p), qty: n }); this.save(); },
  qty(id, d) { const i = this.cart.find(x => x.id === id); if (!i) return; i.qty += d; if (i.qty < 1) this.remove(id); this.save(); },
  remove(id) { this.cart = this.cart.filter(x => x.id !== id); this.save(); }
};
