import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, MapPin, Search, SlidersHorizontal, Sparkles, Star } from 'lucide-react';
import {
  addFavorite,
  FALLBACK_AI_SUGGESTIONS,
  getAiSuggestions,
  removeFavorite,
  searchLocations,
  resolveImageUrl,
  FALLBACK_IMAGE_URL,
} from '../services/api';
import { fallbackLocations } from '../data/fallbackLocations';
import { themes, travelStats } from '../data/siteContent';

const HOME_LOCATIONS_CACHE_KEY = 'home-destinations-cache';

const readCachedLocations = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HOME_LOCATIONS_CACHE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read cached destinations', error);
    return [];
  }
};

const writeCachedLocations = (locations) => {
  if (typeof window === 'undefined' || !Array.isArray(locations) || locations.length === 0) {
    return;
  }

  try {
    window.localStorage.setItem(HOME_LOCATIONS_CACHE_KEY, JSON.stringify(locations));
  } catch (error) {
    console.error('Failed to cache destinations', error);
  }
};

const Home = () => {
  const [locations, setLocations] = useState(fallbackLocations);
  const [suggestions, setSuggestions] = useState(FALLBACK_AI_SUGGESTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState({
    state: '',
    min_price: '',
    max_price: '',
    sort_by: 'popular',
  });
  const [loading, setLoading] = useState(false);
  const resultsSectionRef = useRef(null);

  useEffect(() => {
    fetchLocations();
    fetchSuggestions();
  }, []);

  const fetchLocations = async (overrides = {}) => {
    try {
      setLoading(true);
      setLoadError('');
      const params = {
        query: overrides.query ?? searchQuery,
        state: overrides.state ?? filters.state,
        min_price: overrides.min_price ?? (filters.min_price || undefined),
        max_price: overrides.max_price ?? (filters.max_price || undefined),
        sort_by: overrides.sort_by ?? filters.sort_by,
      };
      const data = await searchLocations(params);
      const nextLocations = Array.isArray(data) ? data : [];
      setLocations(nextLocations);
      writeCachedLocations(nextLocations);
    } catch (error) {
      console.error('Failed to fetch locations', error);
      const cachedLocations = readCachedLocations();
      if (cachedLocations.length > 0) {
        setLocations(cachedLocations);
        setLoadError('');
      } else {
        setLocations([]);
        setLoadError('We could not load the destinations right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const data = await getAiSuggestions();
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error('Failed to fetch AI suggestions', error);
    }
  };

  const scrollToResults = () => {
    resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    fetchLocations({ query: searchQuery });
    scrollToResults();
  };

  const handleSuggestionClick = (term) => {
    setSearchQuery(term);
    fetchLocations({ query: term });
    scrollToResults();
  };

  const handleFilterChange = (field, value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
    fetchLocations({ ...next, query: searchQuery });
  };

  const handleResetDestinations = () => {
    const resetFilters = {
      state: '',
      min_price: '',
      max_price: '',
      sort_by: 'popular',
    };

    setSearchQuery('');
    setFilters(resetFilters);
    fetchLocations({
      query: '',
      state: '',
      min_price: undefined,
      max_price: undefined,
      sort_by: 'popular',
    });
  };

  const handleToggleFavorite = async (event, location) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      if (location.is_favorite) {
        await removeFavorite(location.id);
      } else {
        await addFavorite(location.id);
      }

      setLocations((current) =>
        current.map((item) =>
          item.id === location.id ? { ...item, is_favorite: !item.is_favorite } : item
        )
      );
    } catch (error) {
      console.error('Failed to update favorite', error);
    }
  };

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-panel__content">
          <p className="section-eyebrow">Plan a vivid getaway</p>
          <h1>Discover Incredible India through stays, stories, and scenic routes.</h1>
          <p className="section-copy">
            Move from inspiration to booking with themed destinations, editorial sections, and local imagery.
          </p>

          <form className="search-bar" onSubmit={handleSearch}>
            <div className="search-bar__field">
              <Search size={18} />
              <input
                type="text"
                className="input-field"
                placeholder="Search Agra, Goa, Kerala..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary">
              Explore stays
            </button>
          </form>

          <div className="hero-panel__cta">
            <Link to="/favorites" className="btn-secondary">
              Saved places <Heart size={16} />
            </Link>
          </div>
        </div>

        <div className="hero-panel__aside">
          <div className="hero-glance">
            <span className="hero-glance__label">Editor's pick</span>
            <strong>Kerala backwaters plus Munnar mornings</strong>
            <p>A calm water-to-hills route with local stays and dramatic scenery.</p>
          </div>

          <div className="stats-strip">
            {travelStats.map((stat) => (
              <div key={stat.label} className="stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Advanced Filters</p>
            <h2 className="section-title">Refine by state, budget, and sorting</h2>
          </div>
          <SlidersHorizontal size={20} />
        </div>

        <div className="filter-grid">
          <input
            className="input-field"
            placeholder="Filter by state"
            value={filters.state}
            onChange={(event) => handleFilterChange('state', event.target.value)}
          />
          <input
            className="input-field"
            type="number"
            placeholder="Min price"
            value={filters.min_price}
            onChange={(event) => handleFilterChange('min_price', event.target.value)}
          />
          <input
            className="input-field"
            type="number"
            placeholder="Max price"
            value={filters.max_price}
            onChange={(event) => handleFilterChange('max_price', event.target.value)}
          />
          <select
            className="input-field"
            value={filters.sort_by}
            onChange={(event) => handleFilterChange('sort_by', event.target.value)}
          >
            <option value="popular">Popular</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>
      </section>

      {suggestions.length > 0 && (
        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">AI Suggestions</p>
              <h2 className="section-title">Try a faster way to begin</h2>
            </div>
            <Sparkles size={20} />
          </div>

          <div className="pill-row">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.title}
                type="button"
                className="pill-button"
                onClick={() => handleSuggestionClick(suggestion.search_term)}
              >
                {suggestion.title}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="split-section">
        <div>
          <p className="section-eyebrow">Explore by Mood</p>
          <h2 className="section-title">Travel sections that add more depth to the homepage</h2>
          <p className="section-copy">
            Each section gives the site a broader editorial feel while keeping the booking grid one scroll away.
          </p>
        </div>

        <div className="theme-grid">
          {themes.map((theme) => (
            <article key={theme.title} className="theme-card">
              <h3>{theme.title}</h3>
              <p>{theme.description}</p>
              <span>{theme.accent}</span>
            </article>
          ))}
        </div>
      </section>

      <section ref={resultsSectionRef} className="section-block home-results-section">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Popular Destinations</p>
            <h2 className="section-title">Bookable stays with ratings and favorites</h2>
          </div>
          <Link to="/guides" className="btn-secondary">
            View guides <ArrowRight size={16} />
          </Link>
        </div>

        {loading && locations.length === 0 ? (
          <p className="section-copy">Loading destinations...</p>
        ) : loadError ? (
          <div className="status-panel">
            <p>{loadError}</p>
            <button type="button" className="btn-secondary" onClick={handleResetDestinations}>
              Retry destinations
            </button>
          </div>
        ) : locations.length === 0 ? (
          <div className="status-panel">
            <p>No destinations matched the current search or filters.</p>
            <button type="button" className="btn-secondary" onClick={handleResetDestinations}>
              Show all destinations
            </button>
          </div>
        ) : (
          <div className="destination-grid">
            {locations.map((loc) => (
              <Link to={`/location/${loc.id}`} key={loc.id} className="destination-card">
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
                    <button
                      type="button"
                      className={`favorite-pill${loc.is_favorite ? ' favorite-pill--active' : ''}`}
                      onClick={(event) => handleToggleFavorite(event, loc)}
                    >
                      <Heart size={14} />
                    </button>
                  </div>
                  <p>{loc.description}</p>
                  <div className="destination-card__footer">
                    <span className="rating-chip">
                      <Star size={14} />
                      {loc.average_rating || 0} ({loc.review_count} reviews)
                    </span>
                    <span className="text-link">
                      Rs. {loc.price_per_night}/night <ArrowRight size={15} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
