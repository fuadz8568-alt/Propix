/**
 * bina.az Scraper and Parser module
 */

function extractItemId(url) {
  if (!url) return null;
  const match = url.match(/\/items\/(\d+)/i) || url.match(/(\d{6,8})/);
  return match ? match[1] : null;
}

async function scrapeBinaAz(url) {
  const itemId = extractItemId(url);
  if (!itemId) {
    throw new Error('Düzgün bina.az linki daxil edilməyib. Nümunə: https://bina.az/items/1234567');
  }

  const cleanUrl = `https://bina.az/items/${itemId}`;
  const response = await fetch(cleanUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'az,ru,en;q=0.9'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Bu elan tapılmadı və ya artıq silinib.');
    }
    throw new Error(`Sayta qoşularkən xəta baş verdi (Status: ${response.status})`);
  }

  const html = await response.text();

  // Next.js page data extraction
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  let item = null;

  if (nextDataMatch) {
    try {
      const parsed = JSON.parse(nextDataMatch[1]);
      item = parsed.props?.pageProps?.currentItemData || null;
    } catch (e) {
      console.error('NextData parse error:', e);
    }
  }

  // If Next.js data found, build clean object
  if (item) {
    const photos = (item.photos || []).map(p => p.full || p.f660x496 || p.thumbnail).filter(Boolean);
    const mainPhoto = photos[0] || '';

    // Price
    const priceVal = item.price?.total || 0;
    const priceCurrency = item.price?.currency || 'AZN';

    // Building type
    const buildingType = item.buildingTypeName || item.category?.name || 'Mənzil';

    // Area
    let areaVal = '';
    if (item.area && item.area.value) {
      areaVal = item.area.value;
    } else if (item.landArea && item.landArea.value) {
      areaVal = item.landArea.value + ' sot';
    }

    // Location formatting
    const locationName = item.location?.fullName || '';
    const addressStr = item.address || '';
    const fullLocation = [locationName, addressStr].filter(Boolean).join(', ');

    return {
      success: true,
      id: itemId,
      url: cleanUrl,
      title: `${item.rooms ? item.rooms + ' otaqlı ' : ''}${buildingType} (${areaVal ? areaVal + ' m²' : ''})`,
      price: priceVal,
      currency: priceCurrency,
      rooms: item.rooms || null,
      floor: item.floor || null,
      floors: item.floors || null,
      area: areaVal,
      buildingType: buildingType,
      hasBillOfSale: !!item.hasBillOfSale, // Kupça
      hasRepair: !!item.hasRepair, // Təmir
      hasMortgage: !!item.hasMortgage, // İpoteka
      location: fullLocation || 'Bakı',
      description: item.description || '',
      mainPhoto: mainPhoto,
      photos: photos,
      state: item.state || 'active',
      isExpired: !!(item.isExpiredManually || (item.expiresAt && new Date(item.expiresAt) < new Date()))
    };
  }

  // Fallback regex parsing if NextData is missing
  const ogTitle = (html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i) || [])[1] || '';
  const ogImage = (html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i) || [])[1] || '';
  const ogDesc = (html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i) || [])[1] || '';

  // Price match from HTML
  const priceMatch = html.match(/"price":\s*"(\d+)"/i) || html.match(/(\d[\d\s]*)\s*(?:AZN|USD)/i);
  let price = 0;
  if (priceMatch) {
    price = parseInt(priceMatch[1].replace(/\s+/g, ''), 10) || 0;
  }

  return {
    success: true,
    id: itemId,
    url: cleanUrl,
    title: ogTitle || 'Əmlak Elanı',
    price: price,
    currency: 'AZN',
    rooms: null,
    floor: null,
    floors: null,
    area: '',
    buildingType: 'Mənzil',
    hasBillOfSale: false,
    hasRepair: false,
    hasMortgage: false,
    location: '',
    description: ogDesc,
    mainPhoto: ogImage,
    photos: ogImage ? [ogImage] : [],
    state: 'active',
    isExpired: false
  };
}

module.exports = {
  scrapeBinaAz,
  extractItemId
};
