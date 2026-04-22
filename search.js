// Global Search UX

document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.getElementById('nav-search-btn');
  const searchOverlay = document.getElementById('search-overlay');
  const searchClose = document.getElementById('search-close');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  if (searchBtn && searchOverlay) {
    let searchProducts = [];

    searchBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      searchOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => searchInput.focus(), 100);
      
      // We rely on fetchProducts being available globally from api.js
      if (searchProducts.length === 0 && typeof fetchProducts === 'function') {
        searchProducts = await fetchProducts();
      }
    });

    searchClose.addEventListener('click', () => {
      searchOverlay.classList.remove('open');
      document.body.style.overflow = '';
      searchInput.value = '';
      searchResults.innerHTML = '';
    });

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (q.length < 1) {
        searchResults.innerHTML = '';
        return;
      }
      
      const matches = searchProducts.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) || 
        (p.brand && p.brand.toLowerCase().includes(q)) || 
        (p.category && p.category.toLowerCase().includes(q))
      ).slice(0, 16);

      if (matches.length === 0) {
        searchResults.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #757575; font-size: 0.85rem;">NO MATCHES FOUND</div>';
      } else {
        searchResults.innerHTML = matches.map(p => {
          const priceRender = p.salePrice ? `<span style="text-decoration: line-through; color: #999; margin-right: 5px;">$${p.price}</span><span style="color: red;">$${p.salePrice}</span>` : `$${p.price}`;
          return `
            <a href="product.html?id=${p.id}" class="search-result-item">
              <img src="${p.image}" alt="${p.brand} ${p.name}">
              <div class="search-result-item__info">
                <div class="search-result-item__brand">${p.brand}</div>
                <div class="search-result-item__name">${p.name}</div>
                <div class="search-result-item__price">${priceRender}</div>
              </div>
            </a>
          `;
        }).join('');
      }
    });
  }
});
