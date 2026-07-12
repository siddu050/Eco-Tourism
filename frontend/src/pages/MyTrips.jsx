import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, ExternalLink, MapPin, BriefcaseBusiness, X } from 'lucide-react';
import {
  buildUpiLink,
  cancelBooking,
  deleteBooking,
  getMyBookings,
  markBookingPaid,
  resolveImageUrl,
  FALLBACK_IMAGE_URL,
} from '../services/api';

const statusTone = {
  confirmed: 'status-chip status-chip--good',
  cancelled: 'status-chip status-chip--muted',
  pending: 'status-chip status-chip--warn',
  paid: 'status-chip status-chip--good',
  refund_pending: 'status-chip status-chip--warn',
};

const MyTrips = ({ user }) => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth', { state: { from: '/my-trips' } });
      return;
    }

    const loadTrips = async () => {
      try {
        const data = await getMyBookings();
        setBookings(data.bookings || []);
      } catch (error) {
        console.error('Failed to fetch trips', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrips();
  }, [navigate, user]);

  const updateBookingInList = (updatedBooking) => {
    setBookings((current) =>
      current.map((booking) => (booking.id === updatedBooking.id ? updatedBooking : booking))
    );
  };

  const removeBookingFromList = (bookingId) => {
    setBookings((current) => current.filter((booking) => booking.id !== bookingId));
  };

  const handleMarkPaid = async (booking) => {
    try {
      setActionLoadingId(booking.id);
      const data = await markBookingPaid(booking.id, { payment_method: 'upi' });
      updateBookingInList(data.booking);
    } catch (error) {
      console.error('Failed to mark payment', error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelBooking = async (booking) => {
    try {
      setActionLoadingId(booking.id);
      const data = await cancelBooking(booking.id);
      updateBookingInList(data.booking);
    } catch (error) {
      console.error('Failed to cancel booking', error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteHistoryBooking = async (booking) => {
    const shouldDelete = window.confirm(`Delete booking #${booking.id} from trip history permanently?`);
    if (!shouldDelete) {
      return;
    }

    try {
      setActionLoadingId(booking.id);
      await deleteBooking(booking.id);
      removeBookingFromList(booking.id);
    } catch (error) {
      console.error('Failed to delete booking history entry', error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const groupedTrips = useMemo(() => {
    const history = bookings.filter(
      (booking) => booking.booking_status === 'cancelled' || booking.payment_status === 'paid' || booking.payment_status === 'refund_pending'
    );
    const historyIds = new Set(history.map((booking) => booking.id));
    const active = bookings.filter((booking) => !historyIds.has(booking.id));
    return { active, history };
  }, [bookings]);

  const tripCountLabel = useMemo(() => `${bookings.length} saved trip${bookings.length === 1 ? '' : 's'}`, [bookings.length]);

  if (loading) {
    return <div className="status-panel">Loading your trips...</div>;
  }

  const renderTripCard = (booking, { isHistory = false } = {}) => {
    const upiLink = buildUpiLink({
      amount: booking.total_price,
      bookingId: booking.id,
      locationName: booking.location?.name || 'Trip',
    });
    const pricingBreakdown = booking.pricing_breakdown || null;
    const transportSummary = pricingBreakdown?.transport || null;

    return (
      <article key={booking.id} className="trip-card">
        {isHistory && (
          <button
            type="button"
            className="trip-card__delete"
            onClick={() => handleDeleteHistoryBooking(booking)}
            disabled={actionLoadingId === booking.id}
            aria-label={`Delete booking #${booking.id} from trip history`}
            title="Delete from trip history"
          >
            <X size={16} />
          </button>
        )}
        <img
          src={resolveImageUrl(booking.location?.image_url)}
          alt={booking.location?.name || 'Trip'}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = FALLBACK_IMAGE_URL;
          }}
        />
        <div className="trip-card__body">
          <div className="trip-card__header">
            <div>
              <h3>{booking.location?.name}</h3>
              <div className="inline-meta">
                <MapPin size={15} />
                <span>{booking.location?.state}</span>
              </div>
            </div>
            <strong>Rs. {booking.total_price}</strong>
          </div>

          <div className="trip-card__dates">
            <CalendarDays size={16} />
            <span>{booking.check_in_date} to {booking.check_out_date}</span>
          </div>

          <div className="trip-card__status-row">
            <span className={statusTone[booking.booking_status] || 'status-chip'}>{booking.booking_status}</span>
            <span className={statusTone[booking.payment_status] || 'status-chip'}>{booking.payment_status}</span>
          </div>

          <p>{booking.guests} guest(s) | Booking #{booking.id}</p>
          {transportSummary?.label ? (
            <p>
              Travel: {transportSummary.label}
              {transportSummary.car_label ? ` (${transportSummary.car_label})` : ''}
            </p>
          ) : null}
          {pricingBreakdown?.distance_km && <p>Distance priced from your location: {pricingBreakdown.distance_km} km</p>}
          {pricingBreakdown?.transport_cost ? <p>Transport estimate: Rs. {pricingBreakdown.transport_cost}</p> : null}
          {transportSummary?.airport_transfer ? (
            <p>{transportSummary.airport_transfer.label}: Rs. {pricingBreakdown?.airport_transfer_cost || 0}</p>
          ) : null}
          {pricingBreakdown?.facility_total ? <p>Added services: Rs. {pricingBreakdown.facility_total}</p> : null}
          <p>Payment ref: {booking.payment_reference || 'Pending'}</p>

          <div className="trip-card__actions">
            <a className="btn-primary" href={upiLink}>
              Pay via UPI <ExternalLink size={16} />
            </a>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleMarkPaid(booking)}
              disabled={booking.payment_status === 'paid' || booking.booking_status === 'cancelled' || actionLoadingId === booking.id}
            >
              Mark paid
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleCancelBooking(booking)}
              disabled={booking.booking_status === 'cancelled' || actionLoadingId === booking.id}
            >
              Cancel booking
            </button>
            <Link to={`/booking-confirmation/${booking.id}`} state={{ booking }} className="btn-secondary">
              View confirmation
            </Link>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="page-stack">
      <section className="page-hero page-hero--about">
        <div className="page-hero__content">
          <p className="section-eyebrow">My Trips</p>
          <h1>Keep every reservation, payment link, and travel plan in one place.</h1>
          <p className="section-copy">{tripCountLabel} ready to review, pay, or move into trip history.</p>
        </div>
        <div className="orbital-card">
          <BriefcaseBusiness size={24} />
          <p>Quick access to reservation summaries, payment statuses, and cancellation history.</p>
        </div>
      </section>

      {bookings.length === 0 ? (
        <section className="status-panel">
          No trips yet. Start from the destinations page and make your first booking.
        </section>
      ) : (
        <>
          <section className="section-block">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Active Trips</p>
                <h2 className="section-title">Current and upcoming reservations</h2>
              </div>
            </div>
            <div className="trip-grid">
              {groupedTrips.active.map((booking) => renderTripCard(booking))}
            </div>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Trip History</p>
                <h2 className="section-title">Paid, refunded, and cancelled bookings</h2>
              </div>
            </div>
            <div className="trip-grid">
              {groupedTrips.history.length > 0 ? groupedTrips.history.map((booking) => renderTripCard(booking, { isHistory: true })) : (
                <div className="status-panel">Your completed or cancelled trips will appear here.</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default MyTrips;
