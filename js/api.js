const API = 'https://dummyjson.com/products';
const FASHION = ['womens-dresses','mens-shirts','womens-shoes','womens-bags','tops','mens-shoes','womens-jewellery','sunglasses'];
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status}). Please try again.`);
  return res.json();
}
const Api = {
  async all() {
    const parts = await Promise.all(FASHION.map(c => getJSON(`${API}/category/${c}?limit=10`)));
    return parts.flatMap(p => p.products);
  },
  async byCategory(c) { return (await getJSON(`${API}/category/${c}?limit=30`)).products; },
  async search(q) {
    const r = await getJSON(`${API}/search?q=${encodeURIComponent(q)}&limit=100`);
    return r.products.filter(p => FASHION.includes(p.category));
  },
  one(id) { return getJSON(`${API}/${id}`); }
};
