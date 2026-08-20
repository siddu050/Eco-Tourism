import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MapPin, Search, ArrowRight, Trash2, Sparkles, Compass } from 'lucide-react';
import { getFavorites, removeFavorite, resolveImageUrl, FALLBACK_IMAGE_URL } from '../services/api';
import { useToast } from '../context/ToastContext';

export const Favorites = ({ user }) => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/auth', { state: { from: '/favorites' } });
      return;
    }

    const loadFavorites = async () => {
      try {
        const data = await getFavorites();
        setFavorites(data.favorites || []);
      } catch (error) {
        console.error('Failed to load favorites', error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [navigate, user]);

  const handleRemove = async (event, locationId, locationName) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await removeFavorite(locationId);
      setFavorites((current) => current.filter((item) => item.id !== locationId));
      addToast(`Removed ${locationName || 'destination'} from favorites`, 'info');
    } catch (error) {
      console.error('Failed to remove favorite', error);
      addToast('Failed to remove favorite', 'error');
    }
  };

  const filteredFavorites = useMemo(() => {
    if (!searchQuery.trim()) return favorites;
    const q = searchQuery.toLowerCase();
    return favorites.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.state.toLowerCase().includes(q) ||
        loc.description?.toLowerCase().includes(q)
    );
  }, [favorites, searchQuery]);

  const totalEstimatedStay = useMemo(() => {
    return favorites.reduce((sum, item) => sum + (item.price_per_night || 0), 0);
  }, [favorites]);

  if (loading) return <div className="status-panel">Loading your saved places...</div>;

  return (
    <div className="page-stack">
      {/* Hero */}
      <section className="page-hero page-hero--about">
        <div className="page-hero__content">
          <div className="hero-badge">
            <Heart size={15} />
            <span>Saved Shortlist</span>
          </div>
          <h1>Your saved places, ready for your next getaway.</h1>
          <p className="section-copy">
            Compare stay rates, review itineraries, and proceed directly to booking whenever you're ready.
          </p>
        </div>

        {favorites.length > 0 && (
          <div className="orbital-card">
            <Sparkles size={24} className="text-accent" />
            <div>
              <strong>{favorites.length} Saved {favorites.length === 1 ? 'Place' : 'Places'}</strong>
              <p>Combined 1-night base stay: Rs. {totalEstimatedStay.toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}
      </section>

      {/* Favorites Toolbar & Grid */}
      <section className="section-block">
        {favorites.length > 0 && (
          <div className="results-toolbar">
            <div className="results-toolbar__title-group">
              <h2 className="section-title">
                Saved Destinations ({filteredFavorites.length})
              </h2>
            </div>

            <div className="results-toolbar__controls">
              <div className="search-bar__field" style={{ minWidth: '220px' }}>
                <Search size={16} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Filter saved places..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="status-panel">
            <Heart size={32} className="text-muted" />
            <h3>No saved destinations yet</h3>
            <p>Click the heart icon on any destination card to build your personalized shortlist.</p>
            <Link to="/" className="btn-primary">
              Explore Destinations <ArrowRight size={16} />
            </Link>
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div className="status-panel">
            <p>No saved destinations match "{searchQuery}".</p>
            <button type="button" className="btn-secondary" onClick={() => setSearchQuery('')}>
              Clear Search
            </button>
          </div>
        ) : (
          <div className="destination-grid">
            {filteredFavorites.map((loc) => (
              <div key={loc.id} className="destination-card-wrapper">
                <Link to={`/location/${loc.id}`} className="destination-card">
                  <div className="destination-card__media">
                    <img
                      src={resolveImageUrl(loc.image_url)}
                      alt={loc.name}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = FALLBACK_IMAGE_URL;
                      }}
                    />
                    <span className="destination-card__state-badge">
                      <MapPin size={12} />
                      {loc.state}
                    </span>
                    <button
                      type="button"
                      className="favorite-pill favorite-pill--active"
                      onClick={(event) => handleRemove(event, loc.id, loc.name)}
                      title="Remove from favorites"
                      aria-label="Remove favorite"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="destination-card__body">
                    <div className="destination-card__meta">
                      <h3>{loc.name}</h3>
                      <span className="card-price">Rs. {loc.price_per_night} / night</span>
                    </div>

                    <p>{loc.description}</p>

                    <div className="destination-card__footer">
                      <Link
                        to={`/location/${loc.id}/book`}
                        className="btn-primary btn-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Reserve Stay <ArrowRight size={14} />
                      </Link>
                      <span className="text-link">
                        Details <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Favorites;
