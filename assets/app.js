// აქედან მოდის API მისამართი
const API = 'https://hotelbooking.stepprojects.ge/api';
// ეს არის მთავარი fallback სურათი
const HERO_IMAGE = 'https://images.trvl-media.com/lodging/16000000/15840000/15835100/15835033/41cbdcb1.jpg?impolicy=resizecrop&rw=1200&ra=fit';

// ერთ ელემენტს პოულობს
function qs(sel, root = document) { return root.querySelector(sel); }
// ბევრ ელემენტს პოულობს
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
// URL დან პარამეტრს იღებს
function getParam(name) { return new URLSearchParams(location.search).get(name); }
// ტექსტს ასუფთავებს უსაფრთხოდ
function escapeHtml(str) { return String(str ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
// ფასს ლამაზად აჩვენებს
function fmtMoney(v) { return `$${Number(v || 0).toLocaleString()}`; }
// თარიღს readable ფორმატში აჩვენებს
function fmtDate(v) { if (!v) return '—'; const d = new Date(v); if (Number.isNaN(d.getTime())) return v; return d.toLocaleDateString(); }
// სიტყვას s ამატებს როცა საჭიროა
function plural(n, word) { return `${n} ${word}${n === 1 ? '' : 's'}`; }
// local თარიღს ISO ფორმატში გადაყავს
function toIsoFromLocal(value) { if (!value) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toISOString(); }
// ნომრიდან ზედმეტ space ს აშორებს
function normalizePhone(phone) { return (phone || '').trim(); }
// დღეებს ითვლის ორ თარიღს შორის
function daysBetween(start, end) { const a = new Date(start); const b = new Date(end); if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0; const diff = Math.ceil((b - a) / 86400000); return diff > 0 ? diff : 0; }

// ოთახის კატეგორიას არჩევს სახელით
function getRoomCategory(room) {
  // სახელს პატარა ასოებად აქცევს
  const name = String(room?.name || '').toLowerCase();
  // თუ suite წერია
  if (name.includes('suite')) return 'Suite';
  // თუ deluxe წერია
  if (name.includes('deluxe')) return 'Deluxe';
  // თუ executive წერია
  if (name.includes('executive')) return 'Executive';
  // თუ superior წერია
  if (name.includes('superior')) return 'Superior';
  // თუ junior წერია
  if (name.includes('junior')) return 'Junior';
  // თუ twin წერია
  if (name.includes('twin')) return 'Twin';
  // თუ ვერ იცნო ამ ტიპს აბრუნებს
  return `Type ${room?.roomTypeId ?? '—'}`;
}

// API request ის საერთო ფუნქცია
async function apiFetch(path, opts = {}) {
  // request იგზავნება API ზე
  const res = await fetch(`${API}${path}`, opts);
  // პასუხი ჯერ ტექსტად მოდის
  const text = await res.text();
  // data ინახავს პასუხს
  let data = text;
  // თუ JSON არის parse ხდება
  try { data = text ? JSON.parse(text) : null; } catch { }
  // თუ request ვერ შესრულდა error ს აგდებს
  if (!res.ok) { throw new Error(typeof data === 'string' ? data.slice(0, 600) : `Request failed (${res.status})`); }
  // საბოლოო data ბრუნდება
  return data;
}

// ქალაქის სასტუმროებს იღებს
async function getHotels(city = 'Tbilisi') {
  // ჯერ ქალაქით ეძებს
  try { return await apiFetch(`/Hotels/GetHotels?city=${encodeURIComponent(city)}`); }
  // თუ ვერ გამოვიდა ყველას იღებს
  catch { return await apiFetch('/Hotels/GetAll'); }
}
// ერთი სასტუმროს დეტალებს იღებს
async function getHotel(id) { return await apiFetch(`/Hotels/GetHotel/${id}`); }
// ქალაქების სიას იღებს
async function getCities() { return await apiFetch('/Hotels/GetCities'); }
// booking ების სიას იღებს
async function getBookings() { return await apiFetch('/Booking'); }
// ახალ booking ს აგზავნის
async function postBooking(payload) {
  return await apiFetch('/Booking', {
    // POST request
    method: 'POST',
    // JSON headers
    headers: { 'Content-Type': 'application/json', 'accept': '*/*' },
    // body ში payload მიდის
    body: JSON.stringify(payload)
  });
}

// ყველა ოთახს აგროვებს სასტუმროებიდან
async function getAllRoomsFromHotels(city = 'Tbilisi') {
  // სასტუმროების სია
  const hotels = await getHotels(city);
  // თითო სასტუმროს დეტალები
  const detailed = await Promise.all(hotels.map(h => getHotel(h.id).catch(() => null)));
  // ოთახებს აერთიანებს ერთ array ში
  return detailed.filter(Boolean).flatMap(h => (h.rooms || []).map(r => ({
    ...r,
    // ოთახს სასტუმროს სახელს უმატებს
    hotelName: h.name,
    // ქალაქს უმატებს
    hotelCity: h.city,
    // მისამართს უმატებს
    hotelAddress: h.address,
    // სასტუმროს სურათს უმატებს
    hotelImage: h.featuredImage,
    // კატეგორიას უმატებს
    category: getRoomCategory(r)
  })));
}

// ოთახის card ს აწყობს
function roomCard(room, showHotel = true) {
  // სურათს არჩევს
  const img = room.images?.[0]?.source || room.hotelImage || HERO_IMAGE;
  return `
    <article class="card room-card fade-in">
      <img class="cover" src="${escapeHtml(img)}" alt="${escapeHtml(room.name || 'Room')}">
      <div class="card-body">
        <div class="card-top">
          <span class="badge">${escapeHtml(room.category || getRoomCategory(room))}</span>
          <span class="badge">${room.available ? 'Available' : 'Unavailable'}</span>
        </div>
        <h3 class="card-title">${escapeHtml(room.name || 'Room')}</h3>
        <div class="meta">
          ${showHotel ? `<span>🏨 ${escapeHtml(room.hotelName || '')}</span>` : ''}
          <span>👥 ${room.maximumGuests ?? 0} guests</span>
          <span>🛏️ ${escapeHtml(room.category || getRoomCategory(room))}</span>
        </div>
        <div class="price-row">
          <div class="price">${fmtMoney(room.pricePerNight)} <small>/ night</small></div>
        </div>
        <div class="actions">
          ${showHotel && room.hotelId ? `<a class="btn btn-ghost" style="color:#162033;border:1px solid var(--line);background:#fff" href="hotel.html?id=${room.hotelId}">View hotel</a>` : ''}
          <button class="btn btn-primary js-book-room" data-room-id="${room.id}" data-room-name="${escapeHtml(room.name)}" data-room-price="${room.pricePerNight}" data-room-category="${escapeHtml(room.category || getRoomCategory(room))}" data-hotel-name="${escapeHtml(room.hotelName || '')}" data-room-hotelid="${room.hotelId || ''}">Book now</button>
        </div>
      </div>
    </article>`;
}

// სასტუმროს card ს აწყობს
function hotelCard(hotel) {
  return `
    <article class="card hotel-card fade-in">
      <img class="cover" src="${escapeHtml(hotel.featuredImage || HERO_IMAGE)}" alt="${escapeHtml(hotel.name)}">
      <div class="card-body">
        <div class="card-top"><span class="badge">${escapeHtml(hotel.city || 'City')}</span></div>
        <h3 class="card-title">${escapeHtml(hotel.name)}</h3>
        <div class="meta"><span>📍 ${escapeHtml(hotel.address || '')}</span></div>
        <div class="actions"><a class="btn btn-secondary" href="hotel.html?id=${hotel.id}">See rooms</a></div>
      </div>
    </article>`;
}

// booking summary ს ანახლებს
function updateBookingSummary(room) {
  // არჩეული ოთახის ადგილი
  const roomBox = qs('#booking-selected-room');
  // ფასის ადგილი
  const priceBox = qs('#booking-price-per-night');
  // კატეგორიის ადგილი
  const categoryBox = qs('#booking-category');
  // არჩეულ ოთახს წერს
  if (roomBox) roomBox.textContent = room ? `${room.name}${room.hotelName ? ` — ${room.hotelName}` : ''}` : 'No room selected yet';
  // ფასს წერს
  if (priceBox) priceBox.textContent = room ? fmtMoney(room.pricePerNight) : '—';
  // კატეგორიას წერს
  if (categoryBox) categoryBox.textContent = room ? (room.category || getRoomCategory(room)) : '—';
}

// booking ფასს ახლიდან ითვლის
function recalcBookingPrice(roomMap) {
  // არჩეული ოთახის id
  const roomID = qs('#booking-room')?.value;
  // check in თარიღი
  const checkIn = qs('[name="checkInDate"]')?.value;
  // check out თარიღი
  const checkOut = qs('[name="checkOutDate"]')?.value;
  // ღამეების რაოდენობა
  const nights = daysBetween(checkIn, checkOut);
  // ოთახს პოულობს map ში
  const room = roomMap?.get(Number(roomID)) || null;
  // მთლიან ფასს ითვლის
  const total = room ? nights * Number(room.pricePerNight || 0) : 0;
  // totalPrice input
  const priceInput = qs('[name="totalPrice"]');
  // input ში წერს ფასს
  if (priceInput) priceInput.value = total || 0;
  // ღამეებს აჩვენებს
  if (qs('#booking-nights')) qs('#booking-nights').textContent = nights ? plural(nights, 'night') : 'Select dates';
  // მთლიან თანხას აჩვენებს
  if (qs('#booking-total-live')) qs('#booking-total-live').textContent = fmtMoney(total);
  // summary ახლდება
  updateBookingSummary(room);
  return { room, nights, total };
}

// book now ღილაკებს event ებს ამატებს
function wireBookingButtons(roomMap) {
  qsa('.js-book-room').forEach(btn => btn.addEventListener('click', () => {
    // დაჭერილი ღილაკის room id
    const roomId = btn.dataset.roomId;
    // select ელემენტი
    const roomSelect = qs('#booking-room');
    // select ში room იწერება
    if (roomSelect) roomSelect.value = roomId;
    // ოთახი map დან
    const room = roomMap?.get(Number(roomId));
    // ფასი ითვლება
    recalcBookingPrice(roomMap);
    // summary ახლდება
    updateBookingSummary(room || null);
    // ფორმამდე ჩადის
    qs('#booking-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

// booking form ს ამზადებს
function setupBookingForm(roomMap) {
  // ფორმა
  const form = qs('#booking-form');
  // თუ არ არის გამოდის
  if (!form) return;
  // ცვლილებაზე ფასის გადათვლა
  const sync = () => recalcBookingPrice(roomMap);
  ['change', 'input'].forEach(evt => {
    // ოთახის შეცვლაზე
    qs('#booking-room')?.addEventListener(evt, sync);
    // check in შეცვლაზე
    qs('[name="checkInDate"]')?.addEventListener(evt, sync);
    // check out შეცვლაზე
    qs('[name="checkOutDate"]')?.addEventListener(evt, sync);
  });
  form.addEventListener('submit', async (e) => {
    // refresh ს აჩერებს
    e.preventDefault();
    // მესიჯის ელემენტი
    const msg = qs('#booking-message');
    // თავიდან hidden
    msg.className = 'hidden';
    // ტექსტი ცარიელდება
    msg.textContent = '';
    // ფორმის მონაცემები
    const data = new FormData(form);
    // room id
    const roomID = Number(data.get('roomID'));
    // არჩეული ოთახი
    const room = roomMap.get(roomID);
    // local check in
    const checkInDateLocal = data.get('checkInDate');
    // local check out
    const checkOutDateLocal = data.get('checkOutDate');
    // მომხმარებლის სახელი
    const customerName = data.get('customerName');
    // მომხმარებლის id
    const customerId = data.get('customerId') || null;
    // ტელეფონი
    const customerPhone = normalizePhone(data.get('customerPhone'));
    // confirmed არის თუ არა
    const isConfirmed = qs('[name="isConfirmed"]') ? qs('[name="isConfirmed"]').checked : true;
    // ღამეების რაოდენობა
    const nights = daysBetween(checkInDateLocal, checkOutDateLocal);
    // მთლიანი ფასი
    const totalPrice = room ? nights * Number(room.pricePerNight || 0) : Number(data.get('totalPrice') || 0);
    // თუ ოთახი არასწორია
    if (!roomID || !room) {
      msg.className = 'error'; msg.textContent = 'Please select a valid room.'; return;
    }
    // თუ თარიღი არასწორია
    if (!checkInDateLocal || !checkOutDateLocal || nights <= 0) {
      msg.className = 'error'; msg.textContent = 'Check-out must be after check-in.'; return;
    }
    // API ზე გასაგზავნი ობიექტი
    const payload = {
      id: 0,
      roomID,
      checkInDate: toIsoFromLocal(checkInDateLocal),
      checkOutDate: toIsoFromLocal(checkOutDateLocal),
      totalPrice,
      isConfirmed,
      customerName,
      customerId,
      customerPhone
    };
    try {
      // booking იგზავნება
      const result = await postBooking(payload);
      // წარმატების კლასი
      msg.className = 'success';
      // წარმატების ტექსტი
      msg.textContent = typeof result === 'string' ? `Booking response: ${result}` : `Booking created for ${customerName}.`;
    } catch (err) {
      // error კლასი
      msg.className = 'error';
      // error ტექსტი
      msg.textContent = `Booking failed: ${err.message}`;
    }
  });
}

// გვერდის ჩატვირთვისას ეს მუშაობს
(async function () {
  // featured rooms ადგილი
  const wrap = document.getElementById('featured-rooms');
  // room map
  const roomMap = new Map();
  try {
    // სასტუმროები და ოთახები ერთად
    const [hotels, rooms] = await Promise.all([getHotels('Tbilisi'), getAllRoomsFromHotels('Tbilisi')]);
    // სასტუმროების რაოდენობა
    document.getElementById('hero-hotel-count').textContent = hotels.length;
    // ოთახების რაოდენობა
    document.getElementById('hero-room-count').textContent = rooms.length;
    // პირველი 6 ოთახი იწერება
    wrap.innerHTML = rooms.slice(0, 6).map(r => roomCard(r, true)).join('');
    // booking select
    const select = document.getElementById('booking-room');
    rooms.forEach(r => {
      // map ში ინახავს
      roomMap.set(Number(r.id), r);
      // option იქმნება
      const o = document.createElement('option');
      // option value
      o.value = r.id;
      // option ტექსტი
      o.textContent = `${r.name} — ${r.hotelName} (${fmtMoney(r.pricePerNight)})`;
      // select ში ემატება
      select.appendChild(o);
    });
    // ღილაკების ჩართვა
    wireBookingButtons(roomMap);
    // ფორმის ჩართვა
    setupBookingForm(roomMap);
  } catch (err) {
    // ჩატვირთვის შეცდომა
    wrap.innerHTML = `<div class="error">Could not load rooms: ${err.message}</div>`;
    // ფორმა მაინც ჩაირთოს
    setupBookingForm(roomMap);
  }

  // hero search ღილაკი
  const btn = document.getElementById('hero-search-btn');
  btn.addEventListener('click', e => {
    // URL params
    const params = new URLSearchParams();
    // checkIn თუ შევსებულია
    if (document.getElementById('hero-checkin').value) params.set('checkIn', document.getElementById('hero-checkin').value);
    // checkOut თუ შევსებულია
    if (document.getElementById('hero-checkout').value) params.set('checkOut', document.getElementById('hero-checkout').value);
    // guests თუ შევსებულია
    if (document.getElementById('hero-guests').value) params.set('guests', document.getElementById('hero-guests').value);
    // rooms page ზე გადადის params ით
    btn.href = `rooms.html?${params.toString()}`;
  });
})();