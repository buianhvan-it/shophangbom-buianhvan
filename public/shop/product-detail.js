const API_URL = '/api/bomb-items';

// Get ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

// Elements
const loadingEl = document.getElementById('loading');
const contentEl = document.getElementById('product-content');

// Detail Elements
const mainImage = document.getElementById('detail-main-image');
const thumbnailsContainer = document.getElementById('detail-thumbnails');
const titleEl = document.getElementById('detail-title');
const priceEl = document.getElementById('detail-price');
const originalPriceEl = document.getElementById('detail-original-price');
const badgeEl = document.getElementById('detail-discount-badge');
const viewsEl = document.getElementById('detail-views');
const dateEl = document.getElementById('detail-date');
const descEl = document.getElementById('detail-description-text');
const depositValEl = document.getElementById('deposit-value');

// Buttons
const btnDeposit = document.getElementById('btn-deposit');
const btnPickup = document.getElementById('btn-pickup');
const depositModal = document.getElementById('deposit-modal');
const modalDepositAmount = document.getElementById('modal-deposit-amount');

// Load Data
if (!productId) {
    loadingEl.textContent = 'Không tìm thấy sản phẩm.';
} else {
    fetchProduct(productId);
}

async function fetchProduct(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        if (!res.ok) throw new Error('Not found');
        const item = await res.json();
        renderProduct(item);
    } catch (err) {
        loadingEl.textContent = 'Sản phẩm không tồn tại hoặc đã bị xóa.';
    }
}

function renderProduct(item) {
    loadingEl.classList.add('hidden');
    contentEl.classList.remove('hidden');
    document.title = `${item.description.substring(0, 30)}... - Chi tiết`;

    // 1. Data binding
    titleEl.textContent = item.description; // Usually logic splits title/desc, but here used desc as title
    descEl.textContent = item.description;

    priceEl.textContent = formatCurrency(item.price);

    if (item.originalPrice && item.originalPrice > item.price) {
        originalPriceEl.textContent = formatCurrency(item.originalPrice);
        originalPriceEl.classList.remove('hidden');

        const percent = Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100);
        badgeEl.textContent = `-${percent}%`;
        badgeEl.classList.remove('hidden');
    }

    viewsEl.textContent = (item.visits || 0); // Already incremented by server on GET
    dateEl.textContent = new Date(item.dateAdded).toLocaleDateString('vi-VN');

    // 2. Images
    let images = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : ['https://via.placeholder.com/500']);

    mainImage.src = images[0];

    // Thumbnails
    thumbnailsContainer.innerHTML = '';
    images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.onclick = () => {
            mainImage.src = src;
            Array.from(thumbnailsContainer.children).forEach(c => c.classList.remove('active'));
            img.classList.add('active');
        };
        thumbnailsContainer.appendChild(img);
    });
    if (thumbnailsContainer.children[0]) thumbnailsContainer.children[0].classList.add('active');

    // 3. Deposit Calculation (20%)
    const depositAmount = item.price * 0.2;
    depositValEl.textContent = formatCurrency(depositAmount);

    // Events
    btnDeposit.onclick = () => {
        modalDepositAmount.textContent = formatCurrency(depositAmount);
        depositModal.classList.remove('hidden');
    };

    btnPickup.onclick = () => {
        alert('Địa chỉ shop: Số 123, Đường ABC...\n(Chức năng bản đồ sẽ cập nhật sau)');
    };

    document.getElementById('btn-add-to-cart').onclick = () => {
        CartManager.addToCart(item);
    };
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Close Modal
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.onclick = function () {
        this.closest('.modal').classList.add('hidden');
    }
});
window.onclick = function (event) {
    if (event.target == depositModal) {
        depositModal.classList.add('hidden');
    }
}
