import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, ExternalLink, Landmark, MapPin, QrCode, ReceiptIndianRupee, Wallet } from 'lucide-react';
import {
  buildUpiQrUrl,
  cancelBooking,
  getBookingById,
  resolveImageUrl,
  FALLBACK_IMAGE_URL,
  UPI_ID,
} from '../services/api';

const paymentModes = [
  { id: 'upi', label: 'UPI', icon: QrCode, state: 'active' },
  { id: 'card', label: 'Cards', icon: CreditCard, state: 'coming_soon' },
  { id: 'netbanking', label: 'Net Banking', icon: Landmark, state: 'coming_soon' },
  { id: 'wallet', label: 'Wallets', icon: Wallet, state: 'coming_soon' },
];

const BookingConfirmation = ({ user }) => {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [actionStatus, setActionStatus] = useState('');
  const upiScannerRef = useRef(null);
  const pricingBreakdown = booking?.pricing_breakdown || null;
  const transportSummary = pricingBreakdown?.transport || null;

  useEffect(() => {
    if (!user) {
      navigate('/auth', { state: { from: `/booking-confirmation/${bookingId}` } });
      return;
    }

    if (booking) {
      return;
    }

    const loadBooking = async () => {
      try {
        const data = await getBookingById(bookingId);
        setBooking(data.booking);
      } catch (error) {
        console.error('Failed to fetch booking confirmation', error);
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [booking, bookingId, navigate, user]);

  const upiQrUrl = useMemo(() => {
    if (!booking?.location) {
      return '';
    }

    return buildUpiQrUrl({
      amount: booking.total_price,
      bookingId: booking.id,
      locationName: booking.location.name,
    });
  }, [booking]);

  const handleCancelBooking = async () => {
    try {
      setActionStatus('cancelling');
      const data = await cancelBooking(booking.id);
      setBooking(data.booking);
      setActionStatus('cancelled');
    } catch (error) {
      console.error('Failed to cancel booking', error);
      setActionStatus('error');
    }
  };

  const handleUpiScannerRedirect = () => {
    upiScannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return <div className="status-panel">Loading your booking confirmation...</div>;
  }

  if (!booking?.location) {
    return <div className="status-panel">Booking confirmation could not be loaded.</div>;
  }

  return (
    <div className="page-stack">
      <section className="confirmation-shell">
        <div className="confirmation-card">
          <div className="confirmation-badge">
            <CheckCircle2 size={22} />
            <span>Booking Confirmed</span>
          </div>
          <h1>Your trip to {booking.location.name} is reserved.</h1>
          <p className="section-copy">
            Review your stay details below, pay through UPI, and track the payment and trip status from My Trips.
          </p>

          <div className="confirmation-meta-grid">
            <div className="map-meta-card">
              <strong>Booking ID:</strong><span>#{booking.id}</span>
              <strong>Check-in:</strong><span>{booking.check_in_date}</span>
              <strong>Check-out:</strong><span>{booking.check_out_date}</span>
              <strong>Guests:</strong><span>{booking.guests}</span>
              <strong>Booking status:</strong><span>{booking.booking_status}</span>
              <strong>Payment status:</strong><span>{booking.payment_status}</span>
              {transportSummary?.label ? (
                <>
                  <strong>Travel mode:</strong><span>{transportSummary.label}</span>
                  {transportSummary.car_label ? (
                    <>
                      <strong>Car type:</strong><span>{transportSummary.car_label}</span>
                    </>
                  ) : null}
                </>
              ) : null}
              {pricingBreakdown?.nights ? (
                <>
                  <strong>Nights:</strong><span>{pricingBreakdown.nights}</span>
                  <strong>Distance:</strong><span>{pricingBreakdown.distance_km ? `${pricingBreakdown.distance_km} km` : 'Not shared'}</span>
                </>
              ) : null}
            </div>

            <div className="payment-card">
              <div className="payment-card__header">
                <ReceiptIndianRupee size={20} />
                <strong>Payment Gateway</strong>
              </div>
              <p>Amount due: Rs. {booking.total_price}</p>
              <div className="payment-mode-grid">
                {paymentModes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <div
                      key={mode.id}
                      className={`payment-mode-card${mode.id === 'upi' ? ' payment-mode-card--active' : ''}`}
                    >
                      <Icon size={18} />
                      <span>{mode.label}</span>
                      <small>{mode.state === 'active' ? 'Available now' : 'Coming soon'}</small>
                    </div>
                  );
                })}
              </div>
              <div className="payment-card__actions">
                <button type="button" className="btn-primary" onClick={handleUpiScannerRedirect}>
                  Go to UPI scanner <QrCode size={16} />
                </button>
              </div>
              <small>UPI ID: {UPI_ID}. Use the scanner below to pay from any UPI app.</small>
            </div>
          </div>

          {pricingBreakdown && (
            <div className="pricing-breakdown-card">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Smart Pricing</p>
                  <h2 className="section-title">Distance and facility breakdown</h2>
                </div>
              </div>

              <div className="pricing-breakdown-card__rows">
                <div className="booking-price-row">
                  <span>Stay subtotal</span>
                  <strong>Rs. {pricingBreakdown.stay_amount || 0}</strong>
                </div>
                <div className="booking-price-row">
                  <span>{transportSummary?.label ? 'Transport estimate' : 'Distance surcharge'}</span>
                  <strong>Rs. {(pricingBreakdown.transport_cost ?? pricingBreakdown.distance_surcharge) || 0}</strong>
                </div>
                {transportSummary?.airport_transfer && (
                  <div className="booking-price-row">
                    <span>{transportSummary.airport_transfer.label}</span>
                    <strong>Rs. {pricingBreakdown.airport_transfer_cost || 0}</strong>
                  </div>
                )}
                <div className="booking-price-row">
                  <span>Nearby services</span>
                  <strong>Rs. {pricingBreakdown.facility_total || 0}</strong>
                </div>
              </div>

              {pricingBreakdown.selected_facilities?.length > 0 && (
                <div className="booking-selected-services">
                  {pricingBreakdown.selected_facilities.map((facility) => (
                    <div key={facility.id} className="booking-selected-services__item">
                      <span>{facility.title}</span>
                      <strong>Rs. {facility.price}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="confirmation-inline-actions">
                {pricingBreakdown.google_maps?.directions_url && (
                  <a className="btn-secondary" href={pricingBreakdown.google_maps.directions_url} target="_blank" rel="noreferrer">
                    Open {pricingBreakdown.google_maps.route_label || 'route in Google Maps'} <ExternalLink size={16} />
                  </a>
                )}
                {pricingBreakdown.selected_facilities?.[0]?.googleMapsUrl && (
                  <a className="btn-secondary" href={pricingBreakdown.selected_facilities[0].googleMapsUrl} target="_blank" rel="noreferrer">
                    Nearby services on Google Maps <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>
          )}

          <div ref={upiScannerRef} className="qr-card">
            <div>
              <p className="section-eyebrow">UPI QR</p>
              <h3>Scan and pay</h3>
              <p>Open any UPI app, scan this QR, and then confirm the payment here.</p>
            </div>
            <img src={upiQrUrl} alt="UPI QR code" />
          </div>

          <div className="confirmation-inline-actions">
            <Link to="/my-trips" className="btn-secondary">Go to My Trips</Link>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancelBooking}
              disabled={booking.booking_status === 'cancelled' || actionStatus === 'cancelling'}
            >
              {booking.booking_status === 'cancelled' ? 'Trip cancelled' : 'Cancel booking'}
            </button>
          </div>

          {actionStatus === 'cancelled' && <div className="alert-card">Booking cancelled. Paid trips are now marked refund pending.</div>}
          {actionStatus === 'error' && <div className="alert-card">Could not update the booking right now. Please try again.</div>}
        </div>

        <div className="confirmation-preview">
          <img
            src={resolveImageUrl(booking.location.image_url)}
            alt={booking.location.name}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = FALLBACK_IMAGE_URL;
            }}
          />
          <div className="confirmation-preview__body">
            <p className="section-eyebrow">Trip Summary</p>
            <h2>{booking.location.name}</h2>
            <div className="inline-meta">
              <MapPin size={16} />
              <span>{booking.location.state}</span>
            </div>
            <p>Stay rate: Rs. {booking.location.price_per_night}/night</p>
            <p>Reference: {booking.payment_reference || 'Will appear after payment confirmation'}</p>
            <div className="confirmation-preview__actions">
              <Link to="/my-trips" className="btn-secondary">Trip history</Link>
              <Link to={`/location/${booking.location.id}`} className="btn-secondary">Back to destination</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default BookingConfirmation;
