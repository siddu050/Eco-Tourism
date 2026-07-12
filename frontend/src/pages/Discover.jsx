import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowRight, Waves, Landmark, Trees } from 'lucide-react';
import { searchLocations, resolveImageUrl, FALLBACK_IMAGE_URL } from '../services/api';
import { fallbackLocations } from '../data/fallbackLocations';
import { themes } from '../data/siteContent';

const icons = [Landmark, Waves, Trees];

const Discover = () => {
  const [locations, setLocations] = useState(fallbackLocations.slice(0, 6));

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const data = await searchLocations({});
        setLocations(data.slice(0, 6));
      } catch (error) {
        console.error('Failed to load destinations', error);
      }
    };

    loadLocations();
  }, []);

  return (
    <div className="page-stack">
      <section className="page-hero page-hero--discover">
        <div className="page-hero__content">
          <p className="section-eyebrow">Discover</p>
          <h1>Explore India through culture, coastlines, and mountain air.</h1>
          <p className="section-copy">
            Browse destination moods, themed itineraries, and a gallery of places ready for your next stay.
          </p>
        </div>
        <div className="orbital-card">
          <Compass size={28} />
          <p>Browse by feeling, not just by map pin.</p>
        </div>
      </section>

      <section className="split-section">
        <div>
          <p className="section-eyebrow">Travel Themes</p>
          <h2 className="section-title">Three ways to start your route</h2>
        </div>
        <div className="theme-grid">
          {themes.map((theme, index) => {
            const Icon = icons[index];
            return (
              <article key={theme.title} className="theme-card">
                <div className="theme-card__icon">
                  <Icon size={22} />
                </div>
                <h3>{theme.title}</h3>
                <p>{theme.description}</p>
                <span>{theme.accent}</span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Curated Destinations</p>
            <h2 className="section-title">Fresh visual cards for planning and comparison</h2>
          </div>
          <Link to="/" className="btn-secondary">
            Back to booking <ArrowRight size={16} />
          </Link>
        </div>

        <div className="destination-mosaic">
          {locations.map((location) => (
            <Link key={location.id} to={`/location/${location.id}`} className="destination-mosaic__item">
              <img
                src={resolveImageUrl(location.image_url)}
                alt={location.name}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE_URL;
                }}
              />
              <div className="destination-mosaic__overlay">
                <span>{location.state}</span>
                <strong>{location.name}</strong>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Discover;
