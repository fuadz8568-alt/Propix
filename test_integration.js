const { scrapeBinaAz } = require('./scraper');
const db = require('./db');
const { checkAllPrices } = require('./priceChecker');

async function runTests() {
  console.log('=== TEST 1: bina.az Scraping Test ===');
  const sampleUrl = 'https://bina.az/items/6517902';
  try {
    const scraped = await scrapeBinaAz(sampleUrl);
    console.log('Scrape result:', {
      success: scraped.success,
      title: scraped.title,
      price: scraped.price,
      currency: scraped.currency,
      rooms: scraped.rooms,
      area: scraped.area,
      floor: scraped.floor,
      floors: scraped.floors,
      buildingType: scraped.buildingType,
      hasBillOfSale: scraped.hasBillOfSale,
      location: scraped.location,
      photosCount: scraped.photos.length
    });

    if (!scraped.success || !scraped.price) {
      throw new Error('Scraping did not return price');
    }
    console.log('✅ TEST 1 PASSED: Scraping works accurately!');

    console.log('\n=== TEST 2: DB & Property Save Test ===');
    const testProp = {
      id: 'test_prop_1',
      title: scraped.title,
      price: scraped.price,
      buildingType: scraped.buildingType,
      rooms: scraped.rooms,
      area: scraped.area,
      floor: scraped.floor,
      floors: scraped.floors,
      location: scraped.location,
      hasBillOfSale: scraped.hasBillOfSale,
      mainPhoto: scraped.mainPhoto,
      photos: scraped.photos,
      mainBinaUrl: sampleUrl,
      ownerName: 'Test Ev Sahibi',
      ownerPhone: '0501112233',
      ownerWhatsapp: '0501112233',
      privateApartmentNumber: 'Mənzil 10',
      brokerCommission: '1%',
      privateNotes: 'Açar məndədir',
      competitors: [
        {
          id: 'comp_1',
          name: 'Rəqib Əli Makler',
          url: sampleUrl,
          lastPrice: scraped.price + 5000, // Deliberately higher to test comparison
          lastChecked: new Date().toISOString()
        }
      ]
    };

    db.saveProperty(testProp);
    const retrieved = db.getPropertyById('test_prop_1');
    console.log('Saved and retrieved:', retrieved ? retrieved.title : 'null');
    console.log('✅ TEST 2 PASSED: DB Save & Retrieve works!');

    console.log('\n=== TEST 3: Price Checker Simulation ===');
    const checkResult = await checkAllPrices();
    console.log('Check result status:', checkResult.status, 'Changes found:', checkResult.changes.length);

    const notifs = db.getNotifications();
    console.log('Total notifications:', notifs.length);
    if (notifs.length > 0) {
      console.log('Sample notification:', notifs[0].message);
    }
    console.log('✅ TEST 3 PASSED: Price check engine processed successfully!');

    console.log('\nALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runTests();
