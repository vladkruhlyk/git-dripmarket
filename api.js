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
      // Price — WooCommerce gives sale_price or regular_price
      const price = parseFloat(p.regular_price) || parseFloat(p.price) || 0;
      const salePrice = p.sale_price ? parseFloat(p.sale_price) : null;

      // Images
      const imgUrl = p.images && p.images.length > 0
        ? p.images[0].src
        : `https://via.placeholder.com/600x800.png?text=${encodeURIComponent(p.name)}`;
      const imgArray = p.images && p.images.length > 0
        ? p.images.map(img => img.src)
        : [imgUrl];

      // Sizes — stored as a WooCommerce attribute named "Size"
      const sizeAttr = p.attributes && p.attributes.find(a => a.name.toLowerCase() === 'size');
      const sizes = sizeAttr ? sizeAttr.options : [39, 40, 41, 42, 43];

      // Brand — stored as attribute "Brand" or from categories
      const brandAttr = p.attributes && p.attributes.find(a => a.name.toLowerCase() === 'brand');
      const brand = brandAttr ? brandAttr.options[0] : (p.categories && p.categories[0] ? p.categories[0].name : 'DRIP.');

      // Color
      const colorAttr = p.attributes && p.attributes.find(a => a.name.toLowerCase() === 'color');
      const color = colorAttr ? colorAttr.options[0].toLowerCase() : 'black';

      // Category
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
        description: p.short_description.replace(/<[^>]*>/g, '') || p.description.replace(/<[^>]*>/g, ''),
        image: imgUrl,
        images: imgArray
      };
    });
  } catch (err) {
    console.error('Failed to fetch from WooCommerce:', err);
    return [];
  }
}
