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

const buildLocalAiReply = (message) => {
  const normalized = String(message || '').trim().toLowerCase();

  if (!normalized) {
    return 'Tell me what kind of trip you want, like beaches, mountains, heritage places, or budget stays, and I will suggest good destinations.';
  }

  if (/(hi|hello|hey)\b/.test(normalized)) {
    return 'Hello! I can help you choose destinations, compare travel moods, and guide you to booking pages quickly.';
  }

  if (/(book|booking|reserve|payment|pay)\b/.test(normalized)) {
    return 'To book a trip, open any destination card, continue to Smart Booking, choose your travel mode, and confirm the stay details from there.';
  }

  if (/(beach|sea|island|goa|andaman)\b/.test(normalized)) {
    return 'For a coastal trip, start with Goa Beaches or Andaman Islands. Goa is great for easy beach stays, while Andaman is better for island scenery and flight-based travel.';
  }

  if (/(mountain|hill|cool|tea|munnar|ooty|darjeeling|ladakh)\b/.test(normalized)) {
    return 'For cooler escapes, try Munnar Tea Gardens, Ooty Hills, Darjeeling Hills, or Ladakh Valleys depending on whether you want greenery, tea estates, or dramatic high-altitude views.';
  }

  if (/(heritage|history|fort|palace|taj|jaipur|charminar|golkonda|hampi)\b/.test(normalized)) {
    return 'For heritage travel, explore Taj Mahal, Jaipur Palaces, Charminar, Golkonda Fort, and Hampi Ruins. These work well if you want architecture, culture, and strong sightseeing routes.';
  }

  if (/(map|route|distance|nearby)\b/.test(normalized)) {
    return 'Use the Maps page to compare destinations, and the Smart Booking page will estimate route-aware travel pricing from your live location.';
  }

  return 'You can ask me for beach places, heritage destinations, hill stations, route help, or booking guidance, and I will point you to the best options in the app.';
};

const shouldUseLocalAiFallback = (error) => {
  if (!error) {
    return true;
  }

  if (error.response) {
    return false;
  }

  return true;
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

export const sendAiMessage = async (message) => {
  try {
    const response = await requestWithFallback({
      url: '/ai/chat',
      method: 'post',
      data: { message },
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
    return response.data;
  } catch (error) {
    if (shouldUseLocalAiFallback(error)) {
      console.error('Falling back to local AI chat reply', error);
      return {
        reply: buildLocalAiReply(message),
        provider: 'local-fallback',
      };
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
