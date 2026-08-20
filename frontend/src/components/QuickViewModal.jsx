import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  MapPin,
  Star,
  IndianRupee,
  Heart,
  Share2,
  ArrowRight,
  Sparkles,
  Calendar,
  ShieldCheck,
  Leaf,
  Compass,
} from 'lucide-react';
import { resolveImageUrl, FALLBACK_IMAGE_URL } from '../services/api';
import { useToast } from '../context/ToastContext';

export const QuickViewModal = ({
  location,
  isOpen,
  onClose,
  onToggleFavorite,
}) => {
  const [nights, setNights] = useState(2);
  const { addToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !location) return null;

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/location/${location.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      addToast(`Link to ${location.name} copied to clipboard!`, 'success');
    } else {
      addToast(`Destination: ${url}`, 'info');
    }
  };

  const estimatedTotal = (location.price_per_night || 2500) * nights;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="quick-view-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="quick-view-grid">
          <div className="quick-view-media">
            <img
              src={resolveImageUrl(location.image_url)}
              alt={location.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_IMAGE_URL;
              }}
            />
            <div className="quick-view-media__badge">
              <Leaf size={14} />
              <span>Eco-Conscious Stay</span>
            </div>
          </div>

          <div className="quick-view-info">
            <div className="quick-view-header">
              <div>
                <span className="section-eyebrow">Quick Preview</span>
                <h2 id="quick-view-title">{location.name}</h2>
                <div className="inline-meta">
                  <MapPin size={15} />
                  <span>{location.state}, India</span>
                  <span className="rating-chip rating-chip--inline">
                    <Star size={13} />
                    {location.average_rating || '4.8'} ({location.review_count || 12} reviews)
                  </span>
                </div>
              </div>

              <div className="quick-view-actions-top">
                <button
                  type="button"
                  className={`favorite-pill${location.is_favorite ? ' favorite-pill--active' : ''}`}
                  onClick={(e) => onToggleFavorite(e, location)}
                  title={location.is_favorite ? 'Remove from favorites' : 'Save to favorites'}
                >
                  <Heart size={16} />
                </button>
                <button
                  type="button"
                  className="share-pill"
                  onClick={handleShare}
                  title="Share destination"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            <p className="quick-view-description">{location.description}</p>

            <div className="quick-view-highlights">
              <div className="highlight-pill">
                <ShieldCheck size={14} />
                <span>Verified Eco Stays</span>
              </div>
              <div className="highlight-pill">
                <Compass size={14} />
                <span>Curated Trails</span>
              </div>
              <div className="highlight-pill">
                <Sparkles size={14} />
                <span>Zero Single-Use Plastic</span>
              </div>
            </div>

            <div className="quick-view-calc">
              <div className="calc-header">
                <span className="calc-label">Estimate Stay Budget</span>
                <div className="nights-stepper">
                  <button
                    type="button"
                    onClick={() => setNights(Math.max(1, nights - 1))}
                    disabled={nights <= 1}
                  >
                    -
                  </button>
                  <span>{nights} {nights === 1 ? 'Night' : 'Nights'}</span>
                  <button
                    type="button"
                    onClick={() => setNights(Math.min(14, nights + 1))}
                    disabled={nights >= 14}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="calc-price-row">
                <div className="rate-per-night">
                  <span>Rs. {location.price_per_night}</span>
                  <small>/ night</small>
                </div>
                <div className="calc-total">
                  <small>Estimated stay total:</small>
                  <strong>Rs. {estimatedTotal.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>

            <div className="quick-view-footer">
              <Link
                to={`/location/${location.id}/book`}
                className="btn-primary quick-view-book-btn"
                onClick={onClose}
              >
                Reserve Stay <ArrowRight size={16} />
              </Link>
              <Link
                to={`/location/${location.id}`}
                className="btn-secondary quick-view-details-btn"
                onClick={onClose}
              >
                Full Destination Story
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
