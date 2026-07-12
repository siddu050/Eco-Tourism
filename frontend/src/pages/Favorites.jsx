import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MapPin } from 'lucide-react';
import { getFavorites, removeFavorite, resolveImageUrl, FALLBACK_IMAGE_URL } from '../services/api';

const Favorites = ({ user }) => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleRemove = async (event, locationId) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await removeFavorite(locationId);
      setFavorites((current) => current.filter((item) => item.id !== locationId));
    } catch (error) {
      console.error('Failed to remove favorite', error);
    }
  };

  if (loading) return <div className="status-panel">Loading saved places...</div>;

  return (
    <div className="page-stack">
      <section className="page-hero page-hero--about">
        <div className="page-hero__content">
          <p className="section-eyebrow">Favorites</p>
          <h1>Your saved destinations, ready for a return visit.</h1>
          <p className="section-copy">Use this page as a lightweight shortlist while you compare routes, pricing, and reviews.</p>
        </div>
      </section>

      <section className="section-block">
        <div className="destination-grid">
          {favorites.length > 0 ? favorites.map((loc) => (
            <Link key={loc.id} to={`/location/${loc.id}`} className="destination-card">
              <img
                src={resolveImageUrl(loc.image_url)}
                alt={loc.name}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE_URL;
                }}
              />
              <div className="destination-card__body">
                <div className="destination-card__meta">
                  <div>
                    <h3>{loc.name}</h3>
                    <div className="inline-meta">
                      <MapPin size={15} />
                      <span>{loc.state}</span>
                    </div>
                  </div>
                  <button type="button" className="favorite-pill favorite-pill--active" onClick={(event) => handleRemove(event, loc.id)}>
                    <Heart size={14} />
                  </button>
                </div>
                <p>{loc.description}</p>
              </div>
            </Link>
          )) : <div className="status-panel">No favorites yet. Save destinations from the Home page or details page.</div>}
        </div>
      </section>
    </div>
  );
};

export default Favorites;
