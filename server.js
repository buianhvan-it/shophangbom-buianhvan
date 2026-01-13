import express from 'express';
import { JSONFilePreset } from 'lowdb/node';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;

// Setup LowDB
const defaultData = { videos: {}, bombItems: [], orders: [], users: [] };
const db = await JSONFilePreset('db.json', defaultData);

// Seed Admin User
await db.read();
if (!db.data.users.find(u => u.username === 'buianhvan')) {
    db.data.users.push({
        username: 'buianhvan',
        password: '123', // In demo we store plain text. In prod use hash!
        role: 'admin',
        name: 'Bùi Anh Văn'
    });
    await db.write();
    console.log('Admin user seeded: buianhvan');
}

app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ... (existing video APIs)

// --- Auth APIs ---

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    await db.read();
    const user = db.data.users.find(u => u.username === username && u.password === password);

    if (user) {
        // Return user info sans password
        const { password, ...userInfo } = user;
        res.json({ success: true, user: userInfo });
    } else {
        res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu!' });
    }
});

// Register (Customer only)
app.post('/api/auth/register', async (req, res) => {
    const { username, password, name } = req.body;
    if (!username || !password || !name) {
        return res.status(400).json({ error: 'Thiếu thông tin!' });
    }

    await db.read();
    if (db.data.users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại!' });
    }

    const newUser = {
        username,
        password,
        name,
        role: 'customer' // Force customer role
    };

    db.data.users.push(newUser);
    await db.write();

    res.json({ success: true, message: 'Đăng ký thành công!' });
});

// --- Order APIs ---

// Create new order
app.post('/api/orders', express.json(), async (req, res) => {
    const { customer, items, totalAmount, paymentMethod } = req.body;

    if (!customer || !items || !totalAmount) {
        return res.status(400).json({ error: 'Missing order info' });
    }

    await db.read();
    db.data.orders = db.data.orders || [];

    const newOrder = {
        id: Date.now().toString(),
        customer,
        items, // Array of { id, description, price, quantity }
        totalAmount,
        paymentMethod, // 'cod' or 'banking'
        status: 'pending',
        date: new Date().toISOString()
    };

    db.data.orders.push(newOrder);
    await db.write();

    res.json({ success: true, orderId: newOrder.id });
});

// Get all orders (Admin)
app.get('/api/orders', async (req, res) => {
    await db.read();
    // In a real app, verify admin token here
    const sortedOrders = (db.data.orders || []).sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(sortedOrders);
});

// Update order status (Admin)
app.patch('/api/orders/:id', express.json(), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    await db.read();
    const order = db.data.orders.find(o => o.id === id);

    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    await db.write();

    res.json({ success: true, order });
});

// Get all items
app.get('/api/bomb-items', async (req, res) => {
    await db.read();
    res.json(db.data.bombItems || []);
});

// Add Item
app.post('/api/bomb-items', async (req, res) => {
    try {
        console.log('Received Add Item request');
        const newItem = req.body;
        if (!newItem.id) newItem.id = Date.now().toString();
        newItem.dateAdded = new Date().toISOString();

        await db.read();
        db.data.bombItems.push(newItem);
        await db.write();

        console.log('Item added successfully:', newItem.id);
        res.json({ success: true, item: newItem });
    } catch (error) {
        console.error('Error adding item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update Item
app.put('/api/bomb-items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        await db.read();
        const itemIndex = db.data.bombItems.findIndex(i => i.id === id);

        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Merge updates
        db.data.bombItems[itemIndex] = { ...db.data.bombItems[itemIndex], ...updates };
        await db.write();

        res.json({ success: true, item: db.data.bombItems[itemIndex] });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete Item
app.delete('/api/bomb-items/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await db.read();
        const initialLength = db.data.bombItems.length;
        db.data.bombItems = db.data.bombItems.filter(i => i.id !== id);

        if (db.data.bombItems.length === initialLength) {
            return res.status(404).json({ error: 'Item not found' });
        }

        await db.write();
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});