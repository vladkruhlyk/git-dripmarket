// WooCommerce REST API
const WC_URL = 'https://cms.dripmarketua.store';
const WC_KEY = '';
const WC_SECRET = '';

// Fetch products from WooCommerce
async function fetchProducts() {
  try {
    let allProducts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `${WC_URL}/wp-json/wc/v3/products?per_page=100&page=${page}&consumer_key=${WC_KEY}&consumer_secret=${WC_SECRET}`
      );
      const data = await res.json();
      allProducts = allProducts.concat(data);
      if (data.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allProducts.map(p => {
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
        : `https://via.placeholder.com/600x800.webp?text=${encodeURIComponent(p.name)}`;
      const imgArray = p.images && p.images.length > 0
        ? p.images.map(img => img.src)
        : [imgUrl];

      // Category (not brand!)
      const categoriesText = p.categories ? p.categories.map(c => c.name.toLowerCase()).join(' ') : 'sneakers';
      const category = p.categories && p.categories.length > 0 ? p.categories[0].name : 'Sneakers';

      // Sizes — from attribute named "Size" (pa_size or custom)
      const sizeAttr = p.attributes && p.attributes.find(a =>
        a.name.toLowerCase() === 'size' || a.name.toLowerCase() === 'розмір'
      );
      
      let defaultSizes = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];
      if (categoriesText.includes('heels') || categoriesText.includes('каблук') || categoriesText.includes('туфлі')) {
        defaultSizes = [35, 36, 37, 38, 39, 40, 41];
      } else if (categoriesText.includes('accessories') || categoriesText.includes('bags') || categoriesText.includes('сумк') || categoriesText.includes('аксесуар')) {
        defaultSizes = ['One Size'];
      } else if (categoriesText.includes('clothes') || categoriesText.includes('одяг')) {
        defaultSizes = ['XS', 'S', 'M', 'L', 'XL'];
      }

      let sizes = sizeAttr ? sizeAttr.options : defaultSizes;
      // Sanitize sizes: remove erroneously mapped IDs like "248", "190", etc.
      sizes = sizes.filter(s => isNaN(s) || Number(s) <= 50);

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
