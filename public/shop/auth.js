const AuthManager = {
    getUser() {
        const u = localStorage.getItem('shop_user');
        return u ? JSON.parse(u) : null;
    },

    setUser(user) {
        localStorage.setItem('shop_user', JSON.stringify(user));
        this.updateHeader();
    },

    logout() {
        localStorage.removeItem('shop_user');
        window.location.href = 'index.html';
    },

    updateHeader() {
        const user = this.getUser();
        const actionsContainer = document.querySelector('.user-actions') || document.querySelector('.top-bar .container');

        // Remove old auth text if any
        const oldAuth = document.getElementById('auth-display');
        if (oldAuth) oldAuth.remove();

        const authDiv = document.createElement('div');
        authDiv.id = 'auth-display';
        authDiv.style.display = 'inline-flex';
        authDiv.style.alignItems = 'center';
        authDiv.style.gap = '10px';
        authDiv.style.color = '#fff';
        authDiv.style.marginLeft = '15px';

        if (user) {
            authDiv.innerHTML = `
                <span>Xin chào, <strong>${user.name || user.username}</strong></span>
                <a href="#" onclick="AuthManager.logout(); return false;" style="color: #ccc; font-size: 12px;">(Đăng xuất)</a>
            `;

            // Show Admin button if admin
            const adminBtn = document.getElementById('admin-toggle-btn');
            if (adminBtn) {
                if (user.role === 'admin') {
                    adminBtn.style.display = 'inline-block';
                } else {
                    adminBtn.style.display = 'none';
                }
            }
        } else {
            authDiv.innerHTML = `
                <a href="login.html" style="color: white; font-weight: bold;">Đăng nhập</a>
                <span style="color: #777;">|</span>
                <a href="register.html" style="color: white;">Đăng ký</a>
            `;

            // Hide Admin button
            const adminBtn = document.getElementById('admin-toggle-btn');
            if (adminBtn) adminBtn.style.display = 'none';
        }

        // Append to container
        if (actionsContainer) {
            // Find where to append. Ideally before cart or at end.
            actionsContainer.appendChild(authDiv);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AuthManager.updateHeader();
});
