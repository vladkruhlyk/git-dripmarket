document.addEventListener('DOMContentLoaded', async () => {
  // ── Fetch products ──
  let products = [];
  try {
    products = await fetchProducts();
  } catch (e) {
    console.error('Failed to fetch products:', e);
  }

  // ── Hide loader ──
  const loader = document.getElementById('loader');
  if (loader) {
    if (!sessionStorage.getItem('drip_loader_played')) {
      loader.classList.add('loader--hidden');
      setTimeout(() => { loader.style.display = 'none'; loader.remove(); }, 500);
      sessionStorage.setItem('drip_loader_played', 'true');
    } else {
      loader.style.display = 'none';
      loader.remove();
    }
  }
  document.body.classList.add('loaded');

  // ── Render product card ──
  function renderCard(p) {
    const priceHtml = p.salePrice
      ? `<span class="product-card__price product-card__price--old">₴${p.price.toLocaleString('en-US')}</span>
         <span class="product-card__price product-card__price--sale">₴${p.salePrice.toLocaleString('en-US')}</span>`
      : `<span class="product-card__price">₴${p.price.toLocaleString('en-US')}</span>`;

    return `
      <div class="product-card">
        <a href="product.html?id=${p.id}" class="product-card__image">
          <img src="${p.image}" alt="${p.brand} ${p.name}" loading="lazy">
        </a>
        <a href="product.html?id=${p.id}" class="product-card__info">
          <span class="product-card__brand">${p.brand}</span>
          <span class="product-card__name">${p.name}</span>
          <div class="product-card__prices">${priceHtml}</div>
        </a>
      </div>`;
  }

  // ── WHAT'S NEW — Brand Tabs ──
  const tabsContainer = document.getElementById('whatsnew-tabs');
  const grid = document.getElementById('whatsnew-grid');

  if (tabsContainer && grid && products.length) {
    // Get unique brands (top brands with most products, max 5)
    const brandCounts = {};
    products.forEach(p => {
      if (p.brand) {
        brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      }
    });

    const topBrands = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand]) => brand);

    // Render tabs
    tabsContainer.innerHTML = topBrands.map((brand, i) =>
      `<button class="hp-whatsnew__tab${i === 0 ? ' active' : ''}" data-brand="${brand}">${brand}</button>`
    ).join('');

    // Show products for a brand
    function showBrand(brand) {
      const filtered = products.filter(p => p.brand === brand).slice(0, 4);
      grid.innerHTML = filtered.map(renderCard).join('');
    }

    // Initial render
    if (topBrands.length) {
      showBrand(topBrands[0]);
    }

    // Tab click handler
    tabsContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.hp-whatsnew__tab');
      if (!tab) return;

      // Update active state
      tabsContainer.querySelectorAll('.hp-whatsnew__tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Show products
      showBrand(tab.dataset.brand);
    });
  }

  // ── Cart count ──
  const cart = JSON.parse(localStorage.getItem('drip_cart') || '[]');
  const cartCount = document.getElementById('cart-count');
  if (cartCount) cartCount.textContent = cart.length;

  // ── Search overlay ──
  const searchBtn = document.getElementById('nav-search-btn');
  const searchOverlay = document.getElementById('search-overlay');
  const searchClose = document.getElementById('search-close');
  if (searchBtn && searchOverlay) {
    searchBtn.addEventListener('click', e => {
      e.preventDefault();
      searchOverlay.classList.add('open');
      document.getElementById('search-input')?.focus();
    });
  }
  if (searchClose && searchOverlay) {
    searchClose.addEventListener('click', () => {
      searchOverlay.classList.remove('open');
    });
  }

  // ── Header Scroll Effect ──
  const heroHeader = document.querySelector('.header--hero');
  if (heroHeader) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        heroHeader.classList.add('scrolled');
      } else {
        heroHeader.classList.remove('scrolled');
      }
    });
  }

  // ── Page Transitions ──
  document.querySelectorAll('a').forEach(link => {
    if (link.hostname === window.location.hostname && link.target !== '_blank' && !link.href.includes('#')) {
      link.addEventListener('click', e => {
        e.preventDefault();
        document.body.style.opacity = '0';
        setTimeout(() => {
          window.location.href = link.href;
        }, 400);
      });
    }
  });
});
