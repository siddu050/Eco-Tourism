import React, { useEffect, useMemo, useState } from 'react';
import { Crosshair, ExternalLink, MapPinned, Navigation, Map as MapIcon } from 'lucide-react';
import { searchLocations, resolveImageUrl, FALLBACK_IMAGE_URL } from '../services/api';
import { fallbackLocations } from '../data/fallbackLocations';
import { destinationCoordinates } from '../data/siteContent';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const INDIA_BOUNDS = { minLat: 6, maxLat: 37.5, minLon: 68, maxLon: 97.5 };

const createEmbedUrl = (lat, lon, zoomLat = 0.35, zoomLon = 0.5) => {
  const left = clamp(lon - zoomLon, -180, 180);
  const right = clamp(lon + zoomLon, -180, 180);
  const bottom = clamp(lat - zoomLat, -90, 90);
  const top = clamp(lat + zoomLat, -90, 90);
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lon}`;
};

const projectToMap = ({ lat, lon }) => {
  const x = ((lon - INDIA_BOUNDS.minLon) / (INDIA_BOUNDS.maxLon - INDIA_BOUNDS.minLon)) * 100;
  const y = ((INDIA_BOUNDS.maxLat - lat) / (INDIA_BOUNDS.maxLat - INDIA_BOUNDS.minLat)) * 100;
  return {
    left: `${clamp(x, 6, 94)}%`,
    top: `${clamp(y, 8, 92)}%`,
  };
};

const initialMappedLocations = fallbackLocations.filter((item) => destinationCoordinates[item.name]);

const Maps = () => {
  const [locations, setLocations] = useState(initialMappedLocations);
  const [selectedId, setSelectedId] = useState(initialMappedLocations[0] ? String(initialMappedLocations[0].id) : '');
  const [userPosition, setUserPosition] = useState(null);
  const [geoStatus, setGeoStatus] = useState('Requesting your location...');

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const data = await searchLocations({});
        const mapped = data.filter((item) => destinationCoordinates[item.name]);
        setLocations(mapped);
        if (mapped.length > 0) {
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
        setGeoStatus('Your GPS location is ready.');
      },
      () => {
        setGeoStatus('Location access was blocked, so destination maps are still available below.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const selectedLocation = useMemo(
    () => locations.find((location) => String(location.id) === selectedId) || null,
    [locations, selectedId]
  );
  const plottedLocations = useMemo(
    () =>
      locations.map((location) => ({
        ...location,
        coords: destinationCoordinates[location.name],
      })),
    [locations]
  );

  const selectedCoords = selectedLocation ? destinationCoordinates[selectedLocation.name] : null;
  const destinationMapUrl = selectedCoords ? createEmbedUrl(selectedCoords.lat, selectedCoords.lon) : '';
  const userMapUrl = userPosition ? createEmbedUrl(userPosition.lat, userPosition.lon, 0.2, 0.2) : '';
  const directionsUrl =
    userPosition && selectedCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${userPosition.lat},${userPosition.lon}&destination=${selectedCoords.lat},${selectedCoords.lon}&travelmode=driving`
      : selectedCoords
        ? `https://www.google.com/maps/search/?api=1&query=${selectedCoords.lat},${selectedCoords.lon}`
        : '#';

  return (
    <div className="page-stack">
      <section className="page-hero page-hero--maps">
        <div className="page-hero__content">
          <p className="section-eyebrow">Maps</p>
          <h1>Track your current GPS position and compare it with your next destination.</h1>
          <p className="section-copy">
            This page gives you a live location section, a destination map preview, and a quick route handoff to Google Maps.
          </p>
        </div>

        <div className="orbital-card">
          <MapPinned size={26} />
          <p>{geoStatus}</p>
        </div>
      </section>

      <section className="maps-layout">
        <div className="map-panel">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Your GPS</p>
              <h2 className="section-title">Current location</h2>
            </div>
            <Crosshair size={20} />
          </div>

          {userPosition ? (
            <>
              <div className="map-meta-card">
                <strong>Latitude:</strong> <span>{userPosition.lat.toFixed(5)}</span>
                <strong>Longitude:</strong> <span>{userPosition.lon.toFixed(5)}</span>
              </div>
              <iframe
                className="map-frame"
                title="Your current location"
                src={userMapUrl}
                loading="lazy"
              />
            </>
          ) : (
            <div className="status-panel">{geoStatus}</div>
          )}
        </div>

        <div className="map-panel">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Destination Map</p>
              <h2 className="section-title">Pick a place to explore</h2>
            </div>
            <Navigation size={20} />
          </div>

          <select className="input-field" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>

          {selectedLocation && selectedCoords && (
            <>
              <div className="map-location-card">
                <img
                  src={resolveImageUrl(selectedLocation.image_url)}
                  alt={selectedLocation.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = FALLBACK_IMAGE_URL;
                  }}
                />
                <div>
                  <h3>{selectedLocation.name}</h3>
                  <p>{selectedLocation.state}</p>
                  <span>
                    {selectedCoords.lat.toFixed(4)}, {selectedCoords.lon.toFixed(4)}
                  </span>
                </div>
              </div>

              <iframe
                className="map-frame"
                title={`${selectedLocation.name} map`}
                src={destinationMapUrl}
                loading="lazy"
              />

              <a className="btn-primary map-route-button" href={directionsUrl} target="_blank" rel="noreferrer">
                Open map location <ExternalLink size={16} />
              </a>
            </>
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">All Destinations</p>
            <h2 className="section-title">Interactive tourist map with {locations.length} clickable pins</h2>
          </div>
          <MapIcon size={20} />
        </div>

        <div className="map-explorer">
          <div className="tourist-map-board">
            <div className="tourist-map-board__backdrop" />
            <div className="tourist-map-board__shape" />

            {plottedLocations.map((location) => {
              const isActive = String(location.id) === selectedId;
              const pinPosition = projectToMap(location.coords);

              return (
                <button
                  key={location.id}
                  type="button"
                  className={`tourist-map-pin${isActive ? ' tourist-map-pin--active' : ''}`}
                  style={pinPosition}
                  onClick={() => setSelectedId(String(location.id))}
                  aria-label={`Show ${location.name} on map`}
                >
                  <span className="tourist-map-pin__dot" />
                  <span className="tourist-map-pin__label">{location.name}</span>
                </button>
              );
            })}
          </div>

          {selectedLocation && selectedCoords && (
            <aside className="map-selection-card">
              <img
                src={resolveImageUrl(selectedLocation.image_url)}
                alt={selectedLocation.name}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = FALLBACK_IMAGE_URL;
                }}
              />
              <div className="map-selection-card__body">
                <p className="section-eyebrow">Selected stop</p>
                <h3>{selectedLocation.name}</h3>
                <p>{selectedLocation.description}</p>
                <div className="map-selection-card__meta">
                  <span>{selectedLocation.state}</span>
                  <span>
                    {selectedCoords.lat.toFixed(4)}, {selectedCoords.lon.toFixed(4)}
                  </span>
                </div>
                <a className="btn-secondary" href={directionsUrl} target="_blank" rel="noreferrer">
                  Open in maps <ExternalLink size={16} />
                </a>
              </div>
            </aside>
          )}
        </div>
      </section>
    </div>
  );
};

export default Maps;
