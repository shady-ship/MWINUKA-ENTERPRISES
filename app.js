const defaultProducts = [
  { name: 'Coca-Cola 500ml', sku: 'BEV-024', category: 'Beverages', quantity: 248, reorder: 50, icon: '◉' },
  { name: 'Azam Energy Drink', sku: 'BEV-018', category: 'Beverages', quantity: 24, reorder: 50, icon: '◒' },
  { name: 'Samsung 55" TV', sku: 'ELC-009', category: 'Electronics', quantity: 12, reorder: 10, icon: '▣' },
  { name: 'Sunlight Dishwashing', sku: 'HOU-031', category: 'Household', quantity: 8, reorder: 20, icon: '✦' },
  { name: 'Golden Penny Flour 2kg', sku: 'FOD-012', category: 'Food', quantity: 0, reorder: 15, icon: '◆' },
  { name: 'Kilimanjaro Water 1.5L', sku: 'BEV-041', category: 'Beverages', quantity: 86, reorder: 30, icon: '◌' }
];
let products = JSON.parse(localStorage.getItem('mwinuka-enterprise-products') || 'null') || defaultProducts;
const $ = (selector) => document.querySelector(selector);
const lowStock = (product) => product.quantity <= product.reorder;
const apiAvailable = window.location.protocol !== 'file:';
const loginSessionKey = 'mwinuka-enterprise-auth';

function isAuthenticated() {
  return sessionStorage.getItem(loginSessionKey) === 'true' || localStorage.getItem(loginSessionKey) === 'true';
}

function updateAuthenticationView() {
  document.body.classList.toggle('is-authenticated', isAuthenticated());
}

function openResetModal() {
  $('#resetModal').hidden = false;
  $('#resetEmail').focus();
}

function closeResetModal() {
  $('#resetModal').hidden = true;
  $('#resetForm').reset();
  $('#resetMessage').hidden = true;
}

function handleLogin(event) {
  event.preventDefault();
  const email = $('#loginEmail').value.trim().toLowerCase();
  const password = $('#loginPassword').value;
  const valid = email === 'shadrackmwinuka002@gmail.com' && password === 'SHADy002**';
  $('#loginError').hidden = valid;
  if (!valid) return;
  const storage = $('#rememberMe').checked ? localStorage : sessionStorage;
  storage.setItem(loginSessionKey, 'true');
  $('#loginForm').reset();
  updateAuthenticationView();
}

$('#loginForm').addEventListener('submit', handleLogin);
$('#forgotPasswordLink').addEventListener('click', (event) => {
  event.preventDefault();
  openResetModal();
});
$('#closeResetModal').addEventListener('click', closeResetModal);
$('#cancelReset').addEventListener('click', closeResetModal);
$('#resetModal').addEventListener('click', (event) => {
  if (event.target === $('#resetModal')) closeResetModal();
});
$('#resetForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#resetMessage');
  if (!apiAvailable) {
    message.textContent = 'Password reset emails are available when the system is hosted through XAMPP or remote PHP hosting.';
    message.hidden = false;
    return;
  }
  const response = await fetch('api/password-reset.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: $('#resetEmail').value.trim() })
  });
  const result = await response.json();
  message.textContent = result.message || result.error || 'Unable to request a reset link.';
  message.hidden = false;
  if (response.ok) message.classList.add('reset-success');
});
$('#togglePassword').addEventListener('click', () => {
  const passwordInput = $('#loginPassword');
  const visible = passwordInput.type === 'text';
  passwordInput.type = visible ? 'password' : 'text';
  $('#togglePassword').textContent = visible ? 'Show' : 'Hide';
});
$('#logoutButton').addEventListener('click', () => {
  sessionStorage.removeItem(loginSessionKey);
  localStorage.removeItem(loginSessionKey);
  updateAuthenticationView();
});
updateAuthenticationView();

async function loadProducts() {
  if (!apiAvailable) {
    render();
    return;
  }

  const response = await fetch('api/products.php');
  if (!response.ok) throw new Error('Unable to load products from the database.');
  products = await response.json();
  render();
}

function statusFor(product) {
  if (product.quantity === 0) return ['Out of stock', 'out-stock'];
  if (lowStock(product)) return ['Low stock', 'low-stock'];
  return ['In stock', 'in-stock'];
}

function render() {
  const query = $('#searchInput').value.toLowerCase();
  const filtered = products.filter((product) => {
    const matchesQuery = `${product.name} ${product.sku}`.toLowerCase().includes(query);
    return matchesQuery;
  });
  $('#inventoryBody').innerHTML = filtered.map((product) => {
    const [label, className] = statusFor(product);
    return `<tr><td><div class="product-cell"><span class="product-image">${product.icon || '□'}</span>${product.name}</div></td><td>${product.sku}</td><td><strong>${product.quantity}</strong> units</td><td><span class="status ${className}">${label}</span></td><td><button class="row-menu" aria-label="More options">•••</button></td></tr>`;
  }).join('');
  const attention = products.filter(lowStock);
  $('#lowStockList').innerHTML = attention.slice(0, 4).map((product) => `<div class="low-stock-item"><span class="product-image">${product.icon || '□'}</span><div><strong>${product.name}</strong><small>${product.sku}</small></div><span class="stock-remaining">${product.quantity} left</span></div>`).join('') || '<p class="subheading">All products are well stocked.</p>';
  $('#totalProducts').textContent = products.length;
  $('#inventoryBadge').textContent = products.length;
  $('#lowStockCount').textContent = attention.length;
  $('#alertCount').textContent = attention.length;
  $('#tableCount').textContent = `Showing ${Math.min(filtered.length, 6)} of ${products.length} products`;
}

function openModal() { $('#productModal').hidden = false; $('#productForm').elements.name.focus(); }
function closeModal() { $('#productModal').hidden = true; $('#productForm').reset(); }

$('#searchInput').addEventListener('input', render);
$('#addProductButton').addEventListener('click', openModal);
$('#closeModal').addEventListener('click', closeModal);
$('#cancelModal').addEventListener('click', closeModal);
$('#productModal').addEventListener('click', (event) => { if (event.target === $('#productModal')) closeModal(); });
$('#productForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const product = { name: form.get('name'), sku: form.get('sku'), quantity: Number(form.get('quantity')), reorder: Number(form.get('reorder')), icon: '□' };
  if (apiAvailable) {
    const response = await fetch('api/products.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(product) });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Unable to save product.');
    }
    await loadProducts();
  } else {
    products.unshift(product);
    localStorage.setItem('mwinuka-enterprise-products', JSON.stringify(products));
    render();
  }
  closeModal();
});
loadProducts().catch((error) => {
  console.error(error);
  render();
});
