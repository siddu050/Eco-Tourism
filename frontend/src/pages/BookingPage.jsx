import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDays,
  Coffee,
  ExternalLink,
  Hotel,
  IndianRupee,
  LocateFixed,
  MapPin,
  Navigation,
  Route,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import {
  createBooking,
  getLocationById,
  resolveImageUrl,
  FALLBACK_IMAGE_URL,
} from '../services/api';
import {
  buildFacilityOptions,
  buildGoogleSearchUrl,
  buildPricingBreakdown,
  carTypeOptions,
  calculateDistanceKm,
  calculateNights,
  getDefaultTransportMode,
  getDestinationCoordinates,
  getTransportOptionsForBooking,
} from '../utils/travel';

const draftKeyFor = (locationId) => `booking-draft-${locationId}`;

const facilityIcons = {
  food: UtensilsCrossed,
  beverage: Coffee,
  residence: Hotel,
};

const BookingPage = ({ user }) => {
  const { id } = useParams();
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const seededDestination = routerLocation.state?.destination || null;
  const [destination, setDestination] = useState(seededDestination);
  const [loading, setLoading] = useState(!seededDestination);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [transportMode, setTransportMode] = useState('car');
  const [carType, setCarType] = useState('hatchback');
  const [selectedFacilityIds, setSelectedFacilityIds] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [geoStatus, setGeoStatus] = useState('Checking your live location for travel pricing...');
  const [submitStatus, setSubmitStatus] = useState('');

  useEffect(() => {
    const seedState = routerLocation.state || {};
    const draftRaw = sessionStorage.getItem(draftKeyFor(id));

    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw);
        setCheckIn(draft.checkIn || '');
        setCheckOut(draft.checkOut || '');
        setGuests(draft.guests || 1);
        setTransportMode(draft.transportMode || 'car');
        setCarType(draft.carType || 'hatchback');
        setSelectedFacilityIds(draft.selectedFacilityIds || []);
        return;
      } catch (error) {
        console.error('Failed to parse booking draft', error);
      }
    }

    setCheckIn(seedState.checkIn || '');
    setCheckOut(seedState.checkOut || '');
    setGuests(seedState.guests || 1);
    setTransportMode(seedState.transportMode || 'car');
    setCarType(seedState.carType || 'hatchback');
    setSelectedFacilityIds(seedState.selectedFacilityIds || []);
  }, [id, routerLocation.state]);

  useEffect(() => {
    sessionStorage.setItem(
      draftKeyFor(id),
      JSON.stringify({
        checkIn,
        checkOut,
        guests,
        transportMode,
        carType,
        selectedFacilityIds,
      })
    );
  }, [carType, checkIn, checkOut, guests, id, selectedFacilityIds, transportMode]);

  useEffect(() => {
    const fetchDestination = async () => {
      try {
        const data = await getLocationById(id);
        setDestination(data.location);
      } catch (error) {
        console.error('Failed to load destination for booking', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDestination();
  }, [id]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('Live location is not supported in this browser, so distance pricing is skipped.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setGeoStatus('Live location connected. Distance-based pricing is now active.');
      },
      () => {
        setGeoStatus('Allow location access to include distance-based travel pricing and route guidance.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const destinationCoords = useMemo(
    () => (destination ? getDestinationCoordinates(destination.name) : null),
    [destination]
  );
  const nights = useMemo(() => calculateNights(checkIn, checkOut), [checkIn, checkOut]);
  const distanceKm = useMemo(
    () => calculateDistanceKm(userPosition, destinationCoords),
    [destinationCoords, userPosition]
  );
  const availableTransportOptions = useMemo(
    () => getTransportOptionsForBooking({ location: destination, distanceKm }),
    [destination, distanceKm]
  );
  const facilityOptions = useMemo(
    () => buildFacilityOptions({ location: destination, nights, guests: Number(guests) }),
    [destination, nights, guests]
  );
  const pricing = useMemo(
    () =>
      destination
        ? buildPricingBreakdown({
            location: destination,
            nights,
            distanceKm,
            selectedFacilityIds,
            origin: userPosition,
            destination: destinationCoords,
            guests: Number(guests),
            transportMode,
            carType,
          })
        : null,
    [carType, destination, nights, distanceKm, selectedFacilityIds, userPosition, destinationCoords, guests, transportMode]
  );

  useEffect(() => {
    if (!destination || availableTransportOptions.length === 0) {
      return;
    }

    const isCurrentModeAllowed = availableTransportOptions.some((option) => option.id === transportMode);
    if (!isCurrentModeAllowed) {
      setTransportMode(getDefaultTransportMode({ location: destination, distanceKm }));
    }
  }, [availableTransportOptions, destination, distanceKm, transportMode]);

  const routeSearchUrl = useMemo(() => {
    if (!destination) {
      return '';
    }

    return buildGoogleSearchUrl(`${destination.name}, ${destination.state}, India`);
  }, [destination]);

  const handleToggleFacility = (facilityId) => {
    setSelectedFacilityIds((current) =>
      current.includes(facilityId)
        ? current.filter((item) => item !== facilityId)
        : [...current, facilityId]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      navigate('/auth', { state: { from: `/location/${id}/book` } });
      return;
    }

    try {
      setSubmitStatus('loading');
      const data = await createBooking({
        location_id: Number(id),
        check_in_date: checkIn,
        check_out_date: checkOut,
        guests: Number(guests),
        total_price: pricing?.total_price,
        pricing_breakdown: pricing,
      });
      sessionStorage.removeItem(draftKeyFor(id));
      navigate(`/booking-confirmation/${data.booking_id}`, { state: { booking: data.booking } });
    } catch (error) {
      console.error('Failed to create smart booking', error);
      setSubmitStatus('error');
    }
  };

  if (loading) {
    return <div className="status-panel">Preparing your smart booking page...</div>;
  }

  if (!destination) {
    return <div className="status-panel">Destination not found for booking.</div>;
  }

  return (
    <div className="page-stack">
      <section className="page-hero booking-page-hero">
        <div className="page-hero__content">
          <p className="section-eyebrow">Smart Booking</p>
          <h1>Plan your route, choose your travel mode, and book {destination.name} with travel-aware pricing.</h1>
          <p className="section-copy">
            This page estimates transport cost from your current location, lets travelers choose bus, flight, or a
            preferred car type, adds optional services, and links the whole trip into Google Maps.
          </p>
        </div>

        <div className="booking-page-hero__stats">
          <div className="hero-glance">
            <span className="hero-glance__label">Live booking status</span>
            <strong>{geoStatus}</strong>
            <p>{pricing?.distance_km ? `${pricing.distance_km} km from your current location to the destination.` : 'Distance pricing will appear after location access is available.'}</p>
          </div>
        </div>
      </section>

      <section className="booking-workspace">
        <div className="booking-workspace__main">
          <div className="booking-route-card">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Route Overview</p>
                <h2 className="section-title">Your location to destination</h2>
              </div>
              <Route size={20} />
            </div>

            <div className="booking-route-card__grid">
              <div className="booking-route-point">
                <LocateFixed size={18} />
                <div>
                  <strong>Your live location</strong>
                  <p>{userPosition ? `${userPosition.lat.toFixed(4)}, ${userPosition.lon.toFixed(4)}` : geoStatus}</p>
                </div>
              </div>
              <div className="booking-route-point">
                <MapPin size={18} />
                <div>
                  <strong>{destination.name}</strong>
                  <p>{destination.state}, India</p>
                </div>
              </div>
            </div>

              <div className="booking-route-card__actions">
                {pricing?.google_maps?.directions_url && (
                  <a className="btn-primary" href={pricing.google_maps.directions_url} target="_blank" rel="noreferrer">
                    Open {pricing.google_maps.route_label || 'Google route'} <ExternalLink size={16} />
                  </a>
                )}
                <a className="btn-secondary" href={routeSearchUrl} target="_blank" rel="noreferrer">
                  Open destination on Google Maps <ExternalLink size={16} />
                </a>
              </div>

              {pricing?.google_maps?.route_note && (
                <small className="booking-form__hint">{pricing.google_maps.route_note}</small>
              )}

            {pricing?.google_maps?.destination_embed_url && (
              <iframe
                className="booking-map-frame"
                title="Google route preview"
                src={pricing.google_maps.directions_embed_url || pricing.google_maps.destination_embed_url}
                loading="lazy"
              />
            )}
          </div>

          <div className="booking-facilities-card">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Nearby Facilities</p>
                <h2 className="section-title">Food, beverage, and residence services</h2>
              </div>
              <Navigation size={20} />
            </div>

            <div className="facility-grid">
              {facilityOptions.map((facility) => {
                const Icon = facilityIcons[facility.id] || MapPin;
                const isSelected = selectedFacilityIds.includes(facility.id);

                return (
                  <article
                    key={facility.id}
                    className={`facility-card${isSelected ? ' facility-card--active' : ''}`}
                  >
                    <div className="facility-card__header">
                      <div className="facility-card__icon">
                        <Icon size={18} />
                      </div>
                      <div>
                        <h3>{facility.title}</h3>
                        <p>{facility.priceLabel}</p>
                      </div>
                    </div>
                    <p>{facility.description}</p>
                    <strong>Rs. {facility.price}</strong>
                    <div className="facility-card__actions">
                      <button
                        type="button"
                        className={isSelected ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => handleToggleFacility(facility.id)}
                      >
                        {isSelected ? 'Included' : 'Add service'}
                      </button>
                      <a className="btn-secondary" href={facility.googleMapsUrl} target="_blank" rel="noreferrer">
                        Nearby on Google <ExternalLink size={16} />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="booking-summary-card">
          <img
            src={resolveImageUrl(destination.image_url)}
            alt={destination.name}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = FALLBACK_IMAGE_URL;
            }}
          />

          <div className="booking-summary-card__body">
            <p className="section-eyebrow">Booking Summary</p>
            <h2>{destination.name}</h2>
            <div className="inline-meta">
              <MapPin size={16} />
              <span>{destination.state}</span>
            </div>

            <form className="booking-form" onSubmit={handleSubmit}>
              <div>
                <label className="form-label"><CalendarDays size={16} /> Check-in</label>
                <input type="date" className="input-field" required value={checkIn} onChange={(event) => setCheckIn(event.target.value)} />
              </div>
              <div>
                <label className="form-label"><CalendarDays size={16} /> Check-out</label>
                <input type="date" className="input-field" required value={checkOut} onChange={(event) => setCheckOut(event.target.value)} />
              </div>
              <div>
                <label className="form-label"><Users size={16} /> Guests</label>
                <input type="number" min="1" className="input-field" required value={guests} onChange={(event) => setGuests(event.target.value)} />
              </div>
              <div>
                <label className="form-label"><Navigation size={16} /> Travel mode</label>
                <select
                  className="input-field"
                  value={transportMode}
                  onChange={(event) => setTransportMode(event.target.value)}
                >
                  {availableTransportOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <small className="booking-form__hint">
                  {pricing?.transport?.description || 'Choose how you want to reach the destination.'}
                </small>
              </div>
              {transportMode === 'car' && (
                <div>
                  <label className="form-label"><Navigation size={16} /> Car type</label>
                  <select
                    className="input-field"
                    value={carType}
                    onChange={(event) => setCarType(event.target.value)}
                  >
                    {carTypeOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="booking-summary-card__pricing">
                <div className="booking-price-row">
                  <span>Nightly stay</span>
                  <strong>Rs. {destination.price_per_night}</strong>
                </div>
                <div className="booking-price-row">
                  <span>Nights</span>
                  <strong>{pricing?.nights || nights}</strong>
                </div>
                <div className="booking-price-row">
                  <span>Stay subtotal</span>
                  <strong>Rs. {pricing?.stay_amount || 0}</strong>
                </div>
                <div className="booking-price-row">
                  <span>Travel mode</span>
                  <strong>{pricing?.transport?.label || 'Bus'}</strong>
                </div>
                {pricing?.transport?.car_label && (
                  <div className="booking-price-row">
                    <span>Car type</span>
                    <strong>{pricing.transport.car_label}</strong>
                  </div>
                )}
                <div className="booking-price-row">
                  <span>Transport estimate</span>
                  <strong>Rs. {pricing?.transport_cost || 0}</strong>
                </div>
                {pricing?.transport?.airport_transfer && (
                  <div className="booking-price-row">
                    <span>{pricing.transport.airport_transfer.label}</span>
                    <strong>Rs. {pricing.airport_transfer_cost || 0}</strong>
                  </div>
                )}
                <div className="booking-price-row">
                  <span>Nearby services</span>
                  <strong>Rs. {pricing?.facility_total || 0}</strong>
                </div>
                <div className="booking-price-row booking-price-row--total">
                  <span>Total payable</span>
                  <strong><IndianRupee size={16} /> {pricing?.total_price || 0}</strong>
                </div>
              </div>

              {pricing?.selected_facilities?.length > 0 && (
                <div className="booking-selected-services">
                  {pricing.selected_facilities.map((facility) => (
                    <div key={facility.id} className="booking-selected-services__item">
                      <span>{facility.title}</span>
                      <strong>Rs. {facility.price}</strong>
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" className="btn-primary booking-panel__submit" disabled={submitStatus === 'loading'}>
                {submitStatus === 'loading' ? 'Creating booking...' : 'Confirm smart booking'}
              </button>
              {submitStatus === 'error' && (
                <div className="alert-card">We could not create this booking right now. Please try again.</div>
              )}
            </form>

            <div className="booking-summary-card__links">
              <Link to={`/location/${destination.id}`} className="btn-secondary">Back to destination</Link>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default BookingPage;
