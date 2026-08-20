import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Maximize2,
  Minimize2,
  Navigation,
  Compass,
  Layers,
  MapPin,
  Star,
  ExternalLink,
  ArrowRight,
  Crosshair,
  Sparkles,
  Search,
} from 'lucide-react';
import { resolveImageUrl, FALLBACK_IMAGE_URL } from '../services/api';

const INDIA_CENTER = [22.5937, 78.9629];
const DEFAULT_ZOOM = 5;

const TILE_LAYERS = {
  scenic: {
    name: 'Eco Scenic',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  },
  terrain: {
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap contributors',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};

const REGION_BOUNDS = {
  all: { center: [22.5937, 78.9629], zoom: 5 },
  north: { center: [29.5, 77.5], zoom: 6 },
  south: { center: [13.0, 77.5], zoom: 6 },
  west: { center: [21.5, 71.5], zoom: 6 },
  east: { center: [24.0, 88.0], zoom: 6 },
};

export const InteractiveIndiaMap = ({
  locations = [],
  selectedLocation = null,
  onSelectLocation = () => {},
  userPosition = null,
  activeRegion = 'all',
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const activeTileLayerRef = useRef(null);

  const [activeTileType, setActiveTileType] = useState('scenic');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapSearch, setMapSearch] = useState('');

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: INDIA_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 4,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const initialTile = TILE_LAYERS.scenic;
    const tileLayer = L.tileLayer(initialTile.url, {
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    activeTileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Switch Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    const tileConf = TILE_LAYERS[activeTileType] || TILE_LAYERS.scenic;
    const newLayer = L.tileLayer(tileConf.url, {
      maxZoom: 18,
      subdomains: 'abcd',
      attribution: tileConf.attribution,
    }).addTo(map);

    activeTileLayerRef.current = newLayer;
  }, [activeTileType]);

  // 3. Render and update destination markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
    markersRef.current = {};

    locations.forEach((loc) => {
      if (!loc.coords) return;

      const isSelected = selectedLocation && String(selectedLocation.id) === String(loc.id);

      const customIcon = L.divIcon({
        className: 'custom-map-marker-container',
        html: `
          <div class="custom-map-pin ${isSelected ? 'custom-map-pin--selected' : ''}">
            <div class="custom-map-pin__pulse"></div>
            <div class="custom-map-pin__dot">
              <span class="pin-icon">📍</span>
            </div>
            <div class="custom-map-pin__label">
              <span>${loc.name}</span>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([loc.coords.lat, loc.coords.lon], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        onSelectLocation(loc);
        map.flyTo([loc.coords.lat, loc.coords.lon], Math.max(map.getZoom(), 7), {
          duration: 0.8,
          easeLinearity: 0.25,
        });
      });

      markersRef.current[loc.id] = marker;
    });
  }, [locations, selectedLocation, onSelectLocation]);

  // 4. Update User GPS Marker & Route Line
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userPosition) {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
      }

      const userIcon = L.divIcon({
        className: 'user-gps-marker-container',
        html: `
          <div class="user-gps-pin">
            <div class="user-gps-pulse"></div>
            <div class="user-gps-center"></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      userMarkerRef.current = L.marker([userPosition.lat, userPosition.lon], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      // Draw connection line to selected location
      if (selectedLocation && selectedLocation.coords) {
        if (routeLineRef.current) {
          map.removeLayer(routeLineRef.current);
        }

        const latlngs = [
          [userPosition.lat, userPosition.lon],
          [selectedLocation.coords.lat, selectedLocation.coords.lon],
        ];

        routeLineRef.current = L.polyline(latlngs, {
          color: '#1f8a70',
          weight: 3,
          opacity: 0.7,
          dashArray: '8, 8',
        }).addTo(map);
      }
    }
  }, [userPosition, selectedLocation]);

  // 5. Region Pan
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = REGION_BOUNDS[activeRegion];
    if (bounds) {
      map.flyTo(bounds.center, bounds.zoom, { duration: 1.2 });
    }
  }, [activeRegion]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo(INDIA_CENTER, DEFAULT_ZOOM, { duration: 1 });
    }
  };

  const handleSearchJump = (e) => {
    e.preventDefault();
    if (!mapSearch.trim()) return;

    const query = mapSearch.toLowerCase();
    const matched = locations.find(
      (l) => l.name.toLowerCase().includes(query) || l.state.toLowerCase().includes(query)
    );

    if (matched && matched.coords) {
      onSelectLocation(matched);
      mapInstanceRef.current?.flyTo([matched.coords.lat, matched.coords.lon], 9, { duration: 1 });
      setMapSearch('');
    }
  };

  return (
    <div className={`india-map-wrapper${isFullscreen ? ' india-map-wrapper--fullscreen' : ''}`}>
      {/* Top Map Control Bar */}
      <div className="india-map-controls-bar">
        <form onSubmit={handleSearchJump} className="map-search-form">
          <Search size={15} />
          <input
            type="text"
            className="map-search-input"
            placeholder="Search stop (e.g. Taj Mahal, Munnar)..."
            value={mapSearch}
            onChange={(e) => setMapSearch(e.target.value)}
          />
        </form>

        <div className="map-layer-selector">
          <button
            type="button"
            className={`layer-btn${activeTileType === 'scenic' ? ' layer-btn--active' : ''}`}
            onClick={() => setActiveTileType('scenic')}
            title="Eco Scenic Map"
          >
            Scenic
          </button>
          <button
            type="button"
            className={`layer-btn${activeTileType === 'terrain' ? ' layer-btn--active' : ''}`}
            onClick={() => setActiveTileType('terrain')}
            title="Topographic Terrain"
          >
            Terrain
          </button>
          <button
            type="button"
            className={`layer-btn${activeTileType === 'satellite' ? ' layer-btn--active' : ''}`}
            onClick={() => setActiveTileType('satellite')}
            title="Satellite Imagery"
          >
            Satellite
          </button>
        </div>

        <div className="map-util-buttons">
          <button
            type="button"
            className="map-util-btn"
            onClick={handleRecenter}
            title="Reset Map to All India"
          >
            <Compass size={16} /> Reset
          </button>
          <button
            type="button"
            className="map-util-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Actual Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="india-map-canvas" />

      {/* Map Legend Overlay */}
      <div className="india-map-legend">
        <div className="legend-item">
          <span className="legend-dot legend-dot--dest" />
          <span>{locations.length} Eco Destinations</span>
        </div>
        {userPosition && (
          <div className="legend-item">
            <span className="legend-dot legend-dot--user" />
            <span>Your GPS Radar</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveIndiaMap;
