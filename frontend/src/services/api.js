import axios from 'axios';
import { fallbackLocations } from '../data/fallbackLocations';

const browserHost = typeof window !== 'undefined' && window.location?.hostname
  ? window.location.hostname
  : '127.0.0.1';

const apiHosts = Array.from(new Set([browserHost, '127.0.0.1', 'localhost']));
const REQUEST_TIMEOUT_MS = 1200;
const AI_REQUEST_TIMEOUT_MS = 15000;
const LOCAL_BOOKINGS_KEY = 'eco_tourism_local_bookings';
const LOCAL_BOOKING_ID_BASE = 100000;
const LOCAL_USERS_KEY = 'eco_tourism_local_users';

export const FALLBACK_AI_SUGGESTIONS = [
  { title: 'Plan a calm Kerala backwater route', search_term: 'Kerala' },
  { title: 'Find beach stays in Goa and Andaman', search_term: 'Goa' },
  { title: 'Explore forts, palaces, and heritage cities', search_term: 'Jaipur' },
  { title: 'Look for mountain and hill-station escapes', search_term: 'Munnar' },
];

export const API_URL = `http://${apiHosts[0]}:8000`;
export const FALLBACK_IMAGE_URL = '/static/images/default_destination.png';
export const UPI_ID = '9391862579@axl';

const api = axios.create({
  baseURL: API_URL,
});

const requestWithFallback = async (config) => {
  let lastError;

  for (const host of apiHosts) {
    try {
      return await api.request({
        ...config,
        baseURL: `http://${host}:8000`,
        timeout: config.timeout ?? REQUEST_TIMEOUT_MS,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const filterFallbackLocations = (params = {}) => {
  const query = String(params.query || '').trim().toLowerCase();
  const state = String(params.state || '').trim().toLowerCase();
  const minPrice = params.min_price === '' || params.min_price == null ? null : Number(params.min_price);
  const maxPrice = params.max_price === '' || params.max_price == null ? null : Number(params.max_price);
  const sortBy = params.sort_by || 'popular';

  const filtered = fallbackLocations.filter((location) => {
    const matchesQuery =
      !query ||
      location.name.toLowerCase().includes(query) ||
      location.description.toLowerCase().includes(query) ||
      location.state.toLowerCase().includes(query);
    const matchesState = !state || location.state.toLowerCase().includes(state);
    const matchesMin = minPrice == null || location.price_per_night >= minPrice;
    const matchesMax = maxPrice == null || location.price_per_night <= maxPrice;

    return matchesQuery && matchesState && matchesMin && matchesMax;
  });

  if (sortBy === 'price_low') {
    return [...filtered].sort((a, b) => a.price_per_night - b.price_per_night);
  }

  if (sortBy === 'price_high') {
    return [...filtered].sort((a, b) => b.price_per_night - a.price_per_night);
  }

  return filtered;
};

const getCurrentUsername = () => {
  if (typeof window === 'undefined') {
    return 'traveler';
  }

  return window.localStorage.getItem('username') || 'traveler';
};

const readLocalBookings = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_BOOKINGS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read local bookings', error);
    return [];
  }
};

const writeLocalBookings = (bookings) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(bookings));
  } catch (error) {
    console.error('Failed to save local bookings', error);
  }
};

const readLocalUsers = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read local users', error);
    return [];
  }
};

const writeLocalUsers = (users) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Failed to save local users', error);
  }
};

const buildLocalAuthPayload = (username) => ({
  access_token: `local-auth-${username}-${Date.now()}`,
  token_type: 'bearer',
  username,
});

const getNextLocalBookingId = (bookings) => {
  const maxId = bookings.reduce((highest, booking) => Math.max(highest, Number(booking.id) || 0), LOCAL_BOOKING_ID_BASE);
  return maxId + 1;
};

const getFallbackLocationById = (locationId) =>
  fallbackLocations.find((location) => location.id === Number(locationId)) || null;

const createLocalBookingRecord = (bookingData) => {
  const bookings = readLocalBookings();
  const username = getCurrentUsername();
  const location = getFallbackLocationById(bookingData.location_id);
  const booking = {
    id: getNextLocalBookingId(bookings),
    user_username: username,
    location_id: Number(bookingData.location_id),
    check_in_date: bookingData.check_in_date,
    check_out_date: bookingData.check_out_date,
    guests: Number(bookingData.guests || 1),
    total_price: Number(bookingData.total_price || 0),
    booking_status: 'confirmed',
    payment_status: 'pending',
    payment_method: 'upi',
    payment_reference: '',
    created_at: new Date().toISOString(),
    pricing_breakdown: bookingData.pricing_breakdown || null,
    location,
  };

  writeLocalBookings([booking, ...bookings]);
  return booking;
};

const getLocalBookingsForCurrentUser = () => {
  const username = getCurrentUsername();
  return readLocalBookings().filter((booking) => booking.user_username === username);
};

const getLocalBookingById = (bookingId) =>
  getLocalBookingsForCurrentUser().find((booking) => String(booking.id) === String(bookingId)) || null;

const updateLocalBookingRecord = (bookingId, updateFn) => {
  const bookings = readLocalBookings();
  let updatedBooking = null;

  const updatedBookings = bookings.map((booking) => {
    if (String(booking.id) !== String(bookingId)) {
      return booking;
    }

    updatedBooking = updateFn(booking);
    return updatedBooking;
  });

  if (updatedBooking) {
    writeLocalBookings(updatedBookings);
  }

  return updatedBooking;
};

const deleteLocalBookingRecord = (bookingId) => {
  const bookings = readLocalBookings();
  const filtered = bookings.filter((booking) => String(booking.id) !== String(bookingId));
  writeLocalBookings(filtered);
};



api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginUser = async (username, password) => {
  try {
    const response = await requestWithFallback({
      url: '/login',
      method: 'post',
      data: { username, password },
    });
    return response.data;
  } catch (error) {
    console.error('Falling back to local sign-in', error);
    const users = readLocalUsers();
    const user = users.find(
      (item) => item.username.toLowerCase() === String(username).trim().toLowerCase()
    );

    if (!user || user.password !== password) {
      const localError = new Error('Incorrect username or password');
      localError.response = { data: { detail: 'Incorrect username or password' } };
      throw localError;
    }

    return buildLocalAuthPayload(user.username);
  }
};

export const registerUser = async (username, email, password) => {
  try {
    const response = await requestWithFallback({
      url: '/register',
      method: 'post',
      data: { username, email, password },
    });
    return response.data;
  } catch (error) {
    console.error('Falling back to local sign-up', error);
    const trimmedUsername = String(username || '').trim();
    const trimmedEmail = String(email || '').trim();
    const users = readLocalUsers();

    const duplicate = users.find(
      (item) =>
        item.username.toLowerCase() === trimmedUsername.toLowerCase() ||
        item.email.toLowerCase() === trimmedEmail.toLowerCase()
    );

    if (duplicate) {
      const localError = new Error('Email or username already registered');
      localError.response = { data: { detail: 'Email or username already registered' } };
      throw localError;
    }

    writeLocalUsers([
      ...users,
      {
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        created_at: new Date().toISOString(),
      },
    ]);

    return { message: 'User registered successfully' };
  }
};

export const searchLocations = async (params = {}) => {
  try {
    const response = await requestWithFallback({
      url: '/locations/search',
      method: 'get',
      params,
    });
    return response.data;
  } catch (error) {
    console.error('Falling back to local destination catalog for search', error);
    return filterFallbackLocations(params);
  }
};

export const getLocationById = async (locationId) => {
  try {
    const response = await requestWithFallback({
      url: `/locations/${locationId}`,
      method: 'get',
    });
    return response.data;
  } catch (error) {
    console.error('Falling back to local destination catalog for details', error);
    const location = fallbackLocations.find((item) => item.id === Number(locationId));

    if (!location) {
      throw error;
    }

    return { location };
  }
};

export const getLocationReviews = async (locationId) => {
  try {
    const response = await requestWithFallback({
      url: `/locations/${locationId}/reviews`,
      method: 'get',
    });
    return response.data;
  } catch (error) {
    console.error('Falling back to empty review list', error);
    return { reviews: [] };
  }
};

export const addLocationReview = async (locationId, payload) => {
  const response = await requestWithFallback({
    url: `/locations/${locationId}/reviews`,
    method: 'post',
    data: payload,
  });
  return response.data;
};

export const createBooking = async (bookingData) => {
  try {
    const response = await requestWithFallback({
      url: '/bookings',
      method: 'post',
      data: bookingData,
    });
    return response.data;
  } catch (error) {
    console.error('Falling back to local booking creation', error);
    const booking = createLocalBookingRecord(bookingData);
    return {
      message: 'Booking saved locally',
      booking_id: booking.id,
      booking,
    };
  }
};

export const getMyBookings = async () => {
  try {
    const response = await requestWithFallback({
      url: '/bookings/me',
      method: 'get',
    });
    const remoteBookings = Array.isArray(response.data?.bookings) ? response.data.bookings : [];
    const localBookings = getLocalBookingsForCurrentUser();
    const seenIds = new Set(remoteBookings.map((booking) => String(booking.id)));
    const mergedBookings = [...localBookings.filter((booking) => !seenIds.has(String(booking.id))), ...remoteBookings];

    return {
      ...response.data,
      bookings: mergedBookings,
    };
  } catch (error) {
    console.error('Falling back to local bookings list', error);
    return { bookings: getLocalBookingsForCurrentUser() };
  }
};

export const getFavorites = async () => {
  const response = await requestWithFallback({
    url: '/favorites',
    method: 'get',
  });
  return response.data;
};

export const addFavorite = async (locationId) => {
  const response = await requestWithFallback({
    url: `/favorites/${locationId}`,
    method: 'post',
  });
  return response.data;
};

export const removeFavorite = async (locationId) => {
  const response = await requestWithFallback({
    url: `/favorites/${locationId}`,
    method: 'delete',
  });
  return response.data;
};

export const getAdminSummary = async () => {
  const response = await requestWithFallback({
    url: '/admin/summary',
    method: 'get',
  });
  return response.data;
};

export const getAdminOverview = async () => {
  const response = await requestWithFallback({
    url: '/admin/overview',
    method: 'get',
  });
  return response.data;
};

export const updateAdminLocation = async (locationId, payload) => {
  const response = await requestWithFallback({
    url: `/admin/locations/${locationId}`,
    method: 'put',
    data: payload,
  });
  return response.data;
};

export const updateAdminBooking = async (bookingId, payload) => {
  const response = await requestWithFallback({
    url: `/admin/bookings/${bookingId}`,
    method: 'put',
    data: payload,
  });
  return response.data;
};

export const deleteAdminReview = async (reviewId) => {
  const response = await requestWithFallback({
    url: `/admin/reviews/${reviewId}`,
    method: 'delete',
  });
  return response.data;
};

export const getBookingById = async (bookingId) => {
  try {
    const response = await requestWithFallback({
      url: `/bookings/${bookingId}`,
      method: 'get',
    });
    return response.data;
  } catch (error) {
    console.error('Falling back to local booking details', error);
    const booking = getLocalBookingById(bookingId);

    if (!booking) {
      throw error;
    }

    return { booking };
  }
};

export const markBookingPaid = async (bookingId, paymentData) => {
  try {
    const response = await requestWithFallback({
      url: `/bookings/${bookingId}/pay`,
      method: 'post',
      data: paymentData,
    });
    return response.data;
  } catch (error) {
    console.error('Falling back to local payment update', error);
    const booking = updateLocalBookingRecord(bookingId, (current) => ({
      ...current,
      payment_method: paymentData?.payment_method || current.payment_method || 'upi',
      payment_status: 'paid',
      payment_reference: current.payment_reference || `LOCAL-UPI-${current.id}`,
    }));

    if (!booking) {
      throw error;
    }

    return { booking };
  }
};

export const cancelBooking = async (bookingId) => {
  try {
    const response = await requestWithFallback({
      url: `/bookings/${bookingId}/cancel`,
      method: 'post',
    });
    return response.data;
  } catch (error) {
    console.error('Falling back to local booking cancellation', error);
    const booking = updateLocalBookingRecord(bookingId, (current) => ({
      ...current,
      booking_status: 'cancelled',
      payment_status: current.payment_status === 'paid' ? 'refund_pending' : current.payment_status,
    }));

    if (!booking) {
      throw error;
    }

    return { booking };
  }
};

export const deleteBooking = async (bookingId) => {
  try {
    const response = await requestWithFallback({
      url: `/bookings/${bookingId}`,
      method: 'delete',
    });
    return response.data;
  } catch (error) {
    console.error('Falling back to local booking deletion', error);
    deleteLocalBookingRecord(bookingId);
    return { booking_id: bookingId };
  }
};

export const getAiSuggestions = async () => {
  try {
    const response = await requestWithFallback({
      url: '/ai/suggestions',
      method: 'get',
      timeout: 700,
    });
    return response.data;
  } catch (error) {
    console.error('Falling back to local AI suggestions', error);
    return { suggestions: FALLBACK_AI_SUGGESTIONS };
  }
};

const shouldUseLocalAiFallback = (error) => {
  if (!error) return true;
  if (!error.response) return true;
  const status = error.response.status;
  // Fallback on server error, 503 unavailable, 404 not found, or timeout
  return status === 503 || status === 500 || status === 502 || status === 504 || status === 404 || error.code === 'ECONNABORTED';
};

const STATE_NAMES = new Set([
  'kerala', 'rajasthan', 'karnataka', 'tamil nadu', 'uttarakhand',
  'west bengal', 'maharashtra', 'telangana', 'ladakh', 'jammu & kashmir',
  'jammu and kashmir', 'goa', 'assam', 'meghalaya', 'gujarat', 'odisha',
  'punjab', 'uttar pradesh', 'madhya pradesh', 'andaman & nicobar',
  'andaman and nicobar islands', 'puducherry'
]);

const findDestinationsInText = (text = '') => {
  const q = text.toLowerCase();
  const matched = [];
  const seen = new Set();

  // Pass 1: Exact or Primary Name match
  for (const loc of fallbackLocations) {
    const locName = loc.name.toLowerCase();
    const primaryName = locName.split(' ')[0];
    if (q.includes(locName) || (primaryName.length > 3 && !STATE_NAMES.has(primaryName) && q.includes(primaryName))) {
      if (!seen.has(loc.id)) {
        matched.push(loc);
        seen.add(loc.id);
      }
    }
  }

  return matched;
};

const extractContextDestinationFromHistory = (history = []) => {
  if (!Array.isArray(history)) return null;

  // Check user messages first
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    const isUser = item?.role === 'user' || item?.isUser === true;
    if (!isUser) continue;
    const text = (item?.text || item?.content || '').toLowerCase();
    if (!text) continue;
    const found = findDestinationsInText(text);
    if (found.length > 0) return found[0];
  }

  // Fallback to assistant messages
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    const text = (item?.text || item?.content || '').toLowerCase();
    if (!text) continue;
    const found = findDestinationsInText(text);
    if (found.length > 0) return found[0];
  }

  return null;
};

const buildLocalAiReply = (message = '', history = []) => {
  const q = message.toLowerCase().trim();
  const contextLoc = extractContextDestinationFromHistory(history);

  // 1. Booking, Payment, Support & Cancellation questions
  if (q.includes('book') || q.includes('reserve') || q.includes('how to')) {
    return {
      reply: (
        "✨ **How to Book a Stay on Indian Journeys:**\n\n" +
        "1. **Select Destination**: Pick any of our 30 curated scenic spots from **Home** or **Discover**.\n" +
        "2. **Choose Dates & Guests**: Customize your check-in dates and guest count.\n" +
        "3. **Pick Transport & Add-ons**: Choose Economy/SUV cabs or flights, plus farm-to-table organic meals.\n" +
        "4. **Instant UPI Payment**: Pay securely via dynamic QR code or UPI VPA (`9391862579@axl`).\n\n" +
        "🛡️ *Free cancellation is available up to 48 hours before check-in.* Need direct assistance? Call **9347466496**."
      ),
      provider: 'local-knowledge-engine',
      suggestedDestinations: [],
      followUpPrompts: ['🌴 Beach escapes', '🏔️ Mountain getaways', '📋 Cancellation policy', '📞 Contact support'],
    };
  }

  if (q.includes('cancel') || q.includes('refund') || q.includes('cancellation')) {
    return {
      reply: (
        "📋 **Cancellation & 100% Refund Policy:**\n\n" +
        "• **100% Full Refund**: Free cancellation for all bookings requested at least **48 hours prior to check-in**.\n" +
        "• **Instant Self-Service**: Visit **My Trips** in the menu and click **'Cancel Booking'**.\n" +
        "• **Fast Refund Processing**: Refunds are credited back to your original UPI/Card account within **2-4 business days**.\n\n" +
        "For urgent itinerary modifications, reach our 24/7 concierge at **9347466496**."
      ),
      provider: 'local-knowledge-engine',
      suggestedDestinations: [],
      followUpPrompts: ['✨ How to book', '💳 Payment methods', '📞 Call concierge', '🌿 View top stays'],
    };
  }

  if (q.includes('payment') || q.includes('upi') || q.includes('pay') || q.includes('google pay') || q.includes('phonepe') || q.includes('paytm')) {
    return {
      reply: (
        "💳 **Fast & Secure Payment Options:**\n\n" +
        "• **Instant UPI**: Scan the dynamic QR code on checkout or pay to VPA `9391862579@axl` (Google Pay, PhonePe, Paytm, BHIM).\n" +
        "• **Instant Confirmation**: Your booking reference number and printable voucher are generated immediately.\n" +
        "• **View Receipts**: Access all trip receipts anytime under **My Trips**."
      ),
      provider: 'local-knowledge-engine',
      suggestedDestinations: [],
      followUpPrompts: ['✨ How to book', '📋 Cancellation policy', '📞 Contact support', '🗺️ View live maps'],
    };
  }

  if (q.includes('contact') || q.includes('customer care') || q.includes('phone') || q.includes('support') || q.includes('call') || q.includes('helpline')) {
    return {
      reply: (
        "📞 **Indian Journeys Customer Care & Trip Concierge:**\n\n" +
        "• **Direct Helpline**: [9347466496](tel:9347466496)\n" +
        "• **Availability**: 7 Days a week (8:00 AM – 10:00 PM IST)\n" +
        "• **Services**: Booking assistance, custom route planning, local cab dispatch, and emergency trip support."
      ),
      provider: 'local-knowledge-engine',
      suggestedDestinations: [],
      followUpPrompts: ['✨ How to book', '🏰 Rajasthan Palaces', '🌴 Kerala Backwaters', '❄️ Winter getaways'],
    };
  }

  // 2. Itinerary & Trip Planning
  if (q.includes('itinerary') || q.includes('3 day') || q.includes('3-day') || q.includes('5 day') || q.includes('5-day') || q.includes('weekend') || q.includes('plan')) {
    if (q.includes('kerala') || q.includes('munnar') || q.includes('backwater')) {
      const suggested = fallbackLocations.filter((l) => ['Kerala Backwaters', 'Munnar Tea Gardens'].includes(l.name));
      return {
        reply: (
          "🌴 **Curated 3-Day Kerala Backwaters & Munnar Itinerary:**\n\n" +
          "• **Day 1 (Alleppey Backwaters)**: Check into a solar-powered eco houseboat. Cruise through scenic palm canals and enjoy authentic Karimeen fish curry.\n" +
          "• **Day 2 (Alleppey → Munnar)**: Scenic mountain drive past Cheeyappara waterfalls. Afternoon walk through organic tea plantations and Pothamedu sunset.\n" +
          "• **Day 3 (Munnar Highlands)**: Early morning trek to Top Station for panoramic valley clouds. Spice plantation walk and tea museum tour before departure.\n\n" +
          "💰 *Estimated stay budget: Rs. 7,000 – 9,000 for 2 nights.*"
        ),
        provider: 'local-knowledge-engine',
        suggestedDestinations: suggested,
        followUpPrompts: ['☕ Munnar tea gardens', '🛶 Kerala Backwaters', '✨ How to book', '📞 Call concierge'],
      };
    }

    if (q.includes('rajasthan') || q.includes('jaipur') || q.includes('udaipur')) {
      const suggested = fallbackLocations.filter((l) => ['Jaipur Palaces', 'Udaipur Lakes', 'Jaisalmer Fort'].includes(l.name));
      return {
        reply: (
          "🏰 **Curated 3-Day Royal Rajasthan Heritage Route:**\n\n" +
          "• **Day 1 (Jaipur - Pink City)**: Sunrise at Hawa Mahal, morning exploration of Amber Fort, and afternoon walk through Johari Bazaar.\n" +
          "• **Day 2 (Jaipur → Udaipur / Pushkar)**: Scenic transfer to the City of Lakes. Evening romantic boat cruise on Lake Pichola past Jag Mandir.\n" +
          "• **Day 3 (Udaipur Palaces)**: Visit the grand City Palace and Bagore Ki Haveli folk dance show before farewell dinner.\n\n" +
          "💰 *Estimated stay budget: Rs. 7,500 – 10,500 for 2 nights.*"
        ),
        provider: 'local-knowledge-engine',
        suggestedDestinations: suggested,
        followUpPrompts: ['🏰 Jaipur Palaces', '👑 Udaipur Lakes', '✨ How to book', '📞 Concierge'],
      };
    }

    const suggested = fallbackLocations.filter((l) => ['Taj Mahal', 'Jaipur Palaces', 'Varanasi Ghats'].includes(l.name));
    return {
      reply: (
        "🗺️ **Suggested 3-Day Classic Golden Triangle & Heritage Itinerary:**\n\n" +
        "• **Day 1 (Agra)**: Dawn sunrise visit to the Taj Mahal to beat crowds. Afternoon tour of Agra Fort and marble inlay artisan workshops.\n" +
        "• **Day 2 (Agra → Jaipur)**: Scenic drive via Fatehpur Sikri. Evening arrival in the Pink City with rooftop Dal Baati dinner.\n" +
        "• **Day 3 (Jaipur)**: Electric vehicle tour of Amber Fort, Hawa Mahal photo stop, and artisan handicraft shopping.\n\n" +
        "✨ *Explore full day-by-day itineraries under our **Travel Guides** tab!*"
      ),
      provider: 'local-knowledge-engine',
      suggestedDestinations: suggested,
      followUpPrompts: ['🕌 Taj Mahal', '🏰 Jaipur Palaces', '✨ How to book', '📞 Call concierge'],
    };
  }

  // 3. Direct Destination Search & Specific Queries (Food, Best Time, Price)
  const matchedLocs = findDestinationsInText(q);
  if (matchedLocs.length === 1) {
    const loc = matchedLocs[0];
    if (q.includes('food') || q.includes('eat') || q.includes('cuisine') || q.includes('dish') || q.includes('specialty')) {
      return {
        reply: (
          `🍲 **Local Dining & Food Guide for ${loc.name} (${loc.state}):**\n\n` +
          `• **Specialties**: Authentic regional delicacies, organic farm dining, and local seasonal tea/spices.\n` +
          `• **Stay Rate**: Starting from **Rs. ${loc.price_per_night.toLocaleString('en-IN')}/night**\n` +
          `• **Eco Certified**: Farm-to-table organic meal options available on checkout.\n\n` +
          `Would you like to plan a 3-day itinerary or check the best time to visit?`
        ),
        provider: 'local-knowledge-engine',
        suggestedDestinations: [loc],
        followUpPrompts: [`🗓️ 3-day ${loc.name} plan`, `☀️ Best time for ${loc.name}`, `💰 Budget breakdown`, '✨ How to book'],
      };
    }

    return {
      reply: (
        `📍 **${loc.name} — ${loc.state}**\n\n` +
        `• **Stay Rate**: Starting from **Rs. ${loc.price_per_night.toLocaleString('en-IN')}/night**\n` +
        `• **About**: ${loc.description}\n` +
        `• **Eco Certified**: Sustainable architecture, renewable solar power, and local organic cuisine.\n\n` +
        `👉 *Click the card below to see live distance from your GPS location and reserve your stay!*`
      ),
      provider: 'local-knowledge-engine',
      suggestedDestinations: [loc],
      followUpPrompts: [`🗓️ 3-day ${loc.name} itinerary`, `🍲 Food in ${loc.name}`, `💰 Budget breakdown`, '✨ How to book'],
    };
  }

  // 4. Contextual follow-up resolution from history
  const isFollowup = ['best time', 'when to visit', 'price', 'cost', 'how much', 'food', 'eat', 'dish', 'weather', 'itinerary'].some((k) => q.includes(k));
  if (isFollowup && contextLoc && !fallbackLocations.some((l) => q.includes(l.name.toLowerCase()))) {
    const loc = contextLoc;
    if (q.includes('food') || q.includes('eat') || q.includes('dish') || q.includes('cuisine')) {
      return {
        reply: (
          `🍲 **Local Dining & Food Guide for ${loc.name} (${loc.state}):**\n\n` +
          `• **Specialties**: Authentic regional delicacies, organic farm dining, and local seasonal tea/spices.\n` +
          `• **Stay Rate**: Starting from **Rs. ${loc.price_per_night.toLocaleString('en-IN')}/night**\n` +
          `• **Eco Certified**: Farm-to-table organic meal options available on checkout.\n\n` +
          `Would you like to plan a 3-day itinerary or check the best time to visit?`
        ),
        provider: 'local-knowledge-engine',
        suggestedDestinations: [loc],
        followUpPrompts: [`🗓️ 3-day ${loc.name} plan`, `☀️ Best time for ${loc.name}`, `💰 Budget breakdown`, '✨ How to book'],
      };
    }

    if (q.includes('best time') || q.includes('when to visit') || q.includes('weather') || q.includes('season')) {
      return {
        reply: (
          `☀️ **Best Time to Visit ${loc.name} (${loc.state}):**\n\n` +
          `• **Peak Season**: October to March for cool, pleasant outdoor weather.\n` +
          `• **Night Rate**: **Rs. ${loc.price_per_night.toLocaleString('en-IN')}/night**\n` +
          `• **Highlights**: ${loc.description}\n\n` +
          `Click the card below to view live coordinates or book your eco-stay!`
        ),
        provider: 'local-knowledge-engine',
        suggestedDestinations: [loc],
        followUpPrompts: [`🗓️ 3-day ${loc.name} plan`, `🍲 Food in ${loc.name}`, '✨ How to book', '📍 Live Maps'],
      };
    }

    if (q.includes('price') || q.includes('cost') || q.includes('how much') || q.includes('budget')) {
      return {
        reply: (
          `💰 **Pricing & Budget Breakdown for ${loc.name} (${loc.state}):**\n\n` +
          `• **Verified Eco Stay**: **Rs. ${loc.price_per_night.toLocaleString('en-IN')}/night**\n` +
          `• **Estimated 3-Day Trip for 2**: ~Rs. ${(loc.price_per_night * 2 + 3500).toLocaleString('en-IN')}\n` +
          `• **Inclusions**: Organic breakfast, solar-powered room, and free cancellation up to 48 hours before check-in.`
        ),
        provider: 'local-knowledge-engine',
        suggestedDestinations: [loc],
        followUpPrompts: [`🗓️ 3-day ${loc.name} plan`, '✨ How to book', '💳 UPI payment', '📞 Call concierge'],
      };
    }
  }

  // 4. Budget-specific queries
  if (q.includes('budget') || q.includes('under 3000') || q.includes('under 2500') || q.includes('cheap') || q.includes('low price') || q.includes('affordable')) {
    const budgetSpots = fallbackLocations.filter((loc) => loc.price_per_night <= 3000).slice(0, 4);
    const list = budgetSpots
      .map((loc) => `• **${loc.name}** (${loc.state}) — **Rs. ${loc.price_per_night}/night**\n  _${loc.description}_`)
      .join('\n\n');
    return {
      reply: `🌿 **Top Budget-Friendly Eco Stays (Under Rs. 3,000 / night):**\n\n${list}\n\n💡 *Tip: All stays include verified solar energy, local organic dining, and 48-hour free cancellation.*`,
      provider: 'local-knowledge-engine',
      suggestedDestinations: budgetSpots,
      followUpPrompts: ['🏖️ Beach escapes', '🏔️ Mountain getaways', '✨ How to book', '🗺️ View on Map'],
    };
  }

  // 5. Beach, Coastal & Island queries
  if (q.includes('beach') || q.includes('goa') || q.includes('andaman') || q.includes('sea') || q.includes('coast') || q.includes('ocean')) {
    const coast = fallbackLocations.filter((l) => ['Goa', 'Andaman and Nicobar Islands', 'Puducherry', 'Kerala', 'Odisha'].includes(l.state)).slice(0, 4);
    const list = coast.map((loc) => `• **${loc.name}** (${loc.state}) — **Rs. ${loc.price_per_night}/night**\n  _${loc.description}_`).join('\n\n');
    return {
      reply: `🏖️ **Top Beach & Coastal Escapes in India:**\n\n${list}\n\n🌊 *Best Season: October to April for clear waters, scuba diving, and sunset cruises.*`,
      provider: 'local-knowledge-engine',
      suggestedDestinations: coast,
      followUpPrompts: ['🌴 Goa beaches guide', '🌊 Andaman Islands plan', '✨ How to book', '📞 Contact support'],
    };
  }

  // 6. Mountain & Hill station queries
  if (q.includes('mountain') || q.includes('hill') || q.includes('munnar') || q.includes('darjeeling') || q.includes('ooty') || q.includes('ladakh') || q.includes('trek')) {
    const hills = fallbackLocations.filter((l) => ['Kerala', 'West Bengal', 'Tamil Nadu', 'Ladakh', 'Uttarakhand', 'Jammu and Kashmir', 'Karnataka'].includes(l.state)).slice(0, 4);
    const list = hills.map((loc) => `• **${loc.name}** (${loc.state}) — **Rs. ${loc.price_per_night}/night**\n  _${loc.description}_`).join('\n\n');
    return {
      reply: `🏔️ **Scenic Mountain & Hill Station Stays:**\n\n${list}\n\n🌲 *Enjoy fresh pine air, organic tea estate trails, and panoramic Himalayan/Ghats viewpoints.*`,
      provider: 'local-knowledge-engine',
      suggestedDestinations: hills,
      followUpPrompts: ['☕ Munnar tea gardens', '❄️ Ladakh valleys', '🌸 Valley of Flowers trek', '✨ How to book'],
    };
  }

  // 7. Heritage & Royal Palaces
  if (q.includes('heritage') || q.includes('fort') || q.includes('palace') || q.includes('history') || q.includes('rajasthan') || q.includes('jaipur') || q.includes('hampi')) {
    const heritage = fallbackLocations.filter((l) => ['Rajasthan', 'Karnataka', 'Madhya Pradesh', 'Uttar Pradesh', 'Telangana', 'Maharashtra'].includes(l.state)).slice(0, 4);
    const list = heritage.map((loc) => `• **${loc.name}** (${loc.state}) — **Rs. ${loc.price_per_night}/night**\n  _${loc.description}_`).join('\n\n');
    return {
      reply: `🏰 **Royal Heritage, Forts & UNESCO Wonders:**\n\n${list}\n\n👑 *Best Time: October to March for pleasant heritage walks and desert safaris.*`,
      provider: 'local-knowledge-engine',
      suggestedDestinations: heritage,
      followUpPrompts: ['🕌 3-day Golden Triangle', '🏰 Royal Rajasthan route', '🛕 Hampi ruins guide', '✨ How to book'],
    };
  }

  // 8. Itinerary Planning
  if (q.includes('itinerary') || q.includes('3 day') || q.includes('5 day') || q.includes('weekend') || q.includes('plan')) {
    const suggested = fallbackLocations.filter((l) => ['Kerala Backwaters', 'Munnar Tea Gardens', 'Taj Mahal'].includes(l.name));
    return {
      reply: (
        "🗺️ **Curated 3-Day Scenic Route Recommendation:**\n\n" +
        "• **Day 1**: Arrive at base city, check into an eco-certified stay, and explore local heritage bazaars.\n" +
        "• **Day 2**: Sunrise nature walk with a certified naturalist guide, organic farm lunch, and evening sunset viewpoint.\n" +
        "• **Day 3**: Cultural artisan workshop (pottery/tea tasting/spice walk) and relaxed departure.\n\n" +
        "✨ *Explore full day-by-day itineraries under our **Travel Guides** tab!*"
      ),
      provider: 'local-knowledge-engine',
      suggestedDestinations: suggested,
      followUpPrompts: ['🌴 3-day Kerala plan', '🏰 Royal Rajasthan route', '✨ How to book', '📞 Call concierge'],
    };
  }

  // 9. Default warm discovery fallback
  const featured = fallbackLocations.slice(0, 3);
  return {
    reply: (
      "Namaste! 🙏 I'm your Indian Journeys AI Travel Assistant. Here is how I can help you plan:\n\n" +
      "• **Destinations**: Ask about *Goa beaches*, *Munnar tea hills*, *Taj Mahal*, or *Ladakh valleys*.\n" +
      "• **Budget Planning**: Ask for *stays under Rs. 3,000* or *luxury heritage palaces*.\n" +
      "• **Custom Itineraries**: Ask for *3-day weekend trips* or *seasonal getaways*.\n" +
      "• **Booking Help**: Ask *how to book*, *UPI payment*, *cancellation policy*, or call **9347466496**.\n\n" +
      "What destination or experience can I help you discover?"
    ),
    provider: 'local-knowledge-engine',
    suggestedDestinations: featured,
    followUpPrompts: ['🌴 Goa Beaches', '⛰️ 3-day Munnar itinerary', '🏰 Royal Rajasthan route', '💰 Stays under Rs. 3000', '✨ How to book'],
  };
};

export const sendAiMessage = async (message, history = []) => {
  try {
    const response = await requestWithFallback({
      url: '/ai/chat',
      method: 'post',
      data: { message, history },
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  } catch (error) {
    if (shouldUseLocalAiFallback(error)) {
      console.warn('Falling back to local AI chat reply', error);
      return buildLocalAiReply(message, history);
    }

    throw error;
  }
};


export const resolveImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return FALLBACK_IMAGE_URL;
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  if (imageUrl.startsWith('/static/images/')) {
    return imageUrl;
  }

  return `${API_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
};

export const buildUpiLink = ({ amount, bookingId, locationName }) => {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: 'Indian Journeys',
    am: String(amount),
    cu: 'INR',
    tn: `Booking ${bookingId} - ${locationName}`,
  });

  return `upi://pay?${params.toString()}`;
};

export const buildUpiQrUrl = ({ amount, bookingId, locationName }) => {
  const upiLink = buildUpiLink({ amount, bookingId, locationName });
  const params = new URLSearchParams({
    text: upiLink,
    size: '220',
  });

  return `https://quickchart.io/qr?${params.toString()}`;
};

export default api;
