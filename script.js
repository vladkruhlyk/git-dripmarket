/* ==========================================
   DRIP. — Catalog Logic (SSENSE-style)
   ========================================== */

const state = {
  filters: { brands: [], category: 'all', gender: 'all', sale: false },
  sort: 'newest',
  cart: JSON.parse(localStorage.getItem('drip_cart') || '[]')
};

// --- Loader ---
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  
  if (!sessionStorage.getItem('drip_loader_played')) {
    setTimeout(() => {
      if (loader) {
        loader.classList.add('loader--hidden');
        loader.addEventListener('transitionend', () => {
          loader.remove();
          document.body.classList.add('loaded');
        });
      }
      sessionStorage.setItem('drip_loader_played', 'true');
    }, 2600);
  } else {
    if (loader) {
      loader.style.display = 'none';
      loader.remove();
    }
    document.body.classList.add('loaded');
  }
  updateCartCount();
});
let PRODUCTS = []; // Array to store Strapi data

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  PRODUCTS = await fetchProducts();

  buildFilters();
  renderProducts();
  bindEvents();
});

// --- Build Filters ---
function buildFilters() {
  // Categories
  const categories = [...new Set(PRODUCTS.map(p => p.category).filter(Boolean))].sort();
  const categoryContainer = document.getElementById('category-filters');
  categoryContainer.innerHTML =
    `<button class="filter-link active" data-category="all">All</button>` +
    categories.map(cat =>
      `<button class="filter-link" data-category="${cat}">${cat}</button>`
    ).join('');

  // Brands
  const brands = [...new Set(PRODUCTS.map(p => p.brand))].sort();
  const brandContainer = document.getElementById('brand-filters');
  brandContainer.innerHTML = brands.map(brand =>
    `<button class="filter-link" data-brand="${brand}">${brand}</button>`
  ).join('');
}

// --- Render ---
function renderProducts() {
  let filtered = [...PRODUCTS];

  if (state.filters.gender !== 'all') {
    filtered = filtered.filter(p => p.gender === state.filters.gender || p.gender === 'Unisex');
  }
  if (state.filters.sale) {
    filtered = filtered.filter(p => p.salePrice);
  }
  if (state.filters.category && state.filters.category !== 'all') {
    filtered = filtered.filter(p => p.category === state.filters.category);
  }
  if (state.filters.brands.length) {
    filtered = filtered.filter(p => state.filters.brands.includes(p.brand));
  }


  switch (state.sort) {
    case 'price-asc': filtered.sort((a, b) => a.price - b.price); break;
    case 'price-desc': filtered.sort((a, b) => b.price - a.price); break;
    case 'newest': filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
  }

  const grid = document.getElementById('product-grid');
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="product-grid--empty">No products found</div>';
  } else {
    grid.innerHTML = filtered.map((p, i) => `
      <div class="product-card" style="animation-delay: ${i * 0.04}s">
        <a href="product.html?id=${p.id}" class="product-card__image">
          <img src="${p.image}" alt="${p.brand} ${p.name}" loading="lazy">
          <button class="product-card__add-btn" onclick="event.preventDefault(); event.stopPropagation(); quickAdd('${p.id}')">Add to cart</button>
        </a>
        <a href="product.html?id=${p.id}" class="product-card__info">
          <span class="product-card__brand">${p.brand}</span>
          <span class="product-card__name">${p.name}</span>
          ${p.salePrice ? `<span class="product-card__price" style="text-decoration: line-through; color: #999; margin-right: 5px;">$${p.price}</span><span class="product-card__price" style="color: red;">$${p.salePrice}</span>` : `<span class="product-card__price">$${p.price}</span>`}
        </a>
      </div>
    `).join('');
  }
}

// --- Events ---
function bindEvents() {
  // Category filter
  document.getElementById('category-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    document.querySelectorAll('#category-filters .filter-link').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.filters.category = btn.dataset.category;
    renderProducts();
  });

  // Brand filter (text links — toggle active)
  document.getElementById('brand-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-brand]');
    if (!btn) return;
    const brand = btn.dataset.brand;
    btn.classList.toggle('active');
    if (state.filters.brands.includes(brand)) {
      state.filters.brands = state.filters.brands.filter(b => b !== brand);
    } else {
      state.filters.brands.push(brand);
    }
    renderProducts();
  });

  // Sort
  document.querySelectorAll('.sort-link').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-link').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.sort = btn.dataset.sort;
      renderProducts();
    });
  });

  // Header navigation links for Gender and Sale
  document.querySelectorAll('[data-header-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = btn.dataset.headerFilter;
      
      // Reset all states and UI classes first
      document.querySelectorAll('[data-header-filter]').forEach(b => b.classList.remove('active', 'header__nav-link--active'));
      
      if (filter === 'Sale') {
        if (state.filters.sale) {
          state.filters.sale = false;
        } else {
          state.filters.sale = true;
          state.filters.gender = 'all'; // mutual exclusion
          btn.classList.add('active', 'header__nav-link--active');
        }
      } else {
        if (state.filters.gender === filter) {
          state.filters.gender = 'all';
        } else {
          state.filters.gender = filter;
          state.filters.sale = false; // mutual exclusion
          btn.classList.add('active', 'header__nav-link--active');
        }
      }
      renderProducts();
    });
  });

  // Mobile controls
  const filtersPanel = document.getElementById('filters-panel');
  const sortPanel = document.getElementById('sort-panel');
  const mFilters = document.getElementById('mobile-filters-btn');
  const mSort = document.getElementById('mobile-sort-btn');

  if (mFilters) {
    mFilters.addEventListener('click', () => {
      filtersPanel.classList.toggle('open');
      sortPanel.classList.remove('open');
      mFilters.classList.toggle('active');
      mSort.classList.remove('active');
    });
  }
  if (mSort) {
    mSort.addEventListener('click', () => {
      sortPanel.classList.toggle('open');
      filtersPanel.classList.remove('open');
      mSort.classList.toggle('active');
      mFilters.classList.remove('active');
    });
  }
}

// --- Cart ---
function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = state.cart.length;
}

function addToCart(productId, size) {
  state.cart.push({ productId, size, addedAt: Date.now() });
  localStorage.setItem('drip_cart', JSON.stringify(state.cart));
  updateCartCount();
  showToast('Added to bag');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

let pendingProductId = null;
let pendingSize = null;

function quickAdd(productId) {
  const product = PRODUCTS.find(p => String(p.id) === String(productId));
  if (!product) return;

  pendingProductId = productId;
  pendingSize = null;

  // Fill modal product info
  document.getElementById('size-modal-product').innerHTML = `
    <img class="size-modal__product-img" src="${product.image}" alt="${product.brand} ${product.name}">
    <div class="size-modal__product-info">
      <div class="size-modal__product-brand">${product.brand}</div>
      <div class="size-modal__product-name">${product.name}</div>
      <div class="size-modal__product-price">${product.salePrice ? `<span style="text-decoration:line-through;color:#999;margin-right:5px">$${product.price}</span><span style="color:red">$${product.salePrice}</span>` : `$${product.price}`}</div>
    </div>`;

  // If One Size — skip modal and add directly
  if (product.sizes && product.sizes.length === 1 && product.sizes[0] === 'One Size') {
    state.cart.push({ productId, size: 'One Size', addedAt: Date.now() });
    localStorage.setItem('drip_cart', JSON.stringify(state.cart));
    updateCartCount();
    showToast(`${product.name} added to bag`);
    return;
  }

  // Fill sizes
  document.getElementById('size-modal-sizes').innerHTML = product.sizes
    .map(s => `<button class="size-modal__size-btn" data-size="${s}" onclick="selectModalSize('${s}')">${s}</button>`)
    .join('');

  // Reset button
  const addBtn = document.getElementById('size-modal-add');
  addBtn.disabled = true;
  addBtn.textContent = 'Select a size';

  // Open modal
  document.getElementById('size-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function selectModalSize(size) {
  pendingSize = size;
  document.querySelectorAll('.size-modal__size-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector(`.size-modal__size-btn[data-size="${size}"]`).classList.add('selected');
  const addBtn = document.getElementById('size-modal-add');
  addBtn.disabled = false;
  addBtn.textContent = size === 'One Size' ? 'Add to bag' : `Add to bag — Size ${size}`;
}

function confirmAddToCart() {
  if (!pendingProductId || !pendingSize) return;
  const product = PRODUCTS.find(p => String(p.id) === String(pendingProductId));
  state.cart.push({ productId: pendingProductId, size: pendingSize, addedAt: Date.now() });
  localStorage.setItem('drip_cart', JSON.stringify(state.cart));
  updateCartCount();
  closeSizeModal();
  showToast(`${product.name} (Size ${pendingSize}) added to bag`);
  pendingProductId = null;
  pendingSize = null;
}

function closeSizeModal() {
  document.getElementById('size-modal').classList.remove('open');
  document.body.style.overflow = '';
}
