import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Heart,
  IndianRupee,
  MapPin,
  MessageSquareQuote,
  Star,
  Share2,
  Calendar,
  Users,
  ShieldCheck,
  Leaf,
  Coffee,
  Sun,
  Compass,
  ArrowRight,
  Maximize2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  addFavorite,
  addLocationReview,
  getLocationById,
  getLocationReviews,
  removeFavorite,
  resolveImageUrl,
  FALLBACK_IMAGE_URL,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import ImageLightbox from '../components/ImageLightbox';

const RATING_LABELS = {
  1: '1 Star - Needs Improvement',
  2: '2 Stars - Fair Experience',
  3: '3 Stars - Good & Comfortable',
  4: '4 Stars - Very Good & Scenic',
  5: '5 Stars - Outstanding Eco-Stay!',
};

const ECO_HIGHLIGHTS = [
  { icon: Leaf, title: 'Eco-Certified Stay', desc: 'Complies with sustainable tourism and waste standards.' },
  { icon: Sun, title: 'Solar Powered', desc: 'Uses renewable energy for lighting and water heating.' },
  { icon: Coffee, title: 'Farm-to-Table Meals', desc: 'Fresh organic meals prepared by local cooks.' },
  { icon: Compass, title: 'Guided Nature Walks', desc: 'Low-impact trails guided by resident naturalists.' },
];

const LocationDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [location, setLocation] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Interactive stay calculator state
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [mealAddon, setMealAddon] = useState(true);
  const [guideAddon, setGuideAddon] = useState(false);

  // Review form state
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  // Set default dates (tomorrow and 3 days later)
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const threeDays = new Date(today);
    threeDays.setDate(today.getDate() + 4);

    setCheckIn(tomorrow.toISOString().split('T')[0]);
    setCheckOut(threeDays.toISOString().split('T')[0]);
  }, []);

  const calculateNights = useMemo(() => {
    if (!checkIn || !checkOut) return 3;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkIn, checkOut]);

  const estimatedTotal = useMemo(() => {
    if (!location) return 0;
    const baseStay = (location.price_per_night || 2500) * calculateNights;
    const guestMultiplier = guests > 2 ? 1 + (guests - 2) * 0.35 : 1;
    let total = baseStay * guestMultiplier;

    if (mealAddon) total += 600 * guests * calculateNights;
    if (guideAddon) total += 1200 * calculateNights;

    return Math.round(total);
  }, [location, calculateNights, guests, mealAddon, guideAddon]);

  const handleBooking = () => {
    navigate(`/location/${id}/book`, {
      state: {
        destination: location,
        checkIn,
        checkOut,
        guests,
      },
    });
  };

  const handleFavoriteToggle = async () => {
    if (!user) {
      addToast('Please sign in to save this destination', 'info');
      navigate('/auth', { state: { from: `/location/${id}` } });
      return;
    }

    try {
      if (location.is_favorite) {
        await removeFavorite(location.id);
        setLocation((current) => ({ ...current, is_favorite: false }));
        addToast(`Removed ${location.name} from favorites`, 'info');
      } else {
        await addFavorite(location.id);
        setLocation((current) => ({ ...current, is_favorite: true }));
        addToast(`Saved ${location.name} to favorites ❤️`, 'favorite');
      }
    } catch (error) {
      console.error('Favorite toggle failed', error);
      addToast('Could not update favorites. Please try again.', 'error');
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      addToast('Destination link copied to clipboard!', 'success');
    } else {
      addToast(`Share link: ${url}`, 'info');
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      addToast('Please sign in to submit a review', 'info');
      navigate('/auth', { state: { from: `/location/${id}` } });
      return;
    }

    if (!reviewComment.trim()) {
      addToast('Please share your thoughts in the comment', 'error');
      return;
    }

    try {
      setSubmittingReview(true);
      const data = await addLocationReview(id, {
        rating: selectedRating,
        comment: reviewComment.trim(),
      });
      setReviews((current) => [data.review, ...current]);
      setReviewComment('');
      setLocation((current) => ({
        ...current,
        review_count: (current.review_count || 0) + 1,
        average_rating: current.average_rating
          ? (((current.average_rating * current.review_count) + data.review.rating) / (current.review_count + 1)).toFixed(1)
          : data.review.rating,
      }));
      addToast('Thank you! Your review has been posted ⭐', 'success');
    } catch (error) {
      console.error('Failed to submit review', error);
      addToast('Failed to post review. Please try again.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <div className="status-panel">Loading destination details...</div>;
  }

  if (!location) {
    return (
      <div className="status-panel">
        <p>Destination not found.</p>
        <Link to="/" className="btn-secondary">
          Back to Home
        </Link>
      </div>
    );
  }

  const galleryImages = [location.image_url];

  return (
    <div className="page-stack">
      {/* Top Breadcrumb & Actions */}
      <div className="details-nav-bar">
        <div className="inline-meta">
          <Link to="/" className="text-link">Home</Link>
          <span>/</span>
          <Link to="/discover" className="text-link">Discover</Link>
          <span>/</span>
          <span>{location.name}</span>
        </div>

        <div className="details-nav-actions">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={handleShare}
            title="Share destination"
          >
            <Share2 size={15} /> Share
          </button>
          <button
            type="button"
            className={`btn-secondary btn-sm${location.is_favorite ? ' favorite-action--active' : ''}`}
            onClick={handleFavoriteToggle}
          >
            <Heart size={15} /> {location.is_favorite ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Details Shell */}
      <section className="details-shell">
        <div className="details-shell__content">
          {/* Main Hero Media */}
          <div className="details-media-stage">
            <img
              className="details-shell__image"
              src={resolveImageUrl(location.image_url)}
              alt={location.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = FALLBACK_IMAGE_URL;
              }}
            />
            <button
              type="button"
              className="media-zoom-btn"
              onClick={() => setIsLightboxOpen(true)}
              aria-label="View full image"
            >
              <Maximize2 size={16} /> Full View
            </button>
            <div className="details-media-tag">
              <Sparkles size={14} />
              <span>Verified Eco-Stay</span>
            </div>
          </div>

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
              <div className="rating-chip">
                <Star size={15} />
                <span>{location.average_rating || 4.8} ({location.review_count || 14} reviews)</span>
              </div>
            </div>

            <p className="section-copy details-description">{location.description}</p>

            {/* Eco Highlights Grid */}
            <div className="eco-highlights-section">
              <h3>Eco-Conscious Features</h3>
              <div className="eco-features-grid">
                {ECO_HIGHLIGHTS.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="eco-feature-card">
                      <div className="eco-feature-icon">
                        <Icon size={18} />
                      </div>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="story-card">
              <MessageSquareQuote size={22} />
              <div>
                <strong>Curator's Travel Note</strong>
                <p>
                  Ideal for mindful slow travelers. We recommend booking sunrise trails or tea walks at check-in for the quietest experience.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Interactive Stay Estimator & Booking Widget */}
        <aside className="booking-panel booking-panel--sticky">
          <div className="booking-panel__header">
            <div>
              <span className="booking-panel__eyebrow">Interactive Estimator</span>
              <h2>Plan & Reserve Stay</h2>
            </div>
            <div className="booking-panel__rate">
              <strong>Rs. {location.price_per_night}</strong>
              <small>/ night</small>
            </div>
          </div>

          <div className="estimator-form">
            <div className="estimator-date-grid">
              <div>
                <label className="form-label">
                  <Calendar size={13} /> Check-In
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">
                  <Calendar size={13} /> Check-Out
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>

            <div className="estimator-guests">
              <label className="form-label">
                <Users size={13} /> Number of Guests
              </label>
              <div className="guests-stepper">
                <button
                  type="button"
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  disabled={guests <= 1}
                >
                  -
                </button>
                <span>{guests} {guests === 1 ? 'Guest' : 'Guests'}</span>
                <button
                  type="button"
                  onClick={() => setGuests(Math.min(8, guests + 1))}
                  disabled={guests >= 8}
                >
                  +
                </button>
              </div>
            </div>

            <div className="estimator-addons">
              <span className="form-label">Curated Experience Add-ons</span>
              <label className="addon-checkbox">
                <input
                  type="checkbox"
                  checked={mealAddon}
                  onChange={(e) => setMealAddon(e.target.checked)}
                />
                <span>Organic Farm-to-Table Meal Plan (+Rs. 600/day/guest)</span>
              </label>
              <label className="addon-checkbox">
                <input
                  type="checkbox"
                  checked={guideAddon}
                  onChange={(e) => setGuideAddon(e.target.checked)}
                />
                <span>Private Local Naturalist Guide (+Rs. 1,200/day)</span>
              </label>
            </div>

            <div className="estimator-breakdown">
              <div className="breakdown-row">
                <span>Stay duration:</span>
                <strong>{calculateNights} {calculateNights === 1 ? 'night' : 'nights'}</strong>
              </div>
              <div className="breakdown-row">
                <span>Base stay rate:</span>
                <span>Rs. {((location.price_per_night || 2500) * calculateNights).toLocaleString('en-IN')}</span>
              </div>
              {mealAddon && (
                <div className="breakdown-row">
                  <span>Organic meals:</span>
                  <span>Rs. {(600 * guests * calculateNights).toLocaleString('en-IN')}</span>
                </div>
              )}
              {guideAddon && (
                <div className="breakdown-row">
                  <span>Nature guide:</span>
                  <span>Rs. {(1200 * calculateNights).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="breakdown-total">
                <span>Estimated Total:</span>
                <strong>Rs. {estimatedTotal.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary booking-panel__submit"
              onClick={handleBooking}
            >
              Continue to Smart Booking <ArrowRight size={16} />
            </button>

            <div className="booking-panel__trust">
              <ShieldCheck size={16} />
              <span>Free cancellation up to 48 hours before check-in</span>
            </div>
          </div>
        </aside>
      </section>

      {/* Reviews Section */}
      <section className="split-section">
        {/* Interactive Review Form */}
        <div className="review-form-card">
          <p className="section-eyebrow">Share Experience</p>
          <h2 className="section-title">Leave a Review</h2>
          <form className="review-form" onSubmit={handleReviewSubmit}>
            <div className="interactive-star-selector">
              <label className="form-label">Your Rating:</label>
              <div className="stars-row">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isLit = (hoverRating || selectedRating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn${isLit ? ' star-btn--lit' : ''}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setSelectedRating(star)}
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star size={24} fill={isLit ? 'currentColor' : 'none'} />
                    </button>
                  );
                })}
              </div>
              <span className="rating-preview-label">
                {RATING_LABELS[hoverRating || selectedRating]}
              </span>
            </div>

            <div>
              <label className="form-label">Your Review Comment:</label>
              <textarea
                className="input-field review-form__textarea"
                placeholder="How was the atmosphere, stay quality, and scenery? Share tips for fellow travelers..."
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submittingReview || !reviewComment.trim()}
            >
              {submittingReview ? 'Submitting review...' : 'Submit Review'}
            </button>
          </form>
        </div>

        {/* Review List */}
        <div className="review-list-card">
          <p className="section-eyebrow">Traveler Feedback</p>
          <h2 className="section-title">Recent Reviews ({reviews.length})</h2>
          <div className="review-list">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <article key={review.id} className="review-item">
                  <div className="review-item__header">
                    <div className="review-user-lockup">
                      <div className="review-user-avatar">
                        {review.username ? review.username[0].toUpperCase() : 'T'}
                      </div>
                      <strong>{review.username || 'Mindful Traveler'}</strong>
                    </div>
                    <div className="rating-chip rating-chip--inline">
                      <Star size={13} fill="currentColor" />
                      <span>{review.rating}/5</span>
                    </div>
                  </div>
                  <p>{review.comment}</p>
                </article>
              ))
            ) : (
              <div className="status-panel">
                <p>No reviews yet for {location.name}. Be the first to share your experience!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={galleryImages}
        currentIndex={lightboxIndex}
        onNavigate={(idx) => setLightboxIndex(idx)}
        title={location.name}
      />
    </div>
  );
};

export default LocationDetails;
