import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Crosshair,
  ExternalLink,
  MapPinned,
  Navigation,
  Compass,
  ArrowRight,
  Sparkles,
  Car,
  Clock,
  Map as MapIcon,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { searchLocations, resolveImageUrl, FALLBACK_IMAGE_URL } from '../services/api';
import { fallbackLocations } from '../data/fallbackLocations';
import { destinationCoordinates } from '../data/siteContent';
import { useToast } from '../context/ToastContext';
import InteractiveIndiaMap from '../components/InteractiveIndiaMap';

const REGIONS = [
  { id: 'all', label: 'All India (30)', count: 30 },
  { id: 'north', label: 'North India 🏔️', states: ['Uttar Pradesh', 'Rajasthan', 'Uttarakhand', 'Punjab', 'Ladakh', 'Jammu and Kashmir'] },
  { id: 'south', label: 'South India 🌴', states: ['Kerala', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Puducherry', 'Andaman and Nicobar Islands'] },
  { id: 'west', label: 'West India 🏜️', states: ['Goa', 'Maharashtra', 'Gujarat'] },
  { id: 'east', label: 'East & NE 🌿', states: ['West Bengal', 'Meghalaya', 'Assam', 'Odisha', 'Madhya Pradesh'] },
];

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const initialMappedLocations = fallbackLocations
  .filter((item) => destinationCoordinates[item.name])
  .map((item) => ({ ...item, coords: destinationCoordinates[item.name] }));

export const Maps = () => {
  const [locations, setLocations] = useState(initialMappedLocations);
  const [selectedId, setSelectedId] = useState(initialMappedLocations[0] ? String(initialMappedLocations[0].id) : '1');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [userPosition, setUserPosition] = useState(null);
  const [geoStatus, setGeoStatus] = useState('Locating your GPS coordinates...');
  const { addToast } = useToast();

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const data = await searchLocations({});
        const mapped = data
          .filter((item) => destinationCoordinates[item.name])
          .map((item) => ({ ...item, coords: destinationCoordinates[item.name] }));
        setLocations(mapped);
        if (mapped.length > 0 && !selectedId) {
          setSelectedId(String(mapped[0].id));
        }
      } catch (error) {
        console.error('Failed to load locations for maps', error);
      }
    };

    loadLocations();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setGeoStatus('Your live GPS radar is active.');
      },
      () => {
        setGeoStatus('GPS access was blocked. India map remains fully interactive.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const filteredLocations = useMemo(() => {
    if (selectedRegion === 'all') return locations;
    const regionObj = REGIONS.find((r) => r.id === selectedRegion);
    if (!regionObj || !regionObj.states) return locations;
    return locations.filter((loc) => regionObj.states.includes(loc.state));
  }, [locations, selectedRegion]);

  const selectedLocation = useMemo(
    () => locations.find((location) => String(location.id) === selectedId) || locations[0] || null,
    [locations, selectedId]
  );

  const selectedCoords = selectedLocation ? destinationCoordinates[selectedLocation.name] : null;

  const distanceKm = useMemo(() => {
    if (!userPosition || !selectedCoords) return null;
    return calculateDistanceKm(userPosition.lat, userPosition.lon, selectedCoords.lat, selectedCoords.lon);
  }, [userPosition, selectedCoords]);

  const estimatedDrivingHours = useMemo(() => {
    if (!distanceKm) return null;
    return Math.max(1, Math.round(distanceKm / 55));
  }, [distanceKm]);

  const directionsUrl =
    userPosition && selectedCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${userPosition.lat},${userPosition.lon}&destination=${selectedCoords.lat},${selectedCoords.lon}&travelmode=driving`
      : selectedCoords
        ? `https://www.google.com/maps/search/?api=1&query=${selectedCoords.lat},${selectedCoords.lon}`
        : '#';

  const copyCoords = () => {
    if (selectedCoords) {
      const coordStr = `${selectedCoords.lat.toFixed(4)}° N, ${selectedCoords.lon.toFixed(4)}° E`;
      navigator.clipboard?.writeText(coordStr);
      addToast(`Copied ${selectedLocation.name} GPS coordinates: ${coordStr}`, 'success');
    }
  };

  const handleSelectLocation = (loc) => {
    setSelectedId(String(loc.id));
    addToast(`Focused on ${loc.name}, ${loc.state}`, 'info', 2000);
  };

  return (
    <div className="page-stack">
      {/* Hero */}
      <section className="page-hero page-hero--maps">
        <div className="page-hero__content">
          <div className="hero-badge">
            <MapPinned size={15} />
            <span>Interactive India Tourism Map</span>
          </div>
          <h1>Explore 30 handpicked destinations across India on an interactive live map.</h1>
          <p className="section-copy">
            Navigate the Indian subcontinent with real terrain, scenic eco-routes, live GPS distance calculations, and turn-by-turn route handoff.
          </p>
        </div>

        <div className="orbital-card">
          <Crosshair size={24} className="text-accent" />
          <div>
            <strong>GPS Radar</strong>
            <p>{geoStatus}</p>
          </div>
        </div>
      </section>

      {/* Regional Tabs */}
      <section className="category-bar-section">
        <div className="category-bar">
          {REGIONS.map((region) => (
            <button
              key={region.id}
              type="button"
              className={`category-pill${selectedRegion === region.id ? ' category-pill--active' : ''}`}
              onClick={() => setSelectedRegion(region.id)}
            >
              <span>{region.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Interactive India Map & Selected Destination Card */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Interactive Geographical Map</p>
            <h2 className="section-title">
              Click any pinpoint on India to inspect destination ({filteredLocations.length} locations)
            </h2>
          </div>
          {distanceKm && (
            <div className="rating-chip rating-chip--inline">
              <Car size={14} />
              <span>{distanceKm.toLocaleString('en-IN')} km from your location</span>
            </div>
          )}
        </div>

        <div className="map-explorer-layout">
          {/* Interactive Leaflet India Map */}
          <div className="map-canvas-container">
            <InteractiveIndiaMap
              locations={filteredLocations}
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
              userPosition={userPosition}
              activeRegion={selectedRegion}
            />
          </div>

          {/* Selected Destination Card */}
          {selectedLocation && selectedCoords && (
            <aside className="map-selection-card animate-fade-in">
              <div className="map-selection-card__media">
                <img
                  src={resolveImageUrl(selectedLocation.image_url)}
                  alt={selectedLocation.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = FALLBACK_IMAGE_URL;
                  }}
                />
                <span className="map-selection-tag">{selectedLocation.state}</span>
              </div>

              <div className="map-selection-card__body">
                <div className="map-selection-header">
                  <div>
                    <span className="section-eyebrow">Selected Destination</span>
                    <h3>{selectedLocation.name}</h3>
                  </div>
                  <div className="rate-badge-sm">
                    Rs. {selectedLocation.price_per_night} / night
                  </div>
                </div>

                <p>{selectedLocation.description}</p>

                <div className="map-selection-card__meta">
                  <button
                    type="button"
                    className="coord-chip"
                    onClick={copyCoords}
                    title="Click to copy GPS coordinates"
                  >
                    <MapPinned size={14} />
                    <span>{selectedCoords.lat.toFixed(4)}° N, {selectedCoords.lon.toFixed(4)}° E</span>
                  </button>

                  {distanceKm && (
                    <div className="distance-badge">
                      <Clock size={14} />
                      <span>~{estimatedDrivingHours} hrs drive ({distanceKm.toLocaleString('en-IN')} km)</span>
                    </div>
                  )}
                </div>

                <div className="map-selection-actions">
                  <a
                    className="btn-primary"
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Maps Directions <ExternalLink size={15} />
                  </a>
                  <Link
                    to={`/location/${selectedLocation.id}/book`}
                    className="btn-secondary"
                  >
                    Reserve Stay <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      </section>

      {/* Horizontal Carousel Strip of Destinations */}
      <section className="section-block">
        <div className="section-heading-sm">
          <Sparkles size={16} className="text-accent" />
          <span>Quick Switch Destination ({locations.length} Stops):</span>
        </div>
        <div className="map-destinations-strip">
          {locations.map((loc) => {
            const isSelected = selectedLocation && selectedLocation.id === loc.id;
            return (
              <button
                key={loc.id}
                type="button"
                className={`map-strip-card${isSelected ? ' map-strip-card--selected' : ''}`}
                onClick={() => handleSelectLocation(loc)}
              >
                <img
                  src={resolveImageUrl(loc.image_url)}
                  alt={loc.name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_IMAGE_URL;
                  }}
                />
                <div className="map-strip-card__info">
                  <strong>{loc.name}</strong>
                  <span>{loc.state}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Maps;
