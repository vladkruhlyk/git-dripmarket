// WooCommerce REST API
const WC_URL = 'https://cms.dripmarketua.store';
const WC_KEY = 'ck_2b44e1b5d46fd688c45a484203b8a1647f79a179';
const WC_SECRET = 'cs_2008054adf876788a88ab725f6c56f650c2b7c03';

// Fetch products from WooCommerce
async function fetchProducts() {
  try {
    const res = await fetch(
      `${WC_URL}/wp-json/wc/v3/products?per_page=100&consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`
    );
    const data = await res.json();

    return data.map(p => {
      // Price — for variable products parse price_html which contains both prices
      let price = 0;
      let salePrice = null;
      if (p.price_html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(p.price_html, 'text/html');
        const del = doc.querySelector('del .amount, del bdi');
        const ins = doc.querySelector('ins .amount, ins bdi');
        if (del && ins) {
          price = parseFloat(del.textContent.replace(/[^0-9.]/g, ''));
          salePrice = parseFloat(ins.textContent.replace(/[^0-9.]/g, ''));
        } else {
          price = parseFloat(p.price) || 0;
        }
      } else {
        price = parseFloat(p.price) || parseFloat(p.regular_price) || 0;
        salePrice = p.on_sale && p.sale_price ? parseFloat(p.sale_price) : null;
      }

      // Images
      const imgUrl = p.images && p.images.length > 0
        ? p.images[0].src
        : `https://via.placeholder.com/600x800.png?text=${encodeURIComponent(p.name)}`;
      const imgArray = p.images && p.images.length > 0
        ? p.images.map(img => img.src)
        : [imgUrl];

      // Sizes — from attribute named "Size" (pa_size or custom)
      const sizeAttr = p.attributes && p.attributes.find(a =>
        a.name.toLowerCase() === 'size' || a.name.toLowerCase() === 'розмір'
      );
      const sizes = sizeAttr ? sizeAttr.options : [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];

      // Brand — from WooCommerce Brands plugin (brands taxonomy) or attribute
      let brand = 'DRIP.';
      if (p.brands && p.brands.length > 0) {
        brand = p.brands[0].name;
      } else {
        const brandAttr = p.attributes && p.attributes.find(a => a.name.toLowerCase() === 'brand');
        if (brandAttr) brand = brandAttr.options[0];
      }

      // Color
      const colorAttr = p.attributes && p.attributes.find(a =>
        a.name.toLowerCase() === 'color' || a.name.toLowerCase() === 'колір'
      );
      const color = colorAttr ? colorAttr.options[0].toLowerCase() : 'black';

      // Category (not brand!)
      const category = p.categories && p.categories.length > 0 ? p.categories[0].name : 'Sneakers';

      return {
        id: String(p.id),
        brand: brand,
        name: p.name,
        price: price,
        salePrice: salePrice,
        color: color,
        sizes: sizes,
        isNew: p.tags && p.tags.some(t => t.name.toLowerCase() === 'new'),
        category: category,
        gender: 'Unisex',
        description: (p.short_description || p.description || '').replace(/<[^>]*>/g, ''),
        image: imgUrl,
        images: imgArray
      };
    });
  } catch (err) {
    console.error('Failed to fetch from WooCommerce:', err);
    return [];
  }
}
