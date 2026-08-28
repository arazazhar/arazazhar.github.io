require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// --- BULUT BAĞLANTILARI ---

// 1. MongoDB Veritabanı Bağlantısı
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB bulut veritabanına bağlanıldı.'))
    .catch(err => console.error('MongoDB Bağlantı Hatası:', err));

// Dinamik Veri Şeması (db.json yerine geçecek esnek yapı)
const SiteData = mongoose.model('SiteData', new mongoose.Schema({
    settings: Object, hero: Object, about: Object, tracks: Array, visuals: Object, contact: Object
}, { strict: false }));

// 2. Cloudinary Görsel Depolama Bağlantısı
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'araz-azhar-web' }
});
const upload = multer({ storage: storage });

// --- GÜVENLİK & MIDDLEWARE ---
app.use(session({ secret: 'araz_azhar_secret_key', resave: false, saveUninitialized: true, cookie: { secure: false } }));
const ADMIN_USER = process.env.ADMIN_USER || 'admin'; 
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- VERİTABANI YARDIMCI FONKSİYONLARI ---
const readDB = async () => {
    let data = await SiteData.findOne();
    if (!data) {
        // Veritabanı boşsa varsayılan şablonu oluştur
        data = new SiteData({ settings:{theme:'dark'}, hero: {}, about: {}, tracks: [], visuals: { videos: [], photos: [] }, contact: { socials: {} } });
        await data.save();
    }
    const dataObj = data.toObject();
    delete dataObj._id; delete dataObj.__v; // Güvenlik için mongo id'lerini gizle
    return dataObj;
};

const writeDB = async (newData) => {
    try {
        await SiteData.findOneAndUpdate({}, newData, { upsert: true, new: true });
        return true;
    } catch (e) { return false; }
};

// Bakım Modu Kontrolü
app.use(async (req, res, next) => {
    if (req.path.startsWith('/admin') || req.path.startsWith('/api')) return next();
    try {
        const db = await readDB();
        if (db.settings && db.settings.maintenanceMode) {
            return res.sendFile(path.join(__dirname, 'public', 'maintenance.html'));
        }
    } catch(e) {}
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// --- API ROTASI ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isAuthenticated = true; res.json({ success: true });
    } else { res.status(401).json({ success: false, message: 'Hatalı giriş' }); }
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/check-auth', (req, res) => { res.json({ authenticated: true }); });
app.get('/api/data', async (req, res) => { res.json(await readDB()); });

// Yeni Bulut Görsel Yükleme Rotası
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Cloudinary bize doğrudan güvenli bulut URL'sini verir
    res.json({ success: true, url: req.file.path });
});

app.post('/api/settings', async (req, res) => {
    try {
        const db = await readDB();
        const { section, data } = req.body;
        if (!db[section]) db[section] = {};
        db[section] = { ...db[section], ...data };
        if (await writeDB(db)) res.json({ success: true });
        else res.status(500).json({ success: false, error: 'Yazma hatası' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/tracks', async (req, res) => {
    try {
        const db = await readDB();
        const trackData = req.body;
        if (!db.tracks) db.tracks = [];
        if (trackData.id && trackData.id !== "") {
            const index = db.tracks.findIndex(t => t.id === trackData.id);
            if (index !== -1) db.tracks[index] = { ...db.tracks[index], ...trackData };
        } else {
            trackData.id = Date.now().toString();
            trackData.order = db.tracks.length + 1;
            db.tracks.push(trackData);
        }
        if (await writeDB(db)) res.json({ success: true });
        else res.status(500).json({ success: false });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/tracks/:id', async (req, res) => {
    const db = await readDB(); 
    db.tracks = db.tracks.filter(t => t.id !== req.params.id); 
    await writeDB(db); 
    res.json({ success: true });
});

app.post('/api/tracks/reorder', async (req, res) => {
    const db = await readDB(); 
    const { orderedIds } = req.body;
    if (orderedIds && db.tracks) {
        const newTracks = [];
        orderedIds.forEach((id, index) => {
            const track = db.tracks.find(t => t.id === id);
            if (track) { track.order = index; newTracks.push(track); }
        });
        db.tracks = newTracks; await writeDB(db);
    }
    res.json({ success: true });
});

app.post('/api/visuals/:type', async (req, res) => {
    const db = await readDB(); 
    const { type } = req.params; const item = req.body; item.id = Date.now().toString();
    if (!db.visuals) db.visuals = { videos: [], photos: [] };
    if (!db.visuals[type]) db.visuals[type] = [];
    db.visuals[type].push(item); await writeDB(db); res.json({ success: true });
});

app.delete('/api/visuals/:type/:id', async (req, res) => {
    const db = await readDB(); const { type, id } = req.params;
    if (db.visuals && db.visuals[type]) { db.visuals[type] = db.visuals[type].filter(item => item.id !== id); await writeDB(db); }
    res.json({ success: true });
});

app.post('/api/visuals/:type/reorder', async (req, res) => {
    const db = await readDB();
    const { type } = req.params;
    const { orderedIds } = req.body;
    if (orderedIds && db.visuals && db.visuals[type]) {
        const newItems = [];
        orderedIds.forEach((id, index) => {
            const item = db.visuals[type].find(i => i.id === id);
            if (item) { item.order = index; newItems.push(item); }
        });
        db.visuals[type] = newItems;
        await writeDB(db);
    }
    res.json({ success: true });
});

app.use((req, res) => { res.status(404).sendFile(path.join(__dirname, 'public', '404.html')); });

app.listen(PORT, () => { console.log(`Server running on http://localhost:${PORT}`); });