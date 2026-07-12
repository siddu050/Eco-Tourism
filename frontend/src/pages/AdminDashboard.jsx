import React, { useEffect, useState } from 'react';
import { BadgeIndianRupee, ClipboardList, LineChart, Pencil, ShieldCheck, Trash2, Users } from 'lucide-react';
import { deleteAdminReview, getAdminOverview, updateAdminBooking, updateAdminLocation } from '../services/api';

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [locationForm, setLocationForm] = useState({ description: '', price_per_night: '', state: '' });
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [bookingForm, setBookingForm] = useState({ booking_status: '', payment_status: '', payment_reference: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAdminOverview();
        setOverview(data);
      } catch (error) {
        console.error('Failed to load admin dashboard', error);
      }
    };
    load();
  }, []);

  const startLocationEdit = (location) => {
    setEditingLocationId(location.id);
    setLocationForm({
      description: location.description,
      price_per_night: location.price_per_night,
      state: location.state,
    });
  };

  const saveLocation = async (locationId) => {
    try {
      const data = await updateAdminLocation(locationId, locationForm);
      setOverview((current) => ({
        ...current,
        locations: current.locations.map((item) => (item.id === locationId ? data.location : item)),
      }));
      setEditingLocationId(null);
    } catch (error) {
      console.error('Failed to update location', error);
    }
  };

  const startBookingEdit = (booking) => {
    setEditingBookingId(booking.id);
    setBookingForm({
      booking_status: booking.booking_status,
      payment_status: booking.payment_status,
      payment_reference: booking.payment_reference || '',
    });
  };

  const saveBooking = async (bookingId) => {
    try {
      const data = await updateAdminBooking(bookingId, bookingForm);
      setOverview((current) => ({
        ...current,
        bookings: current.bookings.map((item) => (item.id === bookingId ? data.booking : item)),
      }));
      setEditingBookingId(null);
    } catch (error) {
      console.error('Failed to update booking', error);
    }
  };

  const removeReview = async (reviewId) => {
    try {
      await deleteAdminReview(reviewId);
      setOverview((current) => ({
        ...current,
        reviews: current.reviews.filter((item) => item.id !== reviewId),
      }));
    } catch (error) {
      console.error('Failed to delete review', error);
    }
  };

  if (!overview) {
    return <div className="status-panel">Loading management console...</div>;
  }

  return (
    <div className="page-stack">
      <section className="page-hero page-hero--about">
        <div className="page-hero__content">
          <p className="section-eyebrow">Management Console</p>
          <h1>Client backend control center for catalog, bookings, reviews, and users.</h1>
          <p className="section-copy">
            This page acts as a backend UI website for client operations using the app’s main functionality set.
          </p>
        </div>
        <div className="orbital-card">
          <ShieldCheck size={24} />
          <p>Manage listings, booking states, payment references, and community moderation in one place.</p>
        </div>
      </section>

      <section className="stats-strip">
        <div className="stat-card"><strong>{overview.summary.total_locations}</strong><span>Locations</span></div>
        <div className="stat-card"><strong>{overview.summary.total_bookings}</strong><span>Bookings</span></div>
        <div className="stat-card"><strong>{overview.summary.total_reviews}</strong><span>Reviews</span></div>
        <div className="stat-card"><strong>{overview.summary.total_favorites}</strong><span>Favorites</span></div>
      </section>

      <section className="management-grid">
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Locations</p>
              <h2 className="section-title">Catalog management</h2>
            </div>
            <LineChart size={18} />
          </div>

          <div className="admin-grid">
            {overview.locations.map((location) => (
              <article key={location.id} className="admin-card">
                <div className="admin-card__header">
                  <h3>{location.name}</h3>
                  <button type="button" className="btn-secondary" onClick={() => startLocationEdit(location)}>
                    <Pencil size={15} /> Edit
                  </button>
                </div>
                {editingLocationId === location.id ? (
                  <div className="admin-form">
                    <input className="input-field" value={locationForm.state} onChange={(e) => setLocationForm((c) => ({ ...c, state: e.target.value }))} />
                    <input className="input-field" type="number" value={locationForm.price_per_night} onChange={(e) => setLocationForm((c) => ({ ...c, price_per_night: e.target.value }))} />
                    <textarea className="input-field review-form__textarea" value={locationForm.description} onChange={(e) => setLocationForm((c) => ({ ...c, description: e.target.value }))} />
                    <button type="button" className="btn-primary" onClick={() => saveLocation(location.id)}>Save</button>
                  </div>
                ) : (
                  <>
                    <p>{location.description}</p>
                    <p>{location.state}</p>
                    <strong>Rs. {location.price_per_night}/night</strong>
                    <span>{location.average_rating || 0} rating | {location.review_count} reviews</span>
                  </>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Bookings</p>
              <h2 className="section-title">Payment and reservation control</h2>
            </div>
            <ClipboardList size={18} />
          </div>

          <div className="admin-list">
            {overview.bookings.map((booking) => (
              <article key={booking.id} className="admin-row-card">
                <div className="admin-row-card__header">
                  <div>
                    <strong>#{booking.id} - {booking.location?.name}</strong>
                    <p>{booking.check_in_date} to {booking.check_out_date} | {booking.guests} guest(s)</p>
                  </div>
                  <button type="button" className="btn-secondary" onClick={() => startBookingEdit(booking)}>
                    <BadgeIndianRupee size={15} /> Manage
                  </button>
                </div>

                {editingBookingId === booking.id ? (
                  <div className="admin-form admin-form--row">
                    <select className="input-field" value={bookingForm.booking_status} onChange={(e) => setBookingForm((c) => ({ ...c, booking_status: e.target.value }))}>
                      <option value="confirmed">confirmed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                    <select className="input-field" value={bookingForm.payment_status} onChange={(e) => setBookingForm((c) => ({ ...c, payment_status: e.target.value }))}>
                      <option value="pending">pending</option>
                      <option value="paid">paid</option>
                      <option value="refund_pending">refund_pending</option>
                    </select>
                    <input className="input-field" value={bookingForm.payment_reference} onChange={(e) => setBookingForm((c) => ({ ...c, payment_reference: e.target.value }))} placeholder="Payment reference" />
                    <button type="button" className="btn-primary" onClick={() => saveBooking(booking.id)}>Save booking</button>
                  </div>
                ) : (
                  <div className="admin-row-card__meta">
                    <span className="status-chip">{booking.booking_status}</span>
                    <span className="status-chip">{booking.payment_status}</span>
                    <span>Rs. {booking.total_price}</span>
                    <span>{booking.payment_reference || 'No reference yet'}</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Reviews</p>
              <h2 className="section-title">Moderation queue</h2>
            </div>
            <Trash2 size={18} />
          </div>

          <div className="admin-list">
            {overview.reviews.map((review) => (
              <article key={review.id} className="admin-row-card">
                <div className="admin-row-card__header">
                  <div>
                    <strong>{review.username}</strong>
                    <p>{review.rating}/5 | Review #{review.id}</p>
                  </div>
                  <button type="button" className="btn-secondary" onClick={() => removeReview(review.id)}>
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
                <p>{review.comment}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Users</p>
              <h2 className="section-title">Client account overview</h2>
            </div>
            <Users size={18} />
          </div>

          <div className="admin-list">
            {overview.users.map((user) => (
              <article key={user.id} className="admin-row-card">
                <div className="admin-row-card__header">
                  <div>
                    <strong>{user.username}</strong>
                    <p>{user.email}</p>
                  </div>
                </div>
                <div className="admin-row-card__meta">
                  <span>{user.booking_count} bookings</span>
                  <span>{user.favorite_count} favorites</span>
                  <span>{user.review_count} reviews</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
};

export default AdminDashboard;
