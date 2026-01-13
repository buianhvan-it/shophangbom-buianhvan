const API_URL = '/api/bomb-items';
let isAdmin = false;
let currentItems = [];
let uploadedImages = []; // Array of base64 strings

// DOM Elements
const promoGrid = document.getElementById('promotion-grid');
const newArrivalsGrid = document.getElementById('new-arrivals-grid');
const allProductsGrid = document.getElementById('product-grid');

const form = document.getElementById('add-item-form');
const adminPanel = document.getElementById('admin-panel');
const adminToggleBtn = document.getElementById('admin-toggle-btn');
const imageInput = document.getElementById('image-input');
const previewContainer = document.getElementById('preview-container');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const editIdInput = document.getElementById('edit-id');

// Search Elements
const searchCriteria = document.getElementById('search-criteria');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

// Modal Elements
const modal = document.getElementById('product-modal');
const closeModalBtn = document.querySelector('.close-modal');

// Initial Load
fetchItems();

// Search Listener
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('input', () => {
    // Optional: Real-time search for 'name' only, or wait for enter
    if (searchCriteria.value === 'name') performSearch(); // Live search for name
});
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Update input placeholder based on criteria
searchCriteria.addEventListener('change', () => {
    const val = searchCriteria.value;
    searchInput.value = '';
    if (val === 'name') searchInput.placeholder = 'Nhập tên sản phẩm...';
    if (val === 'price') searchInput.placeholder = 'Nhập khoảng giá (VD: 100000-200000)...';
    if (val === 'date') searchInput.placeholder = 'Nhập ngày (DD/MM/YYYY)...';
    performSearch(); // Reset to all if empty
});

function performSearch() {
    const criteria = searchCriteria.value;
    const term = searchInput.value.trim().toLowerCase();

    // If empty, show all sections, hide search results if we made a separate section
    // Here we will filter the "All Products" grid mainly, or all grids.
    // Simpler approach: If searching, hide "New Arrivals" & "Promotions" containers, 
    // and show results in "All Products" (renamed to "Kết quả tìm kiếm").

    if (!term) {
        // Reset view
        document.getElementById('all-products-section').querySelector('h2').textContent = 'TẤT CẢ SẢN PHẨM';
        document.getElementById('new-arrivals-section').classList.remove('hidden');
        document.getElementById('promotion-section').classList.remove('hidden');
        renderAllSections();
        return;
    }

    // Filter Logic
    let filtered = currentItems.filter(item => {
        if (criteria === 'name') {
            return item.description.toLowerCase().includes(term);
        }
        if (criteria === 'price') {
            // Handle range "min-max" or single value (approximate or max?)
            // Let's support "min-max"
            const parts = term.split('-');
            if (parts.length === 2) {
                const min = parseInt(parts[0]);
                const max = parseInt(parts[1]);
                if (!isNaN(min) && !isNaN(max)) {
                    return item.price >= min && item.price <= max;
                }
            }
            // If single number, search exact match or close text match? 
            // Better: treats as max price? Or exact. Let's do loose matching on string for simplicity if not range,
            // OR finding items around that price.
            // Let's implement >= logic or exact.
            const p = parseInt(term);
            if (!isNaN(p)) return item.price === p;
            return false;
        }
        if (criteria === 'date') {
            // term expected dd/mm/yyyy
            const dateObj = new Date(item.dateAdded);
            const dateStr = dateObj.toLocaleDateString('vi-VN'); // d/m/yyyy or dd/mm/yyyy depends on browser
            // To be safe, compare parts or simple includes
            return dateStr.includes(term);
        }
        return true;
    });

    // Valid search active
    document.getElementById('new-arrivals-section').classList.add('hidden');
    document.getElementById('promotion-section').classList.add('hidden');
    const allSection = document.getElementById('all-products-section');
    allSection.querySelector('h2').textContent = `KẾT QUẢ TÌM KIẾM (${filtered.length})`;
    renderGrid(allProductsGrid, filtered);
}

// Admin Toggle

// Admin Toggle
// Admin Toggle Logic (Controlled by AuthManager mostly)
// We just need to handle the click if the button is visible
if (adminToggleBtn) {
    adminToggleBtn.addEventListener('click', () => {
        isAdmin = !isAdmin;
        if (isAdmin) {
            adminPanel.classList.remove('hidden');
            document.body.classList.add('admin-mode');
            adminToggleBtn.textContent = 'Thoát Admin';
            fetchOrders(); // Load orders
        } else {
            adminPanel.classList.add('hidden');
            document.body.classList.remove('admin-mode');
            adminToggleBtn.textContent = 'Chế độ Admin';
            resetForm();
        }
        // Re-render to show/hide edit/delete buttons
        renderAllSections();
    });
}

// Ensure AuthManager runs initially to set button visibility
// document.addEventListener('DOMContentLoaded') in auth.js handles checking user
// But we might need to hide admin panel if logging out
// This is handled by AuthManager.updateHeader();

// --- Fix for Quick Cart Button ---
// Make sure this is globally available
window.addToCartQuick = (event, id) => {
    event.stopPropagation();
    event.preventDefault(); // Added preventDefault just in case

    // Debugging
    console.log('Adding to cart quick:', id);

    const item = currentItems.find(i => i.id === id);
    if (item) {
        if (typeof CartManager !== 'undefined') {
            CartManager.addToCart(item);
        } else {
            console.error('CartManager is not defined!');
            alert('Lỗi: Không thể thêm vào giỏ hàng. Vui lòng tải lại trang.');
        }
    } else {
        console.error('Item not found:', id);
    }
};

// Image Upload Handling (Multiple)
imageInput.addEventListener('change', function () {
    if (this.files) {
        Array.from(this.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function (e) {
                uploadedImages.push(e.target.result);
                renderImagePreviews();
            };
            reader.readAsDataURL(file);
        });
    }
});

function renderImagePreviews() {
    previewContainer.innerHTML = '';
    uploadedImages.forEach((imgSrc, index) => {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.onclick = () => {
            if (confirm('Xóa ảnh này?')) {
                uploadedImages.splice(index, 1);
                renderImagePreviews();
            }
        };
        previewContainer.appendChild(img);
    });
}

// Form Submit (Add/Edit)
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = editIdInput.value;
    const isEdit = !!id;
    const originalPriceVal = document.getElementById('original-price-input').value;

    const data = {
        description: document.getElementById('desc-input').value,
        price: parseInt(document.getElementById('price-input').value),
        originalPrice: originalPriceVal ? parseInt(originalPriceVal) : null,
        images: uploadedImages
    };

    try {
        let url = API_URL;
        let method = 'POST';

        if (isEdit) {
            url = `${API_URL}/${id}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert(isEdit ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
            resetForm();
            fetchItems();
        } else {
            const errData = await res.json();
            alert('Lỗi Server: ' + (errData.error || res.statusText));
            console.error('Server Error:', errData);
        }
    } catch (err) {
        console.error(err);
        alert('Lỗi kết nối!');
    }
});

// Cancel Edit
cancelBtn.addEventListener('click', resetForm);

// Functions
async function fetchItems() {
    try {
        const res = await fetch(`${API_URL}?t=${Date.now()}`);
        const data = await res.json();
        currentItems = data;
        renderAllSections();
    } catch (err) {
        console.error(err);
    }
}

function renderAllSections() {
    // 1. All Products (Sorted by date DESC)
    const sortedItems = [...currentItems].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    renderGrid(allProductsGrid, sortedItems);

    // 2. New Arrivals (Top 20)
    const newItems = sortedItems.slice(0, 20);
    renderGrid(newArrivalsGrid, newItems);

    // 3. Promotions (Original Price > Price)
    const promoItems = sortedItems.filter(i => i.originalPrice && i.originalPrice > i.price);
    renderGrid(promoGrid, promoItems);

    // Hide promo section if empty
    document.getElementById('promotion-section').style.display = promoItems.length > 0 ? 'block' : 'none';
}

function renderGrid(container, items) {
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<p style="text-align:center;width:100%;">Không có sản phẩm nào.</p>';
        return;
    }

    items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'product-item';
        el.onclick = (e) => {
            // Prevent triggering modal if clicking admin buttons
            if (e.target.closest('.item-actions')) return;
            openModal(item);
        };

        // Handle images
        let mainImage = 'https://via.placeholder.com/300x400?text=No+Image';
        if (item.images && item.images.length > 0) mainImage = item.images[0];
        else if (item.image) mainImage = item.image; // Legacy support

        // Calculate discount
        let discountHtml = '';
        let originalPriceHtml = '';
        if (item.originalPrice && item.originalPrice > item.price) {
            const percent = Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100);
            discountHtml = `<div class="discount-badge">-${percent}%</div>`;
            originalPriceHtml = `<span class="original-price">${formatCurrency(item.originalPrice)}</span>`;
        }

        const priceFormatted = formatCurrency(item.price);
        const dateFormatted = new Date(item.dateAdded).toLocaleDateString('vi-VN');

        el.innerHTML = `
            <div class="product-image">
                ${discountHtml}
                <img src="${mainImage}" alt="Product">
                
                <div class="quick-cart-btn" onclick="addToCartQuick(event, '${item.id}')" title="Thêm vào giỏ">
                    <i class="fas fa-cart-plus"></i>
                </div>

                <div class="item-actions">
                    <button class="edit-btn" onclick="startEdit('${item.id}')"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="deleteItem('${item.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="product-info">
                <div class="product-desc" title="${item.description}">${item.description}</div>
                <div class="price-container">
                    <span class="product-price">${priceFormatted}</span>
                    ${originalPriceHtml}
                </div>
                <div class="product-meta">
                    <span><i class="fas fa-eye"></i> ${item.visits || 0}</span>
                    <span>${dateFormatted}</span>
                </div>
            </div>
        `;
        container.appendChild(el);
    });
}


function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Global functions for inline event handles
window.startEdit = (id) => {
    const item = currentItems.find(i => i.id === id);
    if (!item) return;

    document.getElementById('desc-input').value = item.description;
    document.getElementById('price-input').value = item.price;
    document.getElementById('original-price-input').value = item.originalPrice || '';

    // Load images
    uploadedImages = [];
    if (item.images && item.images.length > 0) {
        uploadedImages = [...item.images];
    } else if (item.image) {
        uploadedImages = [item.image];
    }
    renderImagePreviews();

    editIdInput.value = item.id;

    submitBtn.textContent = 'Cập nhật';
    cancelBtn.classList.remove('hidden');

    adminPanel.scrollIntoView({ behavior: 'smooth' });
};

window.deleteItem = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchItems();
        } else {
            alert('Xóa thất bại');
        }
    } catch (err) {
        alert('Lỗi kết nối');
    }
};

function resetForm() {
    form.reset();
    uploadedImages = [];
    renderImagePreviews();
    editIdInput.value = '';
    submitBtn.textContent = 'Thêm hàng mới';
    cancelBtn.classList.add('hidden');
}

// Modal Logic (Replaced by Product Page Redirect)
// --- Admin Order Management ---

async function fetchOrders() {
    if (!isAdmin) return;

    const container = document.getElementById('admin-orders-list');
    container.innerHTML = '<p>Đang tải đơn hàng...</p>';

    try {
        const res = await fetch('/api/orders?t=' + Date.now());
        const orders = await res.json();

        if (orders.length === 0) {
            container.innerHTML = '<p>Chưa có đơn hàng nào.</p>';
            return;
        }

        renderOrders(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
        container.innerHTML = '<p style="color:red">Lỗi tải danh sách đơn hàng!</p>';
    }
}

function renderOrders(orders) {
    const container = document.getElementById('admin-orders-list');
    container.innerHTML = '';

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.innerHTML = `
        <thead>
            <tr style="background: #333; color: white;">
                <th style="padding: 10px;">ID</th>
                <th style="padding: 10px;">Ngày đặt</th>
                <th style="padding: 10px;">Khách hàng</th>
                <th style="padding: 10px;">Sản phẩm</th>
                <th style="padding: 10px;">Tổng tiền</th>
                <th style="padding: 10px;">Trạng thái</th>
                <th style="padding: 10px;">Hành động</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    orders.forEach(order => {
        const date = new Date(order.date).toLocaleString('vi-VN');
        const itemsList = order.items.map(i => `- ${i.description} (x${i.quantity})`).join('<br>');
        const total = formatCurrency(order.totalAmount);

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #ddd';
        tr.innerHTML = `
            <td style="padding: 10px;">#${order.id.slice(-6)}</td>
            <td style="padding: 10px;">${date}</td>
            <td style="padding: 10px;">
                <strong>${order.customer.name}</strong><br>
                ${order.customer.phone}<br>
                ${order.customer.address}
            </td>
            <td style="padding: 10px;">${itemsList}</td>
            <td style="padding: 10px; font-weight: bold; color: #d0011b;">${total}</td>
            <td style="padding: 10px;">
                <span class="status-badge ${order.status}">${getStatusLabel(order.status)}</span>
            </td>
            <td style="padding: 10px;">
                <select onchange="updateOrderStatus('${order.id}', this.value)" style="padding: 5px;">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Chờ xử lý</option>
                    <option value="shipping" ${order.status === 'shipping' ? 'selected' : ''}>Đang giao</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Đã giao</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Đã hủy</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });

    container.appendChild(table);
}

function getStatusLabel(status) {
    const labels = {
        pending: 'Chờ xử lý',
        shipping: 'Đang giao',
        completed: 'Hoàn thành',
        cancelled: 'Đã hủy'
    };
    return labels[status] || status;
}

window.updateOrderStatus = async (id, newStatus) => {
    if (!confirm('Cập nhật trạng thái đơn hàng này?')) {
        fetchOrders(); // Revert UI if cancelled
        return;
    }

    try {
        const res = await fetch(`/api/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            alert('Cập nhật thành công!');
            fetchOrders();
        } else {
            const err = await res.json();
            alert('Lỗi: ' + err.error);
        }
    } catch (error) {
        console.error(error);
        alert('Lỗi kết nối!');
    }
};

// Deprecated Modal code kept for reference or removal
// Determine images
/*
let images = [];
if (item.images && item.images.length > 0) images = item.images;
else if (item.image) images = [item.image];
else images = ['https://via.placeholder.com/300x400?text=No+Image'];

// Fill Info
document.getElementById('modal-main-image').src = images[0];
document.getElementById('modal-title').textContent = 'Chi tiết sản phẩm'; // Or use truncated desc
document.getElementById('modal-description').textContent = item.description;

document.getElementById('modal-price').textContent = formatCurrency(item.price);

const orgPriceEl = document.getElementById('modal-original-price');
const discountEl = document.getElementById('modal-discount');

if (item.originalPrice && item.originalPrice > item.price) {
    orgPriceEl.textContent = formatCurrency(item.originalPrice);
    orgPriceEl.classList.remove('hidden');

    const percent = Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100);
    discountEl.textContent = `-${percent}%`;
    discountEl.classList.remove('hidden');
} else {
    orgPriceEl.classList.add('hidden');
    discountEl.classList.add('hidden');
}

document.getElementById('modal-views').textContent = (item.visits || 0) + 1; // Anticipate the view count increment
document.getElementById('modal-date').textContent = new Date(item.dateAdded).toLocaleDateString('vi-VN');

// Render Thumbnails
const thumbsContainer = document.getElementById('modal-thumbnails');
thumbsContainer.innerHTML = '';
images.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.onclick = () => {
        document.getElementById('modal-main-image').src = src;
        // active state
        Array.from(thumbsContainer.children).forEach(c => c.classList.remove('active'));
        img.classList.add('active');
    };
    thumbsContainer.appendChild(img);
});
// Set first as active
thumbsContainer.children[0].classList.add('active');

// Show Modal
modal.classList.remove('hidden');

// Increment visit (API call)
if (!isAdmin) {
    fetch(`${API_URL}/${item.id}`);
}
*/

// Close Modal
closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
});

window.addEventListener('click', (e) => {
    if (e.target == modal) {
        modal.classList.add('hidden');
    }
});
