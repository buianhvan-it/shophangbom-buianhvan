const CART_KEY = 'shop_cart';

const CartManager = {
    getCart() {
        const cartJson = localStorage.getItem(CART_KEY);
        return cartJson ? JSON.parse(cartJson) : [];
    },

    addToCart(product) {
        const cart = this.getCart();
        const existing = cart.find(item => item.id === product.id);

        if (existing) {
            alert('Sản phẩm này đã có trong giỏ hàng!');
            return;
        }

        // Add minimal info
        cart.push({
            id: product.id,
            description: product.description,
            price: product.price,
            image: (product.images && product.images[0]) || product.image || '',
            originalPrice: product.originalPrice
        });

        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        this.updateBadge();
        alert('Đã thêm vào giỏ hàng!');
    },

    removeFromCart(id) {
        let cart = this.getCart();
        cart = cart.filter(item => item.id !== id);
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        this.updateBadge();
        return cart;
    },

    clearCart() {
        localStorage.removeItem(CART_KEY);
        this.updateBadge();
    },

    updateBadge() {
        const cart = this.getCart();
        const count = cart.length;
        const badges = document.querySelectorAll('.cart-badge');
        badges.forEach(b => {
            b.textContent = count;
            b.style.display = count > 0 ? 'flex' : 'none';
        });
    }
};

// Auto update on load
document.addEventListener('DOMContentLoaded', () => {
    CartManager.updateBadge();
});
