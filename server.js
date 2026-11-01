const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { scrapeBinaAz } = require('./scraper');
const { checkAllPrices } = require('./priceChecker');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 1. Scrape endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Link daxil edilməyib' });
    }
    const data = await scrapeBinaAz(url);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Məlumat çəkilərkən xəta baş verdi' });
  }
});

// 2. Properties CRUD
app.get('/api/properties', (req, res) => {
  try {
    const properties = db.getProperties();
    res.json({ success: true, data: properties });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/properties', (req, res) => {
  try {
    const propertyData = req.body;
    if (!propertyData.id) {
      propertyData.id = 'prop_' + Date.now();
    }
    if (!Array.isArray(propertyData.competitors)) {
      propertyData.competitors = [];
    }
    const saved = db.saveProperty(propertyData);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/properties/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.getPropertyById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Əmlak tapılmadı' });
    }
    const updated = db.saveProperty({ ...existing, ...req.body, id });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/properties/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.deleteProperty(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Price checker endpoint
app.post('/api/check-prices', async (req, res) => {
  try {
    const result = await checkAllPrices();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Notifications
app.get('/api/notifications', (req, res) => {
  try {
    const notifs = db.getNotifications();
    const unreadCount = notifs.filter(n => !n.read).length;
    res.json({ success: true, data: notifs, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notifications/read', (req, res) => {
  try {
    const notifs = db.markNotificationsRead();
    res.json({ success: true, data: notifs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notifications/clear', (req, res) => {
  try {
    db.clearNotifications();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Auto price check every 20 minutes (1200000 ms)
const CHECK_INTERVAL_MS = 20 * 60 * 1000;
setInterval(() => {
  console.log('[Server Cron] Dövri qiymət yoxlaması başladı...');
  checkAllPrices().catch(e => console.error('[Server Cron Error]:', e));
}, CHECK_INTERVAL_MS);

// 5. Settings API
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const saved = db.saveSettings(req.body);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Public Client Property API (Strips owner details & competitor info)
app.get('/api/public/property/:id', (req, res) => {
  try {
    const prop = db.getPropertyById(req.params.id);
    if (!prop) {
      return res.status(404).json({ success: false, error: 'Əmlak tapılmadı' });
    }
    const settings = db.getSettings();
    const publicData = {
      id: prop.id,
      title: prop.title,
      price: prop.price,
      currency: prop.currency || 'AZN',
      buildingType: prop.buildingType,
      rooms: prop.rooms,
      area: prop.area,
      floor: prop.floor,
      floors: prop.floors,
      location: prop.location,
      hasBillOfSale: prop.hasBillOfSale,
      hasRepair: prop.hasRepair,
      mainPhoto: prop.mainPhoto,
      photos: prop.photos || (prop.mainPhoto ? [prop.mainPhoto] : []),
      description: prop.description || '',
      broker: {
        agencyName: settings.agencyName || 'Propix',
        brokerName: settings.brokerName || 'Emlakçı',
        phone: settings.brokerPhone || '+994 50 123 45 67',
        whatsapp: settings.brokerWhatsapp || '+994 50 123 45 67',
        email: settings.brokerEmail || '',
        description: settings.description || ''
      }
    };
    res.json({ success: true, data: publicData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Client-facing public page routes
app.get(['/ev/:id', '/elan/:id'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'client.html'));
});

// Catch-all route to serve index.html for SPA feel
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`   Əmlak Köməkçisi uğurla işə düşdü!               `);
  console.log(`   Veb sayta daxil olun: http://localhost:${PORT}   `);
  console.log(`====================================================`);
});
