import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  Waves,
  Landmark,
  Trees,
  Sparkles,
  MapPin,
  Star,
  Eye,
  Heart,
} from 'lucide-react';
import { searchLocations, resolveImageUrl, FALLBACK_IMAGE_URL, addFavorite, removeFavorite } from '../services/api';
import { fallbackLocations } from '../data/fallbackLocations';
import { themes } from '../data/siteContent';
import { useToast } from '../context/ToastContext';
import QuickViewModal from '../components/QuickViewModal';

const themeIcons = [Landmark, Waves, Trees];

const MOOD_TAGS = [
  { id: 'all', label: 'All Moods' },
  { id: 'royal', label: 'Royal & Heritage 🏰', keywords: ['Jaipur', 'Taj Mahal', 'Mysore', 'Udaipur', 'Jaisalmer', 'Hampi', 'Golkonda', 'Charminar'] },
  { id: 'water', label: 'Coasts & Lagoons 🏖️', keywords: ['Goa', 'Kerala', 'Andaman', 'Puducherry', 'Dal Lake'] },
  { id: 'hills', label: 'Misty Highlands 🏔️', keywords: ['Munnar', 'Darjeeling', 'Ladakh', 'Ooty', 'Valley of Flowers', 'Rishikesh', 'Coorg'] },
];

export const Discover = () => {
  const [locations, setLocations] = useState(fallbackLocations);
  const [activeMood, setActiveMood] = useState('all');
  const [activeQuickViewLoc, setActiveQuickViewLoc] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const data = await searchLocations({});
        if (Array.isArray(data) && data.length > 0) {
          setLocations(data);
        }
      } catch (error) {
        console.error('Failed to load destinations', error);
      }
    };

    loadLocations();
  }, []);

  const filteredLocations = useMemo(() => {
    if (activeMood === 'all') return locations;
    const moodObj = MOOD_TAGS.find((m) => m.id === activeMood);
    if (!moodObj || !moodObj.keywords) return locations;
    return locations.filter((loc) =>
      moodObj.keywords.some((k) =>
        loc.name.toLowerCase().includes(k.toLowerCase()) ||
        loc.state.toLowerCase().includes(k.toLowerCase())
      )
    );
  }, [locations, activeMood]);

  const handleToggleFavorite = async (event, location) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    try {
      if (location.is_favorite) {
        await removeFavorite(location.id);
        addToast(`Removed ${location.name} from favorites`, 'info');
      } else {
        await addFavorite(location.id);
        addToast(`Saved ${location.name} to favorites ❤️`, 'favorite');
      }
      setLocations((current) =>
        current.map((item) =>
          item.id === location.id ? { ...item, is_favorite: !item.is_favorite } : item
        )
      );
      if (activeQuickViewLoc && activeQuickViewLoc.id === location.id) {
        setActiveQuickViewLoc((prev) => ({ ...prev, is_favorite: !prev.is_favorite }));
      }
    } catch {
      addToast('Please sign in to save favorites', 'error');
    }
  };

  return (
    <div className="page-stack">
      {/* Hero */}
      <section className="page-hero page-hero--discover">
        <div className="page-hero__content">
          <div className="hero-badge">
            <Compass size={15} />
            <span>Curated Visual Discovery</span>
          </div>
          <h1>Explore India through living culture, serene coastlines, and mountain air.</h1>
          <p className="section-copy">
            Browse destination moods, themed visual galleries, and unhurried slow-travel inspiration.
          </p>
        </div>
        <div className="orbital-card">
          <Sparkles size={26} className="text-accent" />
          <div>
            <strong>Sensory Exploration</strong>
            <p>Browse by feeling, atmosphere, and authentic local rhythm.</p>
          </div>
        </div>
      </section>

      {/* Travel Themes */}
      <section className="split-section">
        <div>
          <p className="section-eyebrow">Travel Themes</p>
          <h2 className="section-title">Three paths to begin your discovery</h2>
          <p className="section-copy">
            Each travel theme is designed to balance slow exploration, ecological sensitivity, and authentic heritage.
          </p>
        </div>
        <div className="theme-grid">
          {themes.map((theme, index) => {
            const Icon = themeIcons[index] || Compass;
            return (
              <article key={theme.title} className="theme-card">
                <div className="theme-card__icon">
                  <Icon size={22} />
                </div>
                <h3>{theme.title}</h3>
                <p>{theme.description}</p>
                <span className="theme-card__accent">{theme.accent}</span>
              </article>
            );
          })}
        </div>
      </section>

      {/* Interactive Photo Mosaic Gallery */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Visual Mosaic</p>
            <h2 className="section-title">Curated Gallery ({filteredLocations.length} destinations)</h2>
          </div>
          <div className="pill-row">
            {MOOD_TAGS.map((mood) => (
              <button
                key={mood.id}
                type="button"
                className={`pill-button${activeMood === mood.id ? ' pill-button--active' : ''}`}
                onClick={() => setActiveMood(mood.id)}
              >
                {mood.label}
              </button>
            ))}
          </div>
        </div>

        <div className="destination-mosaic">
          {filteredLocations.map((location) => (
            <div key={location.id} className="destination-mosaic__item">
              <img
                src={resolveImageUrl(location.image_url)}
                alt={location.name}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE_URL;
                }}
              />
              <div className="destination-mosaic__overlay">
                <div className="mosaic-meta-top">
                  <span className="mosaic-state">{location.state}</span>
                  <span className="mosaic-price">Rs. {location.price_per_night} / night</span>
                </div>
                <strong>{location.name}</strong>
                <p>{location.description}</p>

                <div className="destination-mosaic__actions">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setActiveQuickViewLoc(location)}
                  >
                    <Eye size={14} /> Quick View
                  </button>
                  <Link to={`/location/${location.id}/book`} className="btn-primary btn-sm">
                    Reserve Stay <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick View Modal */}
      <QuickViewModal
        location={activeQuickViewLoc}
        isOpen={Boolean(activeQuickViewLoc)}
        onClose={() => setActiveQuickViewLoc(null)}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
};

export default Discover;
