// Global State
let properties = [];
let notifications = [];
let unreadCount = 0;
let lastCheckTime = null;
let currentPhotos = [];
let currentSettings = {
  agencyName: 'Propix',
  brokerName: 'Emlakçı',
  brokerPhone: '+994 50 123 45 67',
  brokerWhatsapp: '+994 50 123 45 67'
};

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  loadProperties();
  loadNotifications();
  loadSettings();

  // Periodic poll for notifications every 60 seconds
  setInterval(() => {
    loadNotifications(true);
  }, 60000);

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notificationsDropdown');
    const btn = document.getElementById('btnNotifications');
    if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
});

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toastMessage');
  const iconEl = document.getElementById('toastIcon');

  msgEl.textContent = message;

  if (type === 'success') {
    iconEl.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400"></i>';
  } else if (type === 'error') {
    iconEl.innerHTML = '<i class="fa-solid fa-circle-xmark text-rose-400"></i>';
  } else if (type === 'warning') {
    iconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-400"></i>';
  } else {
    iconEl.innerHTML = '<i class="fa-solid fa-circle-info text-blue-400"></i>';
  }

  toast.classList.remove('hidden', 'translate-y-2');
  setTimeout(() => {
    toast.classList.add('hidden', 'translate-y-2');
  }, 4000);
}

// -------------------------------------------------------------
// 1. DATA LOADING
// -------------------------------------------------------------
async function loadProperties() {
  try {
    const res = await fetch('/api/properties');
    const json = await res.json();
    if (json.success) {
      properties = json.data || [];
      renderProperties();
      updateStats();
    }
  } catch (err) {
    console.error('Məlumatlar yüklənərkən xəta:', err);
  }
}

async function loadNotifications(silent = false) {
  try {
    const res = await fetch('/api/notifications');
    const json = await res.json();
    if (json.success) {
      notifications = json.data || [];
      unreadCount = json.unreadCount || 0;
      updateNotificationUI();
    }
  } catch (err) {
    if (!silent) console.error('Bildirişlər yüklənərkən xəta:', err);
  }
}

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const json = await res.json();
    if (json.success && json.data) {
      currentSettings = json.data;
      if (document.getElementById('brandNameDisplay')) {
        document.getElementById('brandNameDisplay').textContent = currentSettings.agencyName || 'Propix';
      }
    }
  } catch (err) {
    console.error('Tənzimləmələr yüklənərkən xəta:', err);
  }
}

function openSettingsModal() {
  document.getElementById('settingAgencyName').value = currentSettings.agencyName || 'Propix';
  document.getElementById('settingBrokerName').value = currentSettings.brokerName || '';
  document.getElementById('settingBrokerPhone').value = currentSettings.brokerPhone || '+994 50 123 45 67';
  document.getElementById('settingBrokerWhatsapp').value = currentSettings.brokerWhatsapp || '+994 50 123 45 67';
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const updated = {
    agencyName: document.getElementById('settingAgencyName').value.trim() || 'Propix',
    brokerName: document.getElementById('settingBrokerName').value.trim(),
    brokerPhone: document.getElementById('settingBrokerPhone').value.trim(),
    brokerWhatsapp: document.getElementById('settingBrokerWhatsapp').value.trim()
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    const json = await res.json();
    if (json.success) {
      currentSettings = json.data;
      if (document.getElementById('brandNameDisplay')) {
        document.getElementById('brandNameDisplay').textContent = currentSettings.agencyName || 'Propix';
      }
      closeSettingsModal();
      showToast('Tənzimləmələr uğurla yadda saxlanıldı!', 'success');
    }
  } catch (err) {
    showToast('Tənzimləmələr saxlanılarkən xəta baş verdi', 'error');
  }
}

function updateStats() {
  document.getElementById('statTotalProperties').textContent = properties.length;
  
  let totalComps = 0;
  properties.forEach(p => {
    if (Array.isArray(p.competitors)) totalComps += p.competitors.length;
  });
  document.getElementById('statTotalCompetitors').textContent = totalComps;

  if (lastCheckTime) {
    document.getElementById('statLastCheckTime').textContent = new Date(lastCheckTime).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
  }
}

// -------------------------------------------------------------
// 2. WORKSPACE CONTROLS & AUTO-FILL
// -------------------------------------------------------------
function showChoiceView() {
  document.getElementById('modalChoiceView').classList.remove('hidden');
  document.getElementById('modalAutoInputView').classList.add('hidden');
  document.getElementById('modalEditorView').classList.add('hidden');
}

function chooseAddMode(mode) {
  if (mode === 'auto') {
    document.getElementById('modalChoiceView').classList.add('hidden');
    document.getElementById('modalAutoInputView').classList.remove('hidden');
    document.getElementById('modalEditorView').classList.add('hidden');
    switchAutoSubTab('link');
    setTimeout(() => {
      const input = document.getElementById('autoScrapeUrlInput');
      if (input) input.focus();
    }, 100);
  } else {
    // Manual mode -> straight to editor
    document.getElementById('modalChoiceView').classList.add('hidden');
    document.getElementById('modalAutoInputView').classList.add('hidden');
    document.getElementById('modalEditorView').classList.remove('hidden');
    setTimeout(() => {
      const titleInput = document.getElementById('propTitle');
      if (titleInput) titleInput.focus();
    }, 100);
  }
}

function switchAutoSubTab(tab) {
  const linkBox = document.getElementById('subTabLinkBox');
  const textBox = document.getElementById('subTabTextBox');
  const linkBtn = document.getElementById('tabAutoLinkBtn');
  const textBtn = document.getElementById('tabAutoTextBtn');

  if (tab === 'link') {
    linkBox.classList.remove('hidden');
    textBox.classList.add('hidden');
    linkBtn.className = 'text-blue-600 border-b-2 border-blue-600 pb-2 flex items-center gap-2 transition';
    textBtn.className = 'text-slate-400 hover:text-slate-600 pb-2 flex items-center gap-2 transition';
  } else {
    linkBox.classList.add('hidden');
    textBox.classList.remove('hidden');
    textBtn.className = 'text-indigo-600 border-b-2 border-indigo-600 pb-2 flex items-center gap-2 transition';
    linkBtn.className = 'text-slate-400 hover:text-slate-600 pb-2 flex items-center gap-2 transition';
  }
}

function updatePhotoPreview() {
  const photoUrl = document.getElementById('propMainPhoto').value.trim();
  const preview = document.getElementById('imagePreview');
  const container = document.getElementById('imagePreviewContainer');
  const countText = document.getElementById('photosCountText');

  if (photoUrl) {
    preview.src = photoUrl;
    container.classList.remove('hidden');
    if (!currentPhotos.includes(photoUrl)) {
      currentPhotos = [photoUrl, ...currentPhotos];
    }
    countText.textContent = `${currentPhotos.length} şəkil aktivdir`;
  } else {
    container.classList.add('hidden');
    countText.textContent = '0 şəkil yüklənib';
  }
}

async function handleAutoScrapeUrl() {
  const urlInput = document.getElementById('autoScrapeUrlInput');
  const url = urlInput.value.trim();
  const btn = document.getElementById('btnAutoScrape');
  const spinner = document.getElementById('autoScrapeSpinner');
  const errorEl = document.getElementById('autoScrapeError');

  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  if (!url) {
    errorEl.textContent = 'Zəhmət olmasa bina.az linkini daxil edin!';
    errorEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  spinner.className = 'fa-solid fa-spinner fa-spin';

  try {
    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const json = await res.json();

    if (!json.success) {
      throw new Error(json.error || 'Məlumat çəkilə bilmədi');
    }

    const data = json.data;

    // Fill main specs
    document.getElementById('propTitle').value = data.title || '';
    document.getElementById('propPrice').value = data.price || '';
    document.getElementById('propBuildingType').value = data.buildingType || 'Yeni tikili';
    document.getElementById('propRooms').value = data.rooms || '';
    document.getElementById('propArea').value = data.area || '';
    document.getElementById('propFloor').value = data.floor || '';
    document.getElementById('propFloors').value = data.floors || '';
    document.getElementById('propLocation').value = data.location || '';
    document.getElementById('propMetro').value = data.metro || '';
    document.getElementById('propHasKupca').checked = !!data.hasBillOfSale;
    document.getElementById('propHasRepair').checked = !!data.hasRepair;
    document.getElementById('propHasMortgage').checked = !!data.hasMortgage;

    // Source info
    document.getElementById('propSourceSite').value = data.sourceSite || 'bina.az';
    document.getElementById('propSourceId').value = data.sourceId || data.id || '';
    document.getElementById('propPostedAt').value = data.postedAt ? formatTimeAgo(data.postedAt) : 'İndicə';
    document.getElementById('propMainBinaUrl').value = data.url || url;

    // Photos
    document.getElementById('propMainPhoto').value = data.mainPhoto || '';
    currentPhotos = data.photos || (data.mainPhoto ? [data.mainPhoto] : []);
    if (data.mainPhoto) {
      document.getElementById('imagePreview').src = data.mainPhoto;
      document.getElementById('photosCountText').textContent = `${currentPhotos.length} şəkil tapıldı və bağlandı`;
      document.getElementById('imagePreviewContainer').classList.remove('hidden');
    }

    // Owner info & descriptions
    if (data.ownerPhone) {
      document.getElementById('ownerPhone').value = data.ownerPhone;
      document.getElementById('ownerWhatsapp').value = data.ownerPhone;
    }
    if (data.contactName) {
      document.getElementById('ownerName').value = data.contactName;
    }
    const rawDesc = data.originalDescription || data.description || '';
    document.getElementById('propOriginalDescription').value = rawDesc;

    // Pre-generate professional AI ad text
    generateAIEstateText();

    // Transition to editor workspace view!
    document.getElementById('modalAutoInputView').classList.add('hidden');
    document.getElementById('modalEditorView').classList.remove('hidden');

    showToast('Bütün məlumatlar bina.az-dan uğurla çıxarıldı və İş Masasına köçürüldü! ⚡', 'success');
  } catch (err) {
    if (err.message && err.message.includes('403')) {
      errorEl.innerHTML = `
        <div class="flex items-start gap-2.5">
          <i class="fa-solid fa-circle-exclamation text-rose-500 mt-0.5 text-base flex-shrink-0"></i>
          <div>
            <div class="font-bold text-rose-800">bina.az bu linki xarici bulud serverindən blokladı (Status 403).</div>
            <div class="text-[11px] text-slate-600 mt-1">
              Narahat olmayın! Yuxarıdakı 
              <button type="button" onclick="switchAutoSubTab('text')" class="font-bold text-indigo-600 underline hover:text-indigo-800">
                "2. Ağıllı Mətnlə Doldur"
              </button> tabına keçin və elanın mətnini yapışdırın — bütün məlumatlar 100% zəmanətlə çıxarılacaq!
            </div>
          </div>
        </div>
      `;
    } else {
      errorEl.textContent = err.message;
    }
    errorEl.classList.remove('hidden');
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    spinner.className = 'fa-solid fa-bolt';
  }
}

function handleAutoSmartTextFill() {
  const textInput = document.getElementById('autoSmartTextInput');
  const text = (textInput ? textInput.value : '').trim();

  if (!text) {
    showToast('Zəhmət olmasa elan mətnini və ya WhatsApp mesajını yapışdırın!', 'warning');
    return;
  }

  let filledCount = 0;

  // 1. Price extraction
  const priceMatch = text.match(/(?:qiymət|qiymet|price)?[:\s]*(\d[\d\s\.]{2,})\s*(?:AZN|USD|manat|\$)/i)
                  || text.match(/(\d[\d\s\.]{3,})\s*AZN/i)
                  || text.match(/(?:qiymət|qiymet)[:\s]*(\d[\d\s\.]{3,})/i);
  if (priceMatch) {
    const rawNum = priceMatch[1].replace(/[\s\.]/g, '');
    const num = parseInt(rawNum, 10);
    if (!isNaN(num) && num >= 100) {
      document.getElementById('propPrice').value = num;
      filledCount++;
    }
  }

  // 2. Rooms extraction
  const roomMatch = text.match(/(\d+)\s*(?:otaq|otaqlı|otaqli)/i) || text.match(/(?:otaq|otaq sayı)[:\s]*(\d+)/i);
  if (roomMatch) {
    document.getElementById('propRooms').value = parseInt(roomMatch[1], 10);
    filledCount++;
  }

  // 3. Area extraction
  const areaMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*(?:m²|m2|kv|kv\.m|kvadrat|sot)/i) || text.match(/(?:sahə|sahe)[:\s]*(\d+(?:[\.,]\d+)?)/i);
  if (areaMatch) {
    const isSot = /sot/i.test(areaMatch[0]);
    document.getElementById('propArea').value = areaMatch[1].replace(',', '.') + (isSot ? ' sot' : '');
    filledCount++;
  }

  // 4. Floor / Total Floors
  const floorBothMatch = text.match(/(\d+)\s*[\/\\]\s*(\d+)\s*(?:mərtəbə|mertebe)?/i) 
                      || text.match(/mərtəbə[:\s]*(\d+)\s*[\/\\]\s*(\d+)/i);
  if (floorBothMatch) {
    document.getElementById('propFloor').value = parseInt(floorBothMatch[1], 10);
    document.getElementById('propFloors').value = parseInt(floorBothMatch[2], 10);
    filledCount += 2;
  } else {
    const singleFloorMatch = text.match(/(\d+)[-\s]*(?:ci|cü|cu|cı)?\s*mərtəbə/i);
    if (singleFloorMatch) {
      document.getElementById('propFloor').value = parseInt(singleFloorMatch[1], 10);
      filledCount++;
    }
  }

  // 5. Building Type
  if (/yeni tikili/i.test(text)) {
    document.getElementById('propBuildingType').value = 'Yeni tikili';
    filledCount++;
  } else if (/köhnə tikili|kohne tikili/i.test(text)) {
    document.getElementById('propBuildingType').value = 'Köhnə tikili';
    filledCount++;
  } else if (/həyət evi|heyet evi|villa|bağ evi|bag evi/i.test(text)) {
    document.getElementById('propBuildingType').value = 'Həyət evi';
    filledCount++;
  } else if (/obyekt/i.test(text)) {
    document.getElementById('propBuildingType').value = 'Obyekt';
    filledCount++;
  } else if (/torpaq/i.test(text)) {
    document.getElementById('propBuildingType').value = 'Torpaq';
    filledCount++;
  }

  // 6. Kupça & Təmir & İpoteka
  if (/kupça|çıxarış|cixaris|kupca/i.test(text) && !/kupçasız|kupcasiz|çıxarışsız/i.test(text)) {
    document.getElementById('propHasKupca').checked = true;
    filledCount++;
  }
  if (/təmirli|temirli|əla təmir|super təmir/i.test(text) && !/təmirsiz|temirsiz/i.test(text)) {
    document.getElementById('propHasRepair').checked = true;
    filledCount++;
  }
  if (/ipoteka|ipotekaya yararlı/i.test(text)) {
    document.getElementById('propHasMortgage').checked = true;
    filledCount++;
  }

  // 7. Location & Metro
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let locationFound = '';
  let metroFound = '';
  for (const line of lines) {
    if (!locationFound && /rayon|küç|kuc|prospekt|pr\.|metro|m\.|qəsəbə|qes|baku|bakı|xətai|nərimanov|yasamal|nəsimi|səbail|binəqədi|sabunçu|suraxanı|xəzər|qaradağ|pirallahı/i.test(line)) {
      locationFound = line.replace(/^[📍•\-\*#\d\.\s]+/, '').trim();
    }
    const mMatch = line.match(/([A-ZƏÖÜŞÇİa-zəöüşçi]+)\s+(?:metr(?:o|osu)|m\.)/i) || line.match(/(?:metro|m\.)\s+([A-ZƏÖÜŞÇİa-zəöüşçi]+)/i);
    if (mMatch && !metroFound) {
      metroFound = mMatch[1] + ' m.';
    }
  }
  if (locationFound) {
    document.getElementById('propLocation').value = locationFound.slice(0, 120);
    filledCount++;
  }
  if (metroFound) {
    document.getElementById('propMetro').value = metroFound;
    filledCount++;
  }

  // 8. Contact phone
  const phoneMatch = text.match(/(?:\+994|0)(?:50|51|55|70|77|99|12)\s*[\d\s\-]{7,10}/);
  if (phoneMatch) {
    const rawPhone = phoneMatch[0].replace(/\s+/g, ' ').trim();
    document.getElementById('ownerPhone').value = rawPhone;
    document.getElementById('ownerWhatsapp').value = rawPhone;
    filledCount++;
  }

  // 9. Photo link
  const imgMatch = text.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)[^\s"'<>]*/i);
  if (imgMatch) {
    document.getElementById('propMainPhoto').value = imgMatch[0];
    currentPhotos = [imgMatch[0]];
    document.getElementById('imagePreview').src = imgMatch[0];
    document.getElementById('photosCountText').textContent = '1 şəkil tapıldı';
    document.getElementById('imagePreviewContainer').classList.remove('hidden');
    filledCount++;
  }

  // 10. Auto-title
  const roomsVal = document.getElementById('propRooms').value;
  const bTypeVal = document.getElementById('propBuildingType').value;
  const areaVal = document.getElementById('propArea').value;
  const locVal = document.getElementById('propLocation').value;

  let genTitle = '';
  if (roomsVal) genTitle += `${roomsVal} otaqlı `;
  genTitle += bTypeVal;
  if (areaVal) genTitle += ` (${areaVal} m²)`;
  if (locVal) genTitle += ` — ${locVal.split(',')[0]}`;
  document.getElementById('propTitle').value = genTitle.trim() || 'Yeni Əmlak Elanı';

  // Raw description
  document.getElementById('propOriginalDescription').value = text;
  document.getElementById('propSourceSite').value = 'bina.az';
  document.getElementById('propPostedAt').value = 'İndicə';

  // Pre-generate professional AI ad text
  generateAIEstateText();

  // Transition to editor workspace view!
  document.getElementById('modalAutoInputView').classList.add('hidden');
  document.getElementById('modalEditorView').classList.remove('hidden');

  showToast(`Mətn uğurla analiz edildi! ${filledCount} parametr avtomatik çıxarıldı. ✨`, 'success');
}

// -------------------------------------------------------------
// FEATURE 1: ✨ SÜNİ İNTELLEKT (AI) PEŞƏKAR ELAN GENERATORU
// -------------------------------------------------------------
function generateAIEstateText() {
  const title = document.getElementById('propTitle').value.trim();
  const price = document.getElementById('propPrice').value.trim();
  const bType = document.getElementById('propBuildingType').value;
  const rooms = document.getElementById('propRooms').value.trim();
  const area = document.getElementById('propArea').value.trim();
  const floor = document.getElementById('propFloor').value.trim();
  const floors = document.getElementById('propFloors').value.trim();
  const location = document.getElementById('propLocation').value.trim();
  const metro = document.getElementById('propMetro').value.trim();
  const hasKupca = document.getElementById('propHasKupca').checked;
  const hasRepair = document.getElementById('propHasRepair').checked;
  const hasMortgage = document.getElementById('propHasMortgage').checked;

  // Call checklist items
  const isFurnished = document.getElementById('chkFurnished').checked;
  const isMortgageOk = document.getElementById('chkMortgageOk').checked || hasMortgage;
  const hasUtilities = document.getElementById('chkUtilitiesOk').checked;
  const bottomPrice = document.getElementById('chkBottomPrice').value.trim();

  // Raw notes
  const rawDesc = document.getElementById('propOriginalDescription').value.trim();

  // Broker settings
  const agency = currentSettings.agencyName || 'Propix';
  const brokerName = currentSettings.brokerName || 'Vasitəçi';
  const phone = currentSettings.brokerPhone || '+994 50 123 45 67';
  const wa = currentSettings.brokerWhatsapp || '+994 50 123 45 67';

  // Construct structured professional ad text
  let ad = '';
  
  // Headline
  const headLoc = metro ? `${metro.toUpperCase()} METROSUNUN YAXINLIĞINDA` : (location ? location.split(',')[0].toUpperCase() : 'BAKI ŞƏHƏRİNDƏ');
  ad += `🏡 ${headLoc} — ${rooms ? rooms + ' OTAQLI ' : ''}${bType.toUpperCase()} TƏCİLİ SATILIR!\n\n`;

  // Address & specs
  ad += `📍 Ünvan: ${location || 'Bakı ş.'}${metro ? ' (' + metro + ' yaxınlığı)' : ''}\n`;
  ad += `🏢 Əmlak növü: ${bType}\n`;
  if (rooms) ad += `🚪 Otaq sayı: ${rooms} otaqlı\n`;
  if (area) ad += `📐 Ümumi sahə: ${area} m²\n`;
  if (floor || floors) ad += `🏢 Mərtəbə: ${floor || '?'}${floors ? ' / ' + floors : ''}\n`;
  ad += `\n`;

  // Key highlights
  ad += `✨ Əmlakın Üstünlükləri və Vəziyyəti:\n`;
  ad += `• Sənəd: ${hasKupca ? 'Çıxarış (Kupça) var, alqı-satqıya tam hazırdır.' : 'Sənədlər qaydasındadır.'}\n`;
  if (isMortgageOk) {
    ad += `• İpoteka: İpotekaya tam yararlıdır.\n`;
  }
  ad += `• Təmir: ${hasRepair ? 'Əla və keyfiyyətli materiallarla təmir olunub.' : 'Təmirlidir, yaşayışa tam hazırdır.'}\n`;
  ad += `• Kommunal: ${hasUtilities ? 'Qaz, su, işıq daimidir və müasir lift fasiləsiz işləyir.' : 'Qaz, su, işıq və lift fasiləsiz təmin olunur.'}\n`;
  if (isFurnished) {
    ad += `• Əşyalar: Mənzil bütün səliqəli əşyaları və texnikası ilə birlikdə satılır.\n`;
  }
  ad += `\n`;

  // Clean raw owner notes if present (strip raw phone numbers from description to keep it clean)
  if (rawDesc) {
    const cleanNotes = rawDesc
      .replace(/(?:\+994|0)(?:50|51|55|70|77|99|12)\s*[\d\s\-]{7,10}/g, '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 3)
      .join('\n');

    if (cleanNotes.length > 10) {
      ad += `📝 Ətraflı Məlumat:\n${cleanNotes}\n\n`;
    }
  }

  // Price line
  if (price) {
    ad += `💰 Qiymət: ${Number(price).toLocaleString()} AZN`;
    if (bottomPrice) {
      ad += ` (Real alıcıya endirim mümkündür)\n\n`;
    } else {
      ad += ` (Real alıcı ilə razılaşma mümkündür)\n\n`;
    }
  }

  // Broker contact block
  ad += `📞 Ətraflı məlumat və mənzilə baxış üçün əlaqə saxlayın:\n`;
  ad += `🏢 ${agency}${brokerName ? ' — ' + brokerName : ''}\n`;
  ad += `📱 Tel: ${phone}\n`;
  ad += `💬 WhatsApp: ${wa}\n`;

  document.getElementById('propDescription').value = ad;
  showToast('✨ Peşəkar bina.az elan mətni süni intellektlə hazırlandı!', 'success');
}

// -------------------------------------------------------------
// FEATURE 5: 📋 BİNA.AZ ÜÇÜN MƏTNİ KOPYALA
// -------------------------------------------------------------
function copyBinaAzText() {
  let desc = document.getElementById('propDescription').value.trim();
  if (!desc) {
    generateAIEstateText();
    desc = document.getElementById('propDescription').value.trim();
  }

  if (!desc) {
    showToast('Kopyalanacaq elan mətni tapılmadı', 'warning');
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(desc).then(() => {
      showToast('📋 bina.az üçün peşəkar elan mətni kopyalandı! Birbaşa bina.az-a yapışdıra bilərsiniz.', 'success');
    }).catch(() => {
      fallbackCopyText(desc);
    });
  } else {
    fallbackCopyText(desc);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('📋 bina.az üçün peşəkar elan mətni kopyalandı! Birbaşa bina.az-a yapışdıra bilərsiniz.', 'success');
}

// -------------------------------------------------------------
// 3. PROPERTY CRUD (SAVE, EDIT, DELETE)
// -------------------------------------------------------------
function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Propix İş Masası';
  document.getElementById('modalModeBadge').textContent = 'Yeni Əmlak';
  document.getElementById('propertyForm').reset();
  document.getElementById('formPropId').value = '';
  document.getElementById('autoScrapeUrlInput').value = '';
  document.getElementById('autoSmartTextInput').value = '';
  document.getElementById('autoScrapeError').classList.add('hidden');
  document.getElementById('imagePreviewContainer').classList.add('hidden');
  document.getElementById('competitorsContainer').innerHTML = '';
  currentPhotos = [];

  // Reset checklist
  document.getElementById('chkFurnished').checked = false;
  document.getElementById('chkMortgageOk').checked = false;
  document.getElementById('chkUtilitiesOk').checked = false;
  document.getElementById('chkBottomPrice').value = '';
  document.getElementById('chkViewingTime').value = '';

  // Prefill broker display
  document.getElementById('prefilledBrokerNameDisplay').textContent = (currentSettings.brokerName || 'Vasitəçi (Siz)') + (currentSettings.agencyName ? ` (${currentSettings.agencyName})` : '');
  document.getElementById('prefilledBrokerPhoneDisplay').textContent = currentSettings.brokerPhone || '+994 50 123 45 67';

  // Show Choice view first
  showChoiceView();
  document.getElementById('propertyModal').classList.remove('hidden');
}

function openEditModal(id) {
  const prop = properties.find(p => p.id === id);
  if (!prop) return;

  document.getElementById('modalTitle').textContent = 'Propix İş Masası';
  document.getElementById('modalModeBadge').textContent = 'Redaktə';
  document.getElementById('formPropId').value = prop.id;
  document.getElementById('autoScrapeError').classList.add('hidden');

  // Fill form
  document.getElementById('propTitle').value = prop.title || '';
  document.getElementById('propPrice').value = prop.price || '';
  document.getElementById('propBuildingType').value = prop.buildingType || 'Yeni tikili';
  document.getElementById('propRooms').value = prop.rooms || '';
  document.getElementById('propArea').value = prop.area || '';
  document.getElementById('propFloor').value = prop.floor || '';
  document.getElementById('propFloors').value = prop.floors || '';
  document.getElementById('propLocation').value = prop.location || '';
  document.getElementById('propMetro').value = prop.metro || '';
  document.getElementById('propHasKupca').checked = !!prop.hasBillOfSale;
  document.getElementById('propHasRepair').checked = !!prop.hasRepair;
  document.getElementById('propHasMortgage').checked = !!prop.hasMortgage;

  // Source info
  document.getElementById('propSourceSite').value = prop.sourceSite || 'bina.az';
  document.getElementById('propSourceId').value = prop.sourceId || '';
  document.getElementById('propPostedAt').value = prop.postedAt ? (typeof prop.postedAt === 'string' && prop.postedAt.includes('T') ? formatTimeAgo(prop.postedAt) : prop.postedAt) : '';
  document.getElementById('propMainBinaUrl').value = prop.mainBinaUrl || '';

  // Photos
  document.getElementById('propMainPhoto').value = prop.mainPhoto || '';
  currentPhotos = prop.photos || (prop.mainPhoto ? [prop.mainPhoto] : []);
  if (prop.mainPhoto) {
    document.getElementById('imagePreview').src = prop.mainPhoto;
    document.getElementById('photosCountText').textContent = `${currentPhotos.length} şəkil aktivdir`;
    document.getElementById('imagePreviewContainer').classList.remove('hidden');
  } else {
    document.getElementById('imagePreviewContainer').classList.add('hidden');
    document.getElementById('photosCountText').textContent = '0 şəkil';
  }

  // Checklist
  const chk = prop.checklist || {};
  document.getElementById('chkFurnished').checked = !!chk.isFurnished;
  document.getElementById('chkMortgageOk').checked = !!chk.isMortgageOk;
  document.getElementById('chkUtilitiesOk').checked = !!chk.hasUtilities;
  document.getElementById('chkBottomPrice').value = chk.bottomPrice || '';
  document.getElementById('chkViewingTime').value = chk.viewingTime || '';

  // Descriptions
  document.getElementById('propOriginalDescription').value = prop.originalDescription || '';
  document.getElementById('propDescription').value = prop.description || '';

  // Private fields
  document.getElementById('ownerName').value = prop.ownerName || '';
  document.getElementById('ownerPhone').value = prop.ownerPhone || '';
  document.getElementById('ownerWhatsapp').value = prop.ownerWhatsapp || '';
  document.getElementById('privateApartmentNumber').value = prop.privateApartmentNumber || '';
  document.getElementById('privateNotes').value = prop.privateNotes || '';

  // Prefill broker display
  document.getElementById('prefilledBrokerNameDisplay').textContent = (currentSettings.brokerName || 'Vasitəçi (Siz)') + (currentSettings.agencyName ? ` (${currentSettings.agencyName})` : '');
  document.getElementById('prefilledBrokerPhoneDisplay').textContent = currentSettings.brokerPhone || '+994 50 123 45 67';

  // Competitors
  const container = document.getElementById('competitorsContainer');
  container.innerHTML = '';
  if (Array.isArray(prop.competitors)) {
    prop.competitors.forEach(c => addCompetitorField(c));
  }

  // Show Editor view directly
  document.getElementById('modalChoiceView').classList.add('hidden');
  document.getElementById('modalAutoInputView').classList.add('hidden');
  document.getElementById('modalEditorView').classList.remove('hidden');

  document.getElementById('propertyModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('propertyModal').classList.add('hidden');
}

function addCompetitorField(data = {}) {
  const container = document.getElementById('competitorsContainer');
  const div = document.createElement('div');
  div.className = 'competitor-row flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl';
  div.innerHTML = `
    <input type="text" placeholder="Rəqibin adı / Şirkət (məs: İlqar makler)" value="${data.name || ''}" class="comp-name w-1/3 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none">
    <input type="url" placeholder="Rəqibin bina.az linki" value="${data.url || ''}" class="comp-url flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none">
    <input type="number" placeholder="Qiymət" value="${data.lastPrice || ''}" class="comp-price w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none" title="Sonuncu məlum qiymət">
    <button type="button" onclick="this.parentElement.remove()" class="p-1.5 text-slate-400 hover:text-rose-600 transition" title="Sil">
      <i class="fa-solid fa-trash-can text-xs"></i>
    </button>
  `;
  container.appendChild(div);
}

async function handleSaveProperty(e) {
  e.preventDefault();

  const id = document.getElementById('formPropId').value;
  const isEdit = !!id;

  // Gather competitor rows
  const competitorRows = document.querySelectorAll('.competitor-row');
  const competitors = [];
  competitorRows.forEach(row => {
    const name = row.querySelector('.comp-name').value.trim();
    const url = row.querySelector('.comp-url').value.trim();
    const lastPrice = Number(row.querySelector('.comp-price').value) || 0;
    if (url) {
      competitors.push({
        id: 'c_' + Math.random().toString(36).substr(2, 6),
        name: name || 'Rəqib Makler',
        url: url,
        lastPrice: lastPrice,
        lastChecked: new Date().toISOString()
      });
    }
  });

  const propertyData = {
    title: document.getElementById('propTitle').value.trim(),
    price: Number(document.getElementById('propPrice').value) || 0,
    buildingType: document.getElementById('propBuildingType').value,
    rooms: Number(document.getElementById('propRooms').value) || null,
    area: document.getElementById('propArea').value.trim(),
    floor: Number(document.getElementById('propFloor').value) || null,
    floors: Number(document.getElementById('propFloors').value) || null,
    location: document.getElementById('propLocation').value.trim(),
    metro: document.getElementById('propMetro').value.trim(),
    hasBillOfSale: document.getElementById('propHasKupca').checked,
    hasRepair: document.getElementById('propHasRepair').checked,
    hasMortgage: document.getElementById('propHasMortgage').checked,
    sourceSite: document.getElementById('propSourceSite').value.trim() || 'bina.az',
    sourceId: document.getElementById('propSourceId').value.trim(),
    postedAt: document.getElementById('propPostedAt').value.trim(),
    mainPhoto: document.getElementById('propMainPhoto').value.trim(),
    mainBinaUrl: document.getElementById('propMainBinaUrl').value.trim(),
    photos: currentPhotos,
    // Descriptions
    originalDescription: document.getElementById('propOriginalDescription').value.trim(),
    description: document.getElementById('propDescription').value.trim(),
    // Checklist
    checklist: {
      isFurnished: document.getElementById('chkFurnished').checked,
      isMortgageOk: document.getElementById('chkMortgageOk').checked,
      hasUtilities: document.getElementById('chkUtilitiesOk').checked,
      bottomPrice: document.getElementById('chkBottomPrice').value.trim(),
      viewingTime: document.getElementById('chkViewingTime').value.trim()
    },
    // Private broker data
    ownerName: document.getElementById('ownerName').value.trim(),
    ownerPhone: document.getElementById('ownerPhone').value.trim(),
    ownerWhatsapp: document.getElementById('ownerWhatsapp').value.trim(),
    privateApartmentNumber: document.getElementById('privateApartmentNumber').value.trim(),
    privateNotes: document.getElementById('privateNotes').value.trim(),
    competitors: competitors
  };

  const url = isEdit ? `/api/properties/${id}` : '/api/properties';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(propertyData)
    });
    const json = await res.json();

    if (!json.success) throw new Error(json.error || 'Saxlanılarkən xəta');

    showToast(isEdit ? 'Əmlak məlumatları yeniləndi!' : 'Yeni əmlak bazaya əlavə edildi!', 'success');
    closeModal();
    loadProperties();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteProperty(id, title) {
  if (!confirm(`"${title}" adlı əmlakı bazadan silmək istədiyinizdən əminsiniz?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('Əmlak uğurla silindi', 'info');
      loadProperties();
      closeDetailsModal();
    }
  } catch (err) {
    showToast('Silinərkən xəta baş verdi', 'error');
  }
}

// -------------------------------------------------------------
// 4. PRICE CHECKER
// -------------------------------------------------------------
async function checkPricesNow() {
  const btn = document.getElementById('btnCheckPrices');
  const icon = document.getElementById('checkPricesIcon');

  btn.disabled = true;
  icon.classList.add('fa-spin');

  try {
    const res = await fetch('/api/check-prices', { method: 'POST' });
    const json = await res.json();

    lastCheckTime = new Date().toISOString();
    updateStats();

    if (json.success) {
      const changesCount = json.result?.changes?.length || 0;
      if (changesCount > 0) {
        showToast(`Yoxlama tamamlandı: ${changesCount} ədəd qiymət dəyişikliyi aşkarlandı!`, 'warning');
      } else {
        showToast('Bütün elanlar yoxlanıldı: Qiymətlərdə dəyişiklik yoxdur.', 'success');
      }
      loadNotifications();
      loadProperties();
    }
  } catch (err) {
    showToast('Qiymətlər yoxlanılarkən xəta baş verdi', 'error');
  } finally {
    btn.disabled = false;
    icon.classList.remove('fa-spin');
  }
}

// -------------------------------------------------------------
// 5. NOTIFICATIONS UI
// -------------------------------------------------------------
function toggleNotifications() {
  const dropdown = document.getElementById('notificationsDropdown');
  dropdown.classList.toggle('hidden');
}

function updateNotificationUI() {
  const badge = document.getElementById('notifBadge');
  const list = document.getElementById('notificationsList');

  if (unreadCount > 0) {
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  if (notifications.length === 0) {
    list.innerHTML = `
      <div class="p-6 text-center text-slate-400 text-xs">
        <i class="fa-regular fa-bell-slash text-2xl mb-2 text-slate-300"></i>
        <p>Hələ ki, yeni bildiriş yoxdur.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = notifications.map(n => {
    let icon = '<i class="fa-solid fa-bell text-blue-500"></i>';
    let bg = 'bg-blue-50/60';

    if (n.type === 'price_drop' || (n.oldPrice && n.newPrice && n.newPrice < n.oldPrice)) {
      icon = '<i class="fa-solid fa-arrow-trend-down text-emerald-600"></i>';
      bg = 'bg-emerald-50/70';
    } else if (n.type === 'price_increase' || (n.oldPrice && n.newPrice && n.newPrice > n.oldPrice)) {
      icon = '<i class="fa-solid fa-arrow-trend-up text-rose-600"></i>';
      bg = 'bg-rose-50/70';
    } else if (n.type === 'competitor_removed') {
      icon = '<i class="fa-solid fa-circle-exclamation text-amber-600"></i>';
      bg = 'bg-amber-50/70';
    }

    const timeAgo = formatTimeAgo(n.timestamp);

    return `
      <div class="p-3 ${n.read ? 'bg-white' : bg} hover:bg-slate-50 transition text-xs flex gap-3 items-start">
        <div class="mt-0.5">${icon}</div>
        <div class="flex-1">
          <p class="font-semibold text-slate-800 leading-snug">${escapeHtml(n.message)}</p>
          <div class="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>${timeAgo}</span>
            ${n.url ? `<a href="${n.url}" target="_blank" class="text-blue-600 font-bold hover:underline flex items-center gap-1">bina.az-da bax <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i></a>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function markAllNotificationsRead() {
  try {
    await fetch('/api/notifications/read', { method: 'POST' });
    unreadCount = 0;
    notifications.forEach(n => n.read = true);
    updateNotificationUI();
  } catch (err) {
    console.error(err);
  }
}

async function clearAllNotifications() {
  try {
    await fetch('/api/notifications/clear', { method: 'POST' });
    notifications = [];
    unreadCount = 0;
    updateNotificationUI();
  } catch (err) {
    console.error(err);
  }
}

// -------------------------------------------------------------
// 6. RENDER PROPERTIES GRID
// -------------------------------------------------------------
function renderProperties() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const typeFilter = document.getElementById('typeFilter').value;
  const roomsFilter = document.getElementById('roomsFilter').value;
  const sortFilter = document.getElementById('sortFilter').value;

  let filtered = properties.filter(p => {
    // Search keyword
    const matchSearch = !search ||
      (p.title && p.title.toLowerCase().includes(search)) ||
      (p.location && p.location.toLowerCase().includes(search)) ||
      (p.ownerName && p.ownerName.toLowerCase().includes(search)) ||
      (p.privateNotes && p.privateNotes.toLowerCase().includes(search));

    // Type filter
    const matchType = !typeFilter || p.buildingType === typeFilter;

    // Rooms filter
    const matchRooms = !roomsFilter ||
      (roomsFilter === '4' ? (p.rooms && p.rooms >= 4) : (p.rooms && p.rooms.toString() === roomsFilter));

    return matchSearch && matchType && matchRooms;
  });

  // Sorting
  if (sortFilter === 'price_asc') {
    filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortFilter === 'price_desc') {
    filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else {
    // Newest first
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  const grid = document.getElementById('propertiesGrid');
  const emptyState = document.getElementById('emptyState');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  grid.innerHTML = filtered.map(p => {
    const photoUrl = p.mainPhoto || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';
    const photosCount = (p.photos && p.photos.length) || (p.mainPhoto ? 1 : 0);
    const compsCount = (p.competitors && p.competitors.length) || 0;

    // Check if any competitor is selling cheaper
    let cheaperComp = null;
    if (Array.isArray(p.competitors)) {
      p.competitors.forEach(c => {
        if (c.lastPrice && c.lastPrice < p.price) {
          if (!cheaperComp || c.lastPrice < cheaperComp.lastPrice) {
            cheaperComp = c;
          }
        }
      });
    }

    // Phone / WhatsApp links
    const cleanPhone = (p.ownerPhone || '').replace(/[^0-9]/g, '');
    const cleanWa = (p.ownerWhatsapp || p.ownerPhone || '').replace(/[^0-9]/g, '');
    const waUrl = cleanWa ? `https://wa.me/${cleanWa.startsWith('994') ? cleanWa : (cleanWa.startsWith('0') ? '994' + cleanWa.slice(1) : '994' + cleanWa)}` : null;

    return `
      <div class="glass-panel rounded-3xl overflow-hidden shadow-sm card-hover-effect flex flex-col justify-between border border-slate-200">
        
        <!-- Image & Badges Container -->
        <div class="relative h-48 w-full bg-slate-200 overflow-hidden cursor-pointer" onclick="openDetailsModal('${p.id}')">
          <img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(p.title)}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80'">
          
          <!-- Gradient overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20"></div>

          <!-- Top badges -->
          <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <span class="bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
              ${escapeHtml(p.buildingType || 'Mənzil')}
            </span>
            ${p.hasBillOfSale ? '<span class="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1"><i class="fa-solid fa-certificate"></i> Kupçalı</span>' : ''}
          </div>

          <!-- Photo count badge -->
          <div class="absolute top-3 right-3 bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <i class="fa-solid fa-camera"></i> ${photosCount}
          </div>

          <!-- Price & Title in overlay -->
          <div class="absolute bottom-3 left-3 right-3">
            <div class="text-xl font-extrabold text-white tracking-tight drop-shadow-md">
              ${Number(p.price).toLocaleString()} AZN
            </div>
            <div class="text-xs text-slate-200 truncate drop-shadow-sm font-medium">
              ${escapeHtml(p.title)}
            </div>
          </div>
        </div>

        <!-- Body Details -->
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <!-- Address / Metro -->
            <div class="flex items-start gap-1.5 text-xs text-slate-500 mb-3">
              <i class="fa-solid fa-location-dot text-slate-400 mt-0.5"></i>
              <span class="line-clamp-1">${escapeHtml(p.location || 'Ünvan qeyd olunmayıb')}</span>
            </div>

            <!-- Parameters Pills -->
            <div class="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-2xl border border-slate-100 text-center mb-3">
              <div>
                <span class="text-[10px] uppercase text-slate-400 block font-semibold">Otaq</span>
                <span class="text-xs font-bold text-slate-800">${p.rooms ? p.rooms + ' otaq' : '-'}</span>
              </div>
              <div class="border-x border-slate-200">
                <span class="text-[10px] uppercase text-slate-400 block font-semibold">Sahə</span>
                <span class="text-xs font-bold text-slate-800">${p.area ? p.area + ' m²' : '-'}</span>
              </div>
              <div>
                <span class="text-[10px] uppercase text-slate-400 block font-semibold">Mərtəbə</span>
                <span class="text-xs font-bold text-slate-800">${p.floor || '-'}${p.floors ? '/' + p.floors : ''}</span>
              </div>
            </div>

            <!-- Competitor Alert Pill if cheaper competitor exists -->
            ${cheaperComp ? `
              <div class="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-[11px]">
                <span class="text-rose-700 font-bold flex items-center gap-1">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  Rəqib daha ucuz qoyub!
                </span>
                <span class="font-extrabold text-rose-800">${cheaperComp.lastPrice.toLocaleString()} AZN</span>
              </div>
            ` : (compsCount > 0 ? `
              <div class="mb-3 p-2 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-[11px]">
                <span class="text-indigo-700 font-medium flex items-center gap-1">
                  <i class="fa-solid fa-binoculars text-indigo-500"></i>
                  İzləmədə olan rəqib:
                </span>
                <span class="font-bold text-indigo-900">${compsCount} elan</span>
              </div>
            ` : '')}

            <!-- Private Owner Box -->
            <div class="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 mb-3">
              <div class="flex items-center justify-between text-[11px] mb-1">
                <span class="font-bold text-amber-900 flex items-center gap-1">
                  <i class="fa-solid fa-user text-amber-600"></i>
                  ${escapeHtml(p.ownerName || 'Ev sahibi adı qeyd olunmayıb')}
                </span>
                ${p.privateApartmentNumber ? `<span class="text-amber-800 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-md">${escapeHtml(p.privateApartmentNumber)}</span>` : ''}
              </div>

              <div class="flex items-center justify-between mt-2 pt-2 border-t border-amber-200/50">
                <div class="text-xs font-bold text-slate-700">
                  ${p.ownerPhone || 'Nömrə yoxdur'}
                </div>
                <div class="flex items-center gap-1.5">
                  ${p.ownerPhone ? `
                    <a href="tel:${cleanPhone}" class="w-7 h-7 bg-white text-blue-600 rounded-lg flex items-center justify-center border border-slate-200 hover:bg-blue-50 transition" title="Zəng et">
                      <i class="fa-solid fa-phone text-xs"></i>
                    </a>
                  ` : ''}
                  ${waUrl ? `
                    <a href="${waUrl}" target="_blank" class="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 shadow-sm transition" title="WhatsApp yaz">
                      <i class="fa-brands fa-whatsapp text-xs"></i>
                    </a>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- MÜŞTƏRİ PAYLAŞIM DÜYMƏSİ (B variantı) -->
            <button onclick="copyClientLink('${p.id}')" class="w-full mt-1 mb-2.5 py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition">
              <i class="fa-solid fa-share-nodes"></i>
              <span>Müştəri üçün Linki Kopyala</span>
            </button>

          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <button onclick="openDetailsModal('${p.id}')" class="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1">
              <span>Ətraflı & Rəqiblər</span>
              <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
            <div class="flex items-center space-x-1">
              <a href="/ev/${p.id}" target="_blank" class="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition" title="Müştəri kimi səhifəyə bax">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
              <button onclick="openEditModal('${p.id}')" class="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition" title="Düzəliş et">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button onclick="deleteProperty('${p.id}', '${escapeHtml(p.title)}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" title="Sil">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>

        </div>

      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// 7. PROPERTY DETAILS & COMPETITOR MONITOR MODAL
// -------------------------------------------------------------
function openDetailsModal(id) {
  const prop = properties.find(p => p.id === id);
  if (!prop) return;

  const content = document.getElementById('detailsModalContent');
  const photos = prop.photos && prop.photos.length > 0 ? prop.photos : (prop.mainPhoto ? [prop.mainPhoto] : []);
  const chk = prop.checklist || {};

  content.innerHTML = `
    <!-- Header -->
    <div class="flex items-start justify-between pb-4 border-b border-slate-100">
      <div>
        <div class="flex flex-wrap items-center gap-2 mb-1">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">${escapeHtml(prop.buildingType || 'Mənzil')}</span>
          ${prop.metro ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 flex items-center gap-1"><i class="fa-solid fa-train-subway"></i> ${escapeHtml(prop.metro)}</span>` : ''}
          ${prop.hasBillOfSale ? '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><i class="fa-solid fa-certificate"></i> Kupça Var</span>' : ''}
          ${prop.hasRepair ? '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Təmirli</span>' : ''}
          ${prop.hasMortgage ? '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">İpoteka</span>' : ''}
        </div>
        <h2 class="text-xl font-extrabold text-slate-900">${escapeHtml(prop.title)}</h2>
        <p class="text-xs text-slate-500 flex items-center gap-1 mt-1">
          <i class="fa-solid fa-location-dot text-slate-400"></i> ${escapeHtml(prop.location || 'Ünvan qeyd olunmayıb')}
          ${prop.sourceId ? `<span class="text-slate-400 ml-2 font-mono">| Kod: #${escapeHtml(prop.sourceId)}</span>` : ''}
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <button onclick="copyClientLink('${prop.id}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
          <i class="fa-solid fa-share-nodes"></i>
          <span>Müştəri Linki</span>
        </button>
        <a href="/ev/${prop.id}" target="_blank" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
          <i class="fa-solid fa-eye"></i>
          <span>Vitrin</span>
        </a>
        <button onclick="openEditModal('${prop.id}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">
          <i class="fa-solid fa-pen-to-square mr-1"></i> Düzəliş
        </button>
        <button onclick="closeDetailsModal()" class="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>
    </div>

    <!-- Body Layout: Left side gallery & AI text, Right side info & competitors -->
    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto pr-2">
      
      <!-- Left Column: Gallery & AI Peşəkar Description -->
      <div class="space-y-4">
        <!-- Main Image -->
        <div class="rounded-2xl overflow-hidden bg-slate-900 h-64 border border-slate-200">
          <img id="detailMainImg" src="${photos[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80'}" class="w-full h-full object-cover">
        </div>

        <!-- Thumbnail Gallery Strip -->
        ${photos.length > 1 ? `
          <div class="flex gap-2 overflow-x-auto pb-2">
            ${photos.map((src, i) => `
              <img src="${src}" onclick="document.getElementById('detailMainImg').src='${src}'" class="w-16 h-12 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-blue-500 transition">
            `).join('')}
          </div>
        ` : ''}

        <!-- AI Generated / Bina.az Description with 1-click Copy -->
        <div class="p-4 bg-gradient-to-br from-indigo-50/70 to-blue-50/70 rounded-2xl border border-indigo-200">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-bold uppercase text-indigo-950 flex items-center gap-1.5">
              <i class="fa-solid fa-wand-magic-sparkles text-amber-500"></i>
              bina.az üçün Peşəkar Mətn
            </h4>
            <button onclick="copyPropertyAdText('${prop.id}')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-sm transition">
              <i class="fa-solid fa-copy"></i>
              <span>Kopyala</span>
            </button>
          </div>
          <div class="p-3 bg-white/90 rounded-xl border border-indigo-100 text-xs font-mono text-slate-800 whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto">
            ${escapeHtml(prop.description || prop.originalDescription || 'Peşəkar mətn hələ tərtib edilməyib.')}
          </div>
        </div>

        ${prop.mainBinaUrl ? `
          <a href="${prop.mainBinaUrl}" target="_blank" class="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3.5 py-2 rounded-xl transition">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            <span>bina.az-da orijinal elana bax</span>
          </a>
        ` : ''}
      </div>

      <!-- Right Column: Specs, Checklist, Private Notes, Competitor Price Table -->
      <div class="space-y-4">
        
        <!-- Price Banner -->
        <div class="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-md">
          <div>
            <div class="text-[11px] uppercase tracking-wider text-blue-200 font-semibold">Təklif Qiymətiniz</div>
            <div class="text-2xl font-black">${Number(prop.price).toLocaleString()} AZN</div>
          </div>
          <div class="text-right text-xs text-blue-100">
            ${prop.area ? `<span>${Math.round(prop.price / (parseFloat(prop.area) || 1)).toLocaleString()} AZN/m²</span>` : ''}
          </div>
        </div>

        <!-- Ev Sahibinə Zəng Çeklisti Nəticəsi -->
        <div class="p-4 bg-amber-50/80 rounded-2xl border border-amber-200">
          <h4 class="text-xs font-bold uppercase text-amber-900 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-phone-volume text-amber-600"></i>
            Ev Sahibinə Zəng Çeklisti
          </h4>
          <div class="grid grid-cols-2 gap-2 text-xs mb-2">
            <div class="p-2 bg-white/80 rounded-xl border border-amber-200/50 flex items-center gap-1.5">
              <i class="fa-solid ${chk.isFurnished ? 'fa-check text-emerald-600' : 'fa-xmark text-slate-400'}"></i>
              <span class="${chk.isFurnished ? 'font-bold text-slate-800' : 'text-slate-500'}">Əşyalı</span>
            </div>
            <div class="p-2 bg-white/80 rounded-xl border border-amber-200/50 flex items-center gap-1.5">
              <i class="fa-solid ${chk.isMortgageOk ? 'fa-check text-emerald-600' : 'fa-xmark text-slate-400'}"></i>
              <span class="${chk.isMortgageOk ? 'font-bold text-slate-800' : 'text-slate-500'}">İpotekaya uyğun</span>
            </div>
            <div class="p-2 bg-white/80 rounded-xl border border-amber-200/50 flex items-center gap-1.5">
              <i class="fa-solid ${chk.hasUtilities ? 'fa-check text-emerald-600' : 'fa-xmark text-slate-400'}"></i>
              <span class="${chk.hasUtilities ? 'font-bold text-slate-800' : 'text-slate-500'}">Qaz/Su/Lift daimi</span>
            </div>
            <div class="p-2 bg-white/80 rounded-xl border border-amber-200/50 flex items-center gap-1.5">
              <i class="fa-solid ${prop.hasBillOfSale ? 'fa-check text-emerald-600' : 'fa-xmark text-slate-400'}"></i>
              <span class="${prop.hasBillOfSale ? 'font-bold text-slate-800' : 'text-slate-500'}">Kupça var</span>
            </div>
          </div>
          ${chk.bottomPrice ? `
            <div class="text-xs pt-1 border-t border-amber-200/60 mt-1 flex justify-between">
              <span class="text-slate-500">Son qiymət razılığı:</span>
              <span class="font-bold text-emerald-700">${escapeHtml(chk.bottomPrice)}</span>
            </div>
          ` : ''}
          ${chk.viewingTime ? `
            <div class="text-xs pt-1 flex justify-between">
              <span class="text-slate-500">Baxış vaxtı / Açar:</span>
              <span class="font-bold text-slate-800">${escapeHtml(chk.viewingTime)}</span>
            </div>
          ` : ''}
        </div>

        <!-- Məxfi Makler Məlumatları -->
        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <h4 class="text-xs font-bold uppercase text-slate-700 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-lock text-rose-500"></i>
            Ev Sahibi və Məxfi Qeydlər
          </h4>
          <div class="space-y-1.5 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-500">Ev sahibi:</span>
              <span class="font-bold text-slate-800">${escapeHtml(prop.ownerName || 'Qeyd olunmayıb')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Əlaqə telefonu:</span>
              <span class="font-bold text-slate-800">${prop.ownerPhone || 'Qeyd olunmayıb'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Mənzil/Blok:</span>
              <span class="font-bold text-slate-800">${escapeHtml(prop.privateApartmentNumber || 'Qeyd olunmayıb')}</span>
            </div>
            ${prop.privateNotes ? `
              <div class="pt-2 border-t border-slate-200 mt-2">
                <span class="text-slate-500 block mb-0.5">Xüsusi qeydlər:</span>
                <p class="text-slate-700 bg-white p-2 rounded-xl text-[11px] leading-relaxed">${escapeHtml(prop.privateNotes)}</p>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Rəqib və Qiymət Nəzarəti Cədvəli -->
        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
              <i class="fa-solid fa-scale-balanced text-indigo-600"></i>
              Rəqiblərin Qiymət Müqayisəsi
            </h4>
            <span class="text-[11px] font-bold text-slate-500">${(prop.competitors || []).length} elan</span>
          </div>

          ${(!prop.competitors || prop.competitors.length === 0) ? `
            <div class="text-center py-4 text-xs text-slate-400">
              <p>Hələ ki, izləməyə rəqib linki əlavə edilməyib.</p>
              <button onclick="openEditModal('${prop.id}')" class="mt-2 text-indigo-600 font-bold hover:underline">
                + Rəqib Linki Əlavə Et
              </button>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-200 text-[10px] uppercase text-slate-400">
                    <th class="pb-1.5 font-bold">Makler / Mənbə</th>
                    <th class="pb-1.5 font-bold text-right">Qiymət</th>
                    <th class="pb-1.5 font-bold text-right">Fərq</th>
                    <th class="pb-1.5 font-bold text-center">Keçid</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr class="bg-blue-50/60 font-bold">
                    <td class="py-2 text-blue-900">Sizin Qiymətiniz (Əsas)</td>
                    <td class="py-2 text-right text-blue-900">${Number(prop.price).toLocaleString()} AZN</td>
                    <td class="py-2 text-right text-slate-400">—</td>
                    <td class="py-2 text-center text-slate-400">Əsas</td>
                  </tr>
                  ${prop.competitors.map(c => {
                    const compPrice = Number(c.lastPrice) || 0;
                    const diff = compPrice - Number(prop.price);
                    let diffBadge = '<span class="text-slate-400">Eyni</span>';
                    if (diff < 0) {
                      diffBadge = `<span class="text-rose-600 font-bold">${diff.toLocaleString()} AZN (Ucuz)</span>`;
                    } else if (diff > 0) {
                      diffBadge = `<span class="text-emerald-600 font-bold">+${diff.toLocaleString()} AZN (Baha)</span>`;
                    }

                    return `
                      <tr>
                        <td class="py-2 text-slate-700 font-semibold">${escapeHtml(c.name || 'Digər makler')}</td>
                        <td class="py-2 text-right font-extrabold ${diff < 0 ? 'text-rose-600' : 'text-slate-800'}">
                          ${compPrice > 0 ? compPrice.toLocaleString() + ' AZN' : 'Yoxlanılmayıb'}
                        </td>
                        <td class="py-2 text-right">${diffBadge}</td>
                        <td class="py-2 text-center">
                          <a href="${c.url}" target="_blank" class="text-blue-600 hover:text-blue-800" title="Elana bax">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                          </a>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

      </div>

    </div>
  `;

  document.getElementById('detailsModal').classList.remove('hidden');
}

function copyPropertyAdText(id) {
  const prop = properties.find(p => p.id === id);
  if (!prop) return;
  const text = prop.description || prop.originalDescription || '';
  if (!text) {
    showToast('Kopyalanacaq elan mətni yoxdur', 'warning');
    return;
  }
  fallbackCopyText(text);
}

function closeDetailsModal() {
  document.getElementById('detailsModal').classList.add('hidden');
}

// -------------------------------------------------------------
// UTILS
// -------------------------------------------------------------
function formatTimeAgo(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  const diffSec = Math.floor((new Date() - date) / 1000);

  if (diffSec < 60) return 'İndicə';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dəqiqə əvvəl`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} saat əvvəl`;
  return `${Math.floor(diffSec / 86400)} gün əvvəl`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function copyClientLink(id) {
  const url = `${window.location.origin}/ev/${id}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Müştəri üçün paylaşım linki kopyalandı! (Ev sahibinin nömrəsi gizlədildi)', 'success');
    }).catch(() => {
      fallbackCopy(url);
    });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('Müştəri üçün paylaşım linki kopyalandı! (Ev sahibinin nömrəsi gizlədildi)', 'success');
}

