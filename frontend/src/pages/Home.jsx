import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Eye,
  LayoutGrid,
  List,
  RotateCcw,
  Compass,
  IndianRupee,
  ShieldCheck,
  Leaf,
  Calendar,
} from 'lucide-react';
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
import { useToast } from '../context/ToastContext';
import QuickViewModal from '../components/QuickViewModal';
import VibeMatcher from '../components/VibeMatcher';
import { SkeletonGrid } from '../components/SkeletonCard';

const HOME_LOCATIONS_CACHE_KEY = 'home-destinations-cache';

const CATEGORIES = [
  { id: 'all', label: 'All Destinations', icon: '✨' },
  { id: 'mountains', label: 'Hills & Mountains', icon: '🏔️', keywords: ['Munnar', 'Darjeeling', 'Ladakh', 'Ooty', 'Valley of Flowers', 'Rishikesh'] },
  { id: 'coastal', label: 'Coasts & Beaches', icon: '🏖️', keywords: ['Goa', 'Kerala', 'Andaman', 'Puducherry'] },
  { id: 'heritage', label: 'Heritage & Forts', icon: '🏰', keywords: ['Taj Mahal', 'Jaipur', 'Mysore', 'Udaipur', 'Jaisalmer', 'Hampi', 'Golkonda', 'Charminar', 'Gateway of India'] },
  { id: 'spiritual', label: 'Spiritual & Ghats', icon: '🕉️', keywords: ['Varanasi', 'Golden Temple', 'Rishikesh', 'Khajuraho', 'Konark', 'Ellora'] },
  { id: 'nature', label: 'Nature & Wildlife', icon: '🌿', keywords: ['Kaziranga', 'Sunderbans', 'Meghalaya', 'Coorg', 'Rann of Kutch'] },
];

const SPOTLIGHT_ITINERARIES = [
  {
    id: 'kerala',
    title: 'Kerala Emerald Waterways',
    duration: '5 Days / 4 Nights',
    route: 'Kochi → Alleppey → Munnar',
    tag: 'Slow Travel',
    image: '/static/images/kerala_backwaters.jpg',
    highlights: ['Overnight solar houseboat', 'Organic tea plantation walk', 'Spice village tour'],
    startingPrice: 3000,
  },
  {
    id: 'rajasthan',
    title: 'Royal Desert Citadel',
    duration: '6 Days / 5 Nights',
    route: 'Jaipur → Jodhpur → Udaipur',
    tag: 'Heritage & Art',
    image: '/static/images/jaipur_palaces.jpg',
    highlights: ['Amber Fort sunrise entry', 'Lake Pichola sunset boat', 'Havelis & artisan bazaars'],
    startingPrice: 3600,
  },
  {
    id: 'himalayas',
    title: 'High Altitude Serenity',
    duration: '7 Days / 6 Nights',
    route: 'Leh → Nubra Valley → Pangong',
    tag: 'Mountain Trail',
    image: '/static/images/ladakh_valleys.jpg',
    highlights: ['Monastery morning chants', 'Pristine high-altitude lakes', 'Stargazing at 14,000 ft'],
    startingPrice: 4400,
  },
];

const readCachedLocations = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HOME_LOCATIONS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCachedLocations = (locations) => {
  if (typeof window === 'undefined' || !Array.isArray(locations) || locations.length === 0) return;
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maxPriceFilter, setMaxPriceFilter] = useState(5000);
  const [selectedState, setSelectedState] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeQuickViewLoc, setActiveQuickViewLoc] = useState(null);
  const [activeSpotlight, setActiveSpotlight] = useState('kerala');
  const [showVibeMatcher, setShowVibeMatcher] = useState(false);

  const resultsSectionRef = useRef(null);
  const { addToast } = useToast();

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
        state: overrides.state ?? selectedState,
        sort_by: overrides.sort_by ?? sortBy,
      };
      const data = await searchLocations(params);
      const nextLocations = Array.isArray(data) ? data : [];
      setLocations(nextLocations);
      writeCachedLocations(nextLocations);
    } catch (error) {
      console.error('Failed to fetch locations', error);
      const cached = readCachedLocations();
      if (cached.length > 0) {
        setLocations(cached);
      } else {
        setLocations(fallbackLocations);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const data = await getAiSuggestions();
      if (data?.suggestions) setSuggestions(data.suggestions);
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
    setSelectedCategory('all');
    fetchLocations({ query: term });
    scrollToResults();
    addToast(`Filtering by "${term}"`, 'sparkle');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setMaxPriceFilter(5000);
    setSelectedState('');
    setSortBy('popular');
    fetchLocations({ query: '', state: '', sort_by: 'popular' });
    addToast('Filters reset to show all destinations', 'info');
  };

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
    } catch (error) {
      console.error('Failed to update favorite', error);
      addToast('Please sign in to save favorites', 'error');
    }
  };

  // Filtered and sorted destinations
  const filteredLocations = useMemo(() => {
    let list = [...locations];

    // Category filter
    if (selectedCategory !== 'all') {
      const catObj = CATEGORIES.find((c) => c.id === selectedCategory);
      if (catObj && catObj.keywords) {
        list = list.filter((loc) =>
          catObj.keywords.some(
            (k) =>
              loc.name.toLowerCase().includes(k.toLowerCase()) ||
              loc.state.toLowerCase().includes(k.toLowerCase()) ||
              loc.description.toLowerCase().includes(k.toLowerCase())
          )
        );
      }
    }

    // Price slider filter
    if (maxPriceFilter < 5000) {
      list = list.filter((loc) => (loc.price_per_night || 0) <= maxPriceFilter);
    }

    // State filter
    if (selectedState) {
      list = list.filter((loc) =>
        loc.state.toLowerCase().includes(selectedState.toLowerCase())
      );
    }

    // Sorting
    if (sortBy === 'price_low') {
      list.sort((a, b) => (a.price_per_night || 0) - (b.price_per_night || 0));
    } else if (sortBy === 'price_high') {
      list.sort((a, b) => (b.price_per_night || 0) - (a.price_per_night || 0));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }

    return list;
  }, [locations, selectedCategory, maxPriceFilter, selectedState, sortBy]);

  // Unique list of states for filter dropdown
  const uniqueStates = useMemo(() => {
    const states = new Set(locations.map((loc) => loc.state).filter(Boolean));
    return Array.from(states).sort();
  }, [locations]);

  return (
    <div className="page-stack">
      {/* Hero Section */}
      <section className="hero-panel">
        <div className="hero-panel__content">
          <div className="hero-badge">
            <Sparkles size={15} />
            <span>Sustainable & Slow Travel in India</span>
          </div>
          <h1>Discover Incredible India through curated stays and scenic routes.</h1>
          <p className="section-copy">
            Explore 30+ handpicked eco-conscious destinations across high Himalayas, royal Rajasthan, lush backwaters, and pristine islands.
          </p>

          <form className="search-bar" onSubmit={handleSearch}>
            <div className="search-bar__field">
              <Search size={18} />
              <input
                type="text"
                className="input-field"
                placeholder="Search Agra, Goa, Munnar, Ladakh..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-bar__clear"
                  onClick={() => {
                    setSearchQuery('');
                    fetchLocations({ query: '' });
                  }}
                >
                  &times;
                </button>
              )}
            </div>
            <button type="submit" className="btn-primary">
              Explore Stays
            </button>
          </form>

          <div className="hero-panel__cta">
            <button
              type="button"
              className={`btn-secondary${showVibeMatcher ? ' btn-secondary--active' : ''}`}
              onClick={() => setShowVibeMatcher(!showVibeMatcher)}
            >
              <Sparkles size={16} />
              {showVibeMatcher ? 'Hide Vibe Matcher' : 'Interactive Vibe Matcher'}
            </button>
            <Link to="/favorites" className="btn-secondary">
              Saved Places <Heart size={16} />
            </Link>
          </div>
        </div>

        <div className="hero-panel__aside">
          <div className="hero-glance">
            <span className="hero-glance__label">Editor's Choice</span>
            <strong>Kerala Backwaters & Munnar Peaks</strong>
            <p>A tranquil water-to-hills slow route with zero-emission houseboats and organic tea stays.</p>
            <div className="hero-glance__footer">
              <span className="rate-tag">From Rs. 3,000 / night</span>
              <Link to="/location/4" className="btn-text-link">
                View Stay <ArrowRight size={14} />
              </Link>
            </div>
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

      {/* Interactive Vibe Matcher Wizard (Collapsible or Shown) */}
      {showVibeMatcher && (
        <section className="section-block animate-slide-down">
          <VibeMatcher
            allLocations={locations}
            onQuickView={(loc) => setActiveQuickViewLoc(loc)}
          />
        </section>
      )}

      {/* Category Filter Pills Bar */}
      <section className="category-bar-section">
        <div className="category-bar">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`category-pill${isActive ? ' category-pill--active' : ''}`}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  scrollToResults();
                }}
              >
                <span className="category-pill__icon">{cat.icon}</span>
                <span className="category-pill__label">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* AI Suggestions Row */}
      {suggestions.length > 0 && (
        <section className="section-block section-block--tight">
          <div className="section-heading-sm">
            <Sparkles size={16} className="text-accent" />
            <span>Trending AI Suggestions:</span>
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

      {/* Featured Itineraries Spotlight */}
      <section className="section-block spotlight-section">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Curated Slow Travel</p>
            <h2 className="section-title">Signature Multi-Day Indian Routes</h2>
          </div>
          <Link to="/guides" className="btn-secondary">
            All Guides <ArrowRight size={16} />
          </Link>
        </div>

        <div className="spotlight-container">
          <div className="spotlight-tabs">
            {SPOTLIGHT_ITINERARIES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`spotlight-tab${activeSpotlight === item.id ? ' spotlight-tab--active' : ''}`}
                onClick={() => setActiveSpotlight(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.duration}</span>
              </button>
            ))}
          </div>

          {(() => {
            const current = SPOTLIGHT_ITINERARIES.find((s) => s.id === activeSpotlight) || SPOTLIGHT_ITINERARIES[0];
            return (
              <div className="spotlight-card animate-fade-in">
                <div className="spotlight-card__image-wrap">
                  <img
                    src={resolveImageUrl(current.image)}
                    alt={current.title}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FALLBACK_IMAGE_URL;
                    }}
                  />
                  <span className="spotlight-card__tag">{current.tag}</span>
                </div>
                <div className="spotlight-card__content">
                  <span className="spotlight-route">{current.route}</span>
                  <h3>{current.title}</h3>
                  <div className="spotlight-highlights-list">
                    {current.highlights.map((h, i) => (
                      <div key={i} className="spotlight-hl-item">
                        <Leaf size={14} />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                  <div className="spotlight-card__footer">
                    <div>
                      <span className="spotlight-from">Starting stay estimate</span>
                      <strong className="spotlight-price">Rs. {current.startingPrice} <small>/ night</small></strong>
                    </div>
                    <Link to="/guides" className="btn-primary">
                      Explore Route Plan <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Main Destination Results Grid */}
      <section ref={resultsSectionRef} className="section-block home-results-section">
        <div className="results-toolbar">
          <div className="results-toolbar__title-group">
            <p className="section-eyebrow">Explore Stays</p>
            <h2 className="section-title">
              {selectedCategory !== 'all'
                ? `${CATEGORIES.find((c) => c.id === selectedCategory)?.label} (${filteredLocations.length})`
                : `All Destinations (${filteredLocations.length})`}
            </h2>
          </div>

          <div className="results-toolbar__controls">
            {/* Price Slider Filter */}
            <div className="toolbar-price-slider">
              <span className="toolbar-label">
                Budget max: <strong>Rs. {maxPriceFilter.toLocaleString('en-IN')}</strong>
              </span>
              <input
                type="range"
                min="1800"
                max="5000"
                step="200"
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="price-range-slider"
              />
            </div>

            {/* State Filter */}
            <select
              className="input-field toolbar-select"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              aria-label="Filter by state"
            >
              <option value="">All States</option>
              {uniqueStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Sort Filter */}
            <select
              className="input-field toolbar-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort destinations"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Top Rated</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>

            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-btn${viewMode === 'grid' ? ' view-btn--active' : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <LayoutGrid size={17} />
              </button>
              <button
                type="button"
                className={`view-btn${viewMode === 'compact' ? ' view-btn--active' : ''}`}
                onClick={() => setViewMode('compact')}
                aria-label="Compact view"
              >
                <List size={17} />
              </button>
            </div>

            {/* Reset Filters */}
            {(searchQuery || selectedCategory !== 'all' || maxPriceFilter < 5000 || selectedState || sortBy !== 'popular') && (
              <button
                type="button"
                className="btn-secondary btn-icon-only"
                onClick={handleResetFilters}
                title="Reset all filters"
                aria-label="Reset all filters"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Loading / Results Content */}
        {loading ? (
          <SkeletonGrid count={6} />
        ) : filteredLocations.length === 0 ? (
          <div className="status-panel">
            <p>No destinations match your current filters.</p>
            <button type="button" className="btn-secondary" onClick={handleResetFilters}>
              Show All 30 Destinations
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'destination-grid' : 'destination-compact-list'}>
            {filteredLocations.map((loc) => (
              <div key={loc.id} className="destination-card-wrapper">
                <Link to={`/location/${loc.id}`} className="destination-card">
                  <div className="destination-card__media">
                    <img
                      src={resolveImageUrl(loc.image_url)}
                      alt={loc.name}
                      loading="lazy"
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
                      className={`favorite-pill${loc.is_favorite ? ' favorite-pill--active' : ''}`}
                      onClick={(event) => handleToggleFavorite(event, loc)}
                      title={loc.is_favorite ? 'Remove from favorites' : 'Save to favorites'}
                      aria-label="Toggle favorite"
                    >
                      <Heart size={15} />
                    </button>
                  </div>

                  <div className="destination-card__body">
                    <div className="destination-card__meta">
                      <h3>{loc.name}</h3>
                      <div className="rating-chip">
                        <Star size={13} />
                        <span>{loc.average_rating || 4.8} ({loc.review_count || 14})</span>
                      </div>
                    </div>

                    <p>{loc.description}</p>

                    <div className="destination-card__footer">
                      <div className="card-price-stack">
                        <span className="card-price">Rs. {loc.price_per_night}</span>
                        <small>/ night</small>
                      </div>

                      <div className="card-action-group">
                        <button
                          type="button"
                          className="btn-quick-view"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveQuickViewLoc(loc);
                          }}
                          title="Quick preview"
                        >
                          <Eye size={15} />
                          <span>Quick View</span>
                        </button>
                        <span className="text-link">
                          Details <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Mood Explorers Section */}
      <section className="split-section">
        <div>
          <p className="section-eyebrow">Travel by Rhythm</p>
          <h2 className="section-title">Atmospheric travel moods crafted for mindful journeys</h2>
          <p className="section-copy">
            Whether you are yearning for the cool whispers of mountain pines or ancient stone carvings echoing through history, these sections guide you to the right corner of India.
          </p>
        </div>

        <div className="theme-grid">
          {themes.map((theme) => (
            <article key={theme.title} className="theme-card">
              <h3>{theme.title}</h3>
              <p>{theme.description}</p>
              <span className="theme-card__accent">{theme.accent}</span>
            </article>
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

export default Home;
