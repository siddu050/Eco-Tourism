import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, IndianRupee, MapPin, MessageSquareQuote, Star } from 'lucide-react';
import {
  addFavorite,
  addLocationReview,
  getLocationById,
  getLocationReviews,
  removeFavorite,
  resolveImageUrl,
  FALLBACK_IMAGE_URL,
} from '../services/api';

const LocationDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ rating: '5', comment: '' });

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const locationData = await getLocationById(id);
        setLocation(locationData.location);

        const reviewData = await getLocationReviews(id);
        setReviews(reviewData.reviews || []);
      } catch (error) {
        console.error('Error fetching location details', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [id]);

  const handleBooking = () => {
    navigate(`/location/${id}/book`, { state: { destination: location } });
  };

  const handleFavoriteToggle = async () => {
    if (!user) {
      navigate('/auth', { state: { from: `/location/${id}` } });
      return;
    }

    try {
      if (location.is_favorite) {
        await removeFavorite(location.id);
      } else {
        await addFavorite(location.id);
      }
      setLocation((current) => ({ ...current, is_favorite: !current.is_favorite }));
    } catch (error) {
      console.error('Favorite toggle failed', error);
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      navigate('/auth', { state: { from: `/location/${id}` } });
      return;
    }

    try {
      const data = await addLocationReview(id, {
        rating: parseInt(reviewForm.rating, 10),
        comment: reviewForm.comment,
      });
      setReviews((current) => [data.review, ...current]);
      setReviewForm({ rating: '5', comment: '' });
      setLocation((current) => ({
        ...current,
        review_count: (current.review_count || 0) + 1,
        average_rating: current.average_rating
          ? (((current.average_rating * current.review_count) + data.review.rating) / (current.review_count + 1)).toFixed(1)
          : data.review.rating,
      }));
    } catch (error) {
      console.error('Failed to submit review', error);
    }
  };

  if (loading) {
    return <div className="status-panel">Loading location details...</div>;
  }

  if (!location) {
    return <div className="status-panel">Location not found.</div>;
  }

  return (
    <div className="page-stack">
      <section className="details-shell">
        <div className="details-shell__content">
          <img
            className="details-shell__image"
            src={resolveImageUrl(location.image_url)}
            alt={location.name}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = FALLBACK_IMAGE_URL;
            }}
          />

          <div className="details-copy">
            <div className="details-copy__header">
              <div>
                <p className="section-eyebrow">Destination Story</p>
                <h1>{location.name}</h1>
              </div>
              <div className="price-badge">
                <IndianRupee size={18} />
                <span>{location.price_per_night}</span>
                <small>/ night</small>
              </div>
            </div>

            <div className="inline-meta inline-meta--large">
              <MapPin size={18} />
              <span>{location.state}, India</span>
              <Star size={16} />
              <span>{location.average_rating || 0} ({location.review_count || 0} reviews)</span>
            </div>

            <p className="section-copy">{location.description}</p>

            <div className="story-card">
              <MessageSquareQuote size={20} />
              <div>
                <strong>Guest sentiment</strong>
                <p>Travelers are using ratings and comments to guide bookings on this page now.</p>
              </div>
            </div>

            <button type="button" className={`btn-secondary favorite-action${location.is_favorite ? ' favorite-action--active' : ''}`} onClick={handleFavoriteToggle}>
              <Heart size={16} />
              {location.is_favorite ? 'Saved to favorites' : 'Save to favorites'}
            </button>
          </div>
        </div>

        <aside className="booking-panel">
          <h2>Reserve your stay</h2>
          <p className="section-copy">
            Continue to smart booking and enter your travel dates once while we prepare route pricing and stay options.
          </p>
          <button type="button" className="btn-primary booking-panel__submit" onClick={handleBooking}>
            Continue to smart booking
          </button>
        </aside>
      </section>

      <section className="split-section">
        <div className="review-form-card">
          <p className="section-eyebrow">Leave a Review</p>
          <h2 className="section-title">Rate this destination</h2>
          <form className="review-form" onSubmit={handleReviewSubmit}>
            <select
              className="input-field"
              value={reviewForm.rating}
              onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}
            >
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>
            <textarea
              className="input-field review-form__textarea"
              placeholder="Share your stay experience..."
              value={reviewForm.comment}
              onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
            />
            <button type="submit" className="btn-primary">Submit review</button>
          </form>
        </div>

        <div className="review-list-card">
          <p className="section-eyebrow">Recent Reviews</p>
          <h2 className="section-title">What travelers are saying</h2>
          <div className="review-list">
            {reviews.length > 0 ? reviews.map((review) => (
              <article key={review.id} className="review-item">
                <div className="review-item__header">
                  <strong>{review.username}</strong>
                  <span>{review.rating}/5</span>
                </div>
                <p>{review.comment}</p>
              </article>
            )) : (
              <div className="status-panel">No reviews yet. Be the first to write one.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LocationDetails;
