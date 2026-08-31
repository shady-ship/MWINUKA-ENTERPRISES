const loginSessionKey = 'mwinuka-enterprise-auth';
let products = [];
let orders = [];
let orderItems = [];

// Authentication
function isAuthenticated() {
  return sessionStorage.getItem(loginSessionKey) === 'true' || localStorage.getItem(loginSessionKey) === 'true';
}

function updateAuthenticationView() {
  document.body.classList.toggle('is-authenticated', isAuthenticated());
}

// Utility functions
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const apiAvailable = window.location.protocol !== 'file:';

// Login and Authentication
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
  loadOrdersData();
}

$('#loginForm')?.addEventListener('submit', handleLogin);
$('#togglePassword')?.addEventListener('click', () => {
  const passwordInput = $('#loginPassword');
  const visible = passwordInput.type === 'text';
  passwordInput.type = visible ? 'password' : 'text';
  $('#togglePassword').textContent = visible ? 'Show' : 'Hide';
});

$('#logoutButton')?.addEventListener('click', () => {
  sessionStorage.removeItem(loginSessionKey);
  localStorage.removeItem(loginSessionKey);
  updateAuthenticationView();
});

updateAuthenticationView();

// Load products
async function loadProducts() {
  if (!apiAvailable) {
    products = [
      { id: 1, name: 'softacare S80', sku: 'dipper-001', quantity: 200, reorder: 50 },
      { id: 2, name: 'softacare M72', sku: 'dipper-002', quantity: 400, reorder: 50 },
      { id: 3, name: 'softacare L64', sku: 'dipper-003', quantity: 500, reorder: 30 },
      { id: 4, name: 'softacare S48', sku: 'dipper-004', quantity: 100, reorder: 50 },
      { id: 5, name: 'softacare M42', sku: 'dipper-005', quantity: 200, reorder: 50 },
      { id: 6, name: 'softacare L40', sku: 'dipper-006', quantity: 300, reorder: 30 },
      { id: 7, name: 'softacare S14', sku: 'dipper-007', quantity: 200, reorder: 20 },
      { id: 8, name: 'softacare M12', sku: 'dipper-008', quantity: 400, reorder: 20 },
      { id: 9, name: 'softacare L10', sku: 'dipper-009', quantity: 800, reorder: 30 }

    ];
    return;
  }

  try {
    const response = await fetch('api/products.php');
    if (!response.ok) throw new Error('Failed to load products');
    products = await response.json();
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

// Load orders
async function loadOrders() {
  if (!apiAvailable) {
    orders = JSON.parse(localStorage.getItem('orders') || '[]');
    return;
  }

  try {
    const response = await fetch('api/orders.php');
    if (!response.ok) throw new Error('Failed to load orders');
    orders = await response.json();
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

// Load all data
async function loadOrdersData() {
  await Promise.all([loadProducts(), loadOrders()]);
  renderDashboard();
  updateProductSelects();
}

// Render dashboard
function renderDashboard() {
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const lowStockCount = products.filter(p => p.quantity <= p.reorder).length;

  $('#totalOrders').textContent = orders.length;
  $('#completedOrders').textContent = completedCount;
  $('#pendingOrders').textContent = pendingCount;
  $('#lowInventoryCount').textContent = lowStockCount;
  $('#lowStockAlertCount').textContent = lowStockCount;

  renderOrdersTable();
  renderInventoryMonitor();
  renderActivityFeed();
}

// Render orders table
function renderOrdersTable() {
  const query = $('#searchOrders')?.value.toLowerCase() || '';
  const statusFilter = $('#filterStatus')?.value || '';

  let filtered = orders.filter(order => {
    const matchesQuery = `${order.order_number} ${order.customer_name}`.toLowerCase().includes(query);
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  $('#ordersBody').innerHTML = filtered.map(order => {
    const statusClass = `status-${order.status}`;
    const date = new Date(order.created_at).toLocaleDateString();
    return `<tr>
      <td><strong>${order.order_number}</strong></td>
      <td>${order.customer_name}</td>
      <td>${order.item_count || 0} items</td>
      <td>TZS ${order.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td><span class="status ${statusClass}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></td>
      <td>${date}</td>
      <td><button class="row-menu" aria-label="More options" data-order-id="${order.id}">•••</button></td>
    </tr>`;
  }).join('');

  $('#orderCount').textContent = `Showing ${filtered.length} of ${orders.length} orders`;
}

// Render inventory monitor
function renderInventoryMonitor() {
  const lowStock = products.filter(p => p.quantity <= p.reorder).slice(0, 4);
  $('#inventoryMonitor').innerHTML = lowStock.length > 0
    ? lowStock.map(p => `<div class="inventory-item">
        <span class="item-icon">${p.icon || '□'}</span>
        <div><strong>${p.name}</strong><small>${p.sku}</small></div>
        <span class="stock-level">${p.quantity}/${p.reorder}</span>
      </div>`).join('')
    : '<p class="subheading">All products are well stocked.</p>';
}

// Render activity feed
function renderActivityFeed() {
  const recentOrders = orders.slice(0, 3);
  const activity = recentOrders.map(o => ({
    type: 'order',
    title: 'Order placed',
    description: `${o.customer_name} ordered ${o.item_count || 0} items`,
    time: new Date(o.created_at)
  })).sort((a, b) => b.time - a.time);

  $('#activityList').innerHTML = activity.length > 0
    ? activity.map(a => `<div class="activity-item">
        <span class="activity-dot purple"></span>
        <div>
          <strong>${a.title}</strong>
          <p>${a.description}</p>
          <small>${formatTimeAgo(a.time)}</small>
        </div>
      </div>`).join('')
    : '<p class="subheading">No recent activity</p>';
}

// Format time ago
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// Update product selects
function updateProductSelects() {
  $$('.product-select').forEach(select => {
    select.innerHTML = '<option value="">Select product...</option>' +
      products.map(p => `<option value="${p.id}" data-stock="${p.quantity}" data-reorder="${p.reorder}">${p.name} (${p.quantity} in stock)</option>`).join('');
  });
}

// Modal management
function openOrderModal() {
  orderItems = [];
  addOrderItem();
  $('#orderModal').hidden = false;
  $('#customerName').focus();
}

function closeOrderModal() {
  $('#orderModal').hidden = false;
  $('#orderForm').reset();
}

$('#newOrderButton')?.addEventListener('click', openOrderModal);
$('#closeOrderModal')?.addEventListener('click', closeOrderModal);
$('#cancelOrder')?.addEventListener('click', closeOrderModal);
$('#orderModal')?.addEventListener('click', (event) => {
  if (event.target === $('#orderModal')) closeOrderModal();
});

// Order items management
function addOrderItem() {
  const template = $('#itemTemplate').innerHTML;
  const newItem = document.createElement('div');
  newItem.innerHTML = template;
  const itemDiv = newItem.querySelector('.order-item');
  
  $('#orderItems').appendChild(itemDiv);

  const productSelect = itemDiv.querySelector('.product-select');
  const quantityInput = itemDiv.querySelector('.quantity-input');
  const priceInput = itemDiv.querySelector('.price-input');
  const removeBtn = itemDiv.querySelector('.remove-item-btn');
  const stockInfo = itemDiv.querySelector('.stock-info');
  const subtotalInfo = itemDiv.querySelector('.subtotal-info');

  // Update price based on product selection
  productSelect.addEventListener('change', (e) => {
    const product = products.find(p => p.id == e.target.value);
    if (product) {
      priceInput.value = '0.00';
      stockInfo.textContent = `Stock: ${product.quantity} units`;
      if (product.quantity === 0) {
        stockInfo.classList.add('out-of-stock');
        quantityInput.disabled = true;
      } else if (product.quantity <= product.reorder) {
        stockInfo.classList.add('low-stock');
        quantityInput.disabled = false;
      } else {
        stockInfo.classList.remove('out-of-stock', 'low-stock');
        quantityInput.disabled = false;
      }
    }
    updateOrderSummary();
  });

  quantityInput.addEventListener('change', updateOrderSummary);
  priceInput.addEventListener('change', updateOrderSummary);
  removeBtn.addEventListener('click', () => {
    itemDiv.parentElement.removeChild(itemDiv);
    updateOrderSummary();
  });
}

$('#addItemButton')?.addEventListener('click', (e) => {
  e.preventDefault();
  addOrderItem();
  updateProductSelects();
});

// Update order summary
function updateOrderSummary() {
  let subtotal = 0;
  let totalItems = 0;

  $$('.order-item').forEach(item => {
    const quantity = parseInt(item.querySelector('.quantity-input').value) || 0;
    const price = parseFloat(item.querySelector('.price-input').value) || 0;
    const itemTotal = quantity * price;
    subtotal += itemTotal;
    totalItems += quantity;

    const subtotalInfo = item.querySelector('.subtotal-info');
    subtotalInfo.textContent = `Subtotal: TZS ${itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  });

  $('#subtotal').textContent = `TZS ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  $('#totalItems').textContent = totalItems;
  $('#totalAmount').textContent = `TZS ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Submit order
$('#orderForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const items = $$('.order-item').map(item => ({
    product_id: parseInt(item.querySelector('.product-select').value),
    quantity: parseInt(item.querySelector('.quantity-input').value),
    unit_price: parseFloat(item.querySelector('.price-input').value)
  }));

  const orderData = {
    customer_name: $('#customerName').value,
    customer_phone: $('#customerPhone').value,
    customer_email: $('#customerEmail').value,
    items: items,
    notes: $('#orderNotes').value
  };

  if (!apiAvailable) {
    const order = {
      id: orders.length + 1,
      order_number: `ORD-${Date.now()}`,
      ...orderData,
      status: 'pending',
      created_at: new Date().toISOString(),
      item_count: items.length,
      total_amount: items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0)
    };
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    renderDashboard();
    closeOrderModal();
    alert('Order created successfully!');
    return;
  }

  try {
    const response = await fetch('api/orders.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create order');
    }

    const result = await response.json();
    alert(`Order created successfully: ${result.order_number}`);
    closeOrderModal();
    await loadOrdersData();
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
});

// Event listeners for search and filter
$('#searchOrders')?.addEventListener('input', renderOrdersTable);
$('#filterStatus')?.addEventListener('change', renderOrdersTable);
$('#viewInventoryButton')?.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Initialize
if (isAuthenticated()) {
  loadOrdersData();
} else {
  document.body.classList.remove('is-authenticated');
}
