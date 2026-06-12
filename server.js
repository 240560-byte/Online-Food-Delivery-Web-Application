require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('Error: MONGO_URI environment variable is missing.');
    process.exit(1);
}

// Global variables for DB and collections
let db, restaurants, orders;

// Middleware
app.use(express.json());

// Connect to MongoDB Atlas
const client = new MongoClient(MONGO_URI);

async function initializeDatabase() {
    try {
        await client.connect();
        console.log('Connected successfully to MongoDB Atlas');
        
        db = client.db('foodDeliveryDb');
        restaurants = db.collection('restaurants');
        orders = db.collection('orders');

        // Start server only after a successful DB connection
        app.listen(PORT, () => {
            console.log(`Food Delivery backend active on port ${PORT}`);
        });
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}

// --- REST API ENDPOINTS ---

// 1. Browse all restaurants
app.get('/api/restaurants', async (req, res) => {
    try {
        const list = await restaurants.find({}).toArray();
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch restaurants' });
    }
});

// 2. Place a food order
app.post('/api/orders', async (req, res) => {
    try {
        const { customerName, items, totalAmount, restaurantId } = req.body;
        
        const newOrder = {
            customerName,
            restaurantId,
            items, // Array of food items
            totalAmount,
            status: 'Pending', // Default tracking state
            createdAt: new Date()
        };

        const result = await orders.insertOne(newOrder);
        res.status(201).json({ message: 'Order placed successfully', orderId: result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// 3. Track order delivery status
app.get('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await orders.findOne({ _id: new ObjectId(orderId) });
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ orderId: order._id, status: order.status });
    } catch (err) {
        res.status(500).json({ error: 'Invalid order ID or tracking failed' });
    }
});

// Initialize app
initializeDatabase();
