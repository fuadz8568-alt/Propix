const db = require('./db');
const { scrapeBinaAz, extractItemId } = require('./scraper');

let isChecking = false;

async function checkAllPrices() {
  if (isChecking) {
    console.log('[PriceChecker] Hal-hazırda yoxlama aparılır...');
    return { status: 'busy', message: 'Yoxlama artıq icra edilir' };
  }

  isChecking = true;
  console.log('[PriceChecker] Qiymət və rəqib yoxlanışı başladı...');
  const properties = db.getProperties();
  const results = [];

  for (const prop of properties) {
    try {
      let propUpdated = false;

      // 1. Check main property price if it has a bina.az URL
      if (prop.mainBinaUrl) {
        try {
          const freshData = await scrapeBinaAz(prop.mainBinaUrl);
          if (freshData.success && freshData.price > 0) {
            const oldPrice = Number(prop.price) || 0;
            const newPrice = Number(freshData.price) || 0;

            if (oldPrice > 0 && oldPrice !== newPrice) {
              const diff = newPrice - oldPrice;
              const notifType = diff < 0 ? 'price_drop' : 'price_increase';
              const message = diff < 0
                ? `Qiymət endirildi! "${prop.title}" əmlakının qiyməti ${oldPrice.toLocaleString()} AZN-dən ${newPrice.toLocaleString()} AZN-ə düşdü.`
                : `Qiymət artırıldı! "${prop.title}" əmlakının qiyməti ${oldPrice.toLocaleString()} AZN-dən ${newPrice.toLocaleString()} AZN-ə qalxdı.`;

              db.addNotification({
                type: notifType,
                propertyId: prop.id,
                propertyTitle: prop.title,
                message: message,
                oldPrice: oldPrice,
                newPrice: newPrice,
                url: prop.mainBinaUrl
              });

              prop.price = newPrice;
              propUpdated = true;
              results.push({ propertyId: prop.id, type: 'main', oldPrice, newPrice });
            }
          }
        } catch (err) {
          console.warn(`[PriceChecker] Əsas elan xətası (${prop.title}):`, err.message);
        }
      }

      // 2. Check competitor links
      if (Array.isArray(prop.competitors) && prop.competitors.length > 0) {
        for (const comp of prop.competitors) {
          if (!comp.url) continue;
          try {
            const compData = await scrapeBinaAz(comp.url);
            if (compData.success) {
              const oldPrice = Number(comp.lastPrice) || 0;
              const newPrice = Number(compData.price) || 0;

              if (oldPrice > 0 && oldPrice !== newPrice) {
                const diff = newPrice - oldPrice;
                const message = diff < 0
                  ? `Rəqib qiymət endirdi! "${prop.title}" üçün rəqib (${comp.name || 'Digər makler'}) qiyməti ${oldPrice.toLocaleString()} AZN-dən ${newPrice.toLocaleString()} AZN-ə saldı!`
                  : `Rəqib qiyməti qaldırdı: "${prop.title}" üçün rəqib (${comp.name || 'Digər makler'}) qiyməti ${newPrice.toLocaleString()} AZN etdi.`;

                db.addNotification({
                  type: 'competitor_price_change',
                  propertyId: prop.id,
                  propertyTitle: prop.title,
                  competitorName: comp.name || 'Rəqib Makler',
                  message: message,
                  oldPrice: oldPrice,
                  newPrice: newPrice,
                  url: comp.url
                });

                comp.lastPrice = newPrice;
                propUpdated = true;
                results.push({ propertyId: prop.id, competitor: comp.name, oldPrice, newPrice });
              } else if (!comp.lastPrice && newPrice > 0) {
                comp.lastPrice = newPrice;
                propUpdated = true;
              }

              comp.lastChecked = new Date().toISOString();
              comp.status = compData.isExpired ? 'expired' : 'active';
            }
          } catch (compErr) {
            console.warn(`[PriceChecker] Rəqib link xətası (${comp.url}):`, compErr.message);
            if (compErr.message.includes('404') || compErr.message.includes('silinib')) {
              if (comp.status !== 'removed') {
                db.addNotification({
                  type: 'competitor_removed',
                  propertyId: prop.id,
                  propertyTitle: prop.title,
                  competitorName: comp.name || 'Rəqib Makler',
                  message: `Rəqib elan silinib və ya deaktiv olub! "${prop.title}" üzrə rəqibin elanı artıq bina.az-da yoxdur.`,
                  url: comp.url
                });
                comp.status = 'removed';
                propUpdated = true;
              }
            }
          }
        }
      }

      if (propUpdated) {
        db.saveProperty(prop);
      }
    } catch (err) {
      console.error(`[PriceChecker] Xəta (${prop.title}):`, err);
    }
  }

  isChecking = false;
  console.log('[PriceChecker] Yoxlama başa çatdı. Nəticələr:', results.length);
  return { status: 'success', checkedAt: new Date().toISOString(), changes: results };
}

module.exports = {
  checkAllPrices
};
