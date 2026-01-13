const cartList = document.getElementById('cart-list');
const cartTotalLite = document.getElementById('cart-total-lite');
const checkoutSubtotal = document.getElementById('checkout-subtotal');
const checkoutTotal = document.getElementById('checkout-total');

const payCod = document.getElementById('pay-cod');
const payBanking = document.getElementById('pay-banking');
const codWarning = document.getElementById('cod-warning');
const checkoutForm = document.getElementById('checkout-form');

// Render on load
renderCartPage();

function renderCartPage() {
    const cart = CartManager.getCart();
    cartList.innerHTML = '';

    if (cart.length === 0) {
        cartList.innerHTML = '<p class="empty-cart">Giỏ hàng của bạn đang trống.</p>';
        updateTotals(0);
        return;
    }

    let total = 0;

    cart.forEach(item => {
        total += item.price;

        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <img src="${item.image || 'https://via.placeholder.com/100'}" alt="Item">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.description}</div>
                <div class="cart-item-price">${formatCurrency(item.price)}</div>
            </div>
            <button class="remove-btn" onclick="removeItem('${item.id}')"><i class="fas fa-trash"></i></button>
        `;
        cartList.appendChild(el);
    });

    updateTotals(total);
}

function updateTotals(total) {
    const formatted = formatCurrency(total);
    cartTotalLite.textContent = formatted;
    checkoutSubtotal.textContent = formatted;
    checkoutTotal.textContent = formatted;

    // COD Logic
    if (total < 500000) {
        payCod.disabled = true;
        payBanking.checked = true;
        codWarning.classList.remove('hidden');
        payCod.parentElement.classList.add('disabled-option');
    } else {
        payCod.disabled = false;
        codWarning.classList.add('hidden');
        payCod.parentElement.classList.remove('disabled-option');
    }
}

function removeItem(id) {
    if (confirm('Xóa sản phẩm này khỏi giỏ?')) {
        CartManager.removeFromCart(id);
        renderCartPage();
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Checkout
checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cart = CartManager.getCart();
    if (cart.length === 0) {
        alert('Giỏ hàng trống!');
        return;
    }

    const customer = {
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        address: document.getElementById('cust-address').value
    };

    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    // Calculate total again to be safe
    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

    const orderData = {
        customer,
        items: cart,
        totalAmount,
        paymentMethod
    };

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const json = await res.json();

        if (json.success) {
            alert('Đặt hàng thành công! Mã đơn: ' + json.orderId);
            CartManager.clearCart();
            window.location.href = 'index.html'; // Or success page
        } else {
            alert('Đặt hàng thất bại: ' + json.error);
        }

    } catch (err) {
        alert('Lỗi kết nối server!');
    }
});
