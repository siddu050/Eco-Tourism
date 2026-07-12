import { destinationCoordinates } from '../data/siteContent';

const EARTH_RADIUS_KM = 6371;

const transportCatalog = {
  bus: {
    id: 'bus',
    label: 'Bus',
    description: 'Affordable road travel with a budget-friendly fare estimate.',
  },
  flight: {
    id: 'flight',
    label: 'Flight',
    description: 'Faster travel with an airfare-style estimate for longer routes.',
  },
  car: {
    id: 'car',
    label: 'Car',
    description: 'Private travel with a fare based on your selected car type.',
  },
};

const carCatalog = {
  economy: {
    id: 'economy',
    label: 'Economy Cab',
    baseFare: 220,
    perKmRate: 1.8,
    maxFare: 1400,
  },
  hatchback: {
    id: 'hatchback',
    label: 'Hatchback',
    baseFare: 350,
    perKmRate: 2.4,
    maxFare: 2000,
  },
  sedan: {
    id: 'sedan',
    label: 'Sedan',
    baseFare: 500,
    perKmRate: 3.2,
    maxFare: 2600,
  },
  suv: {
    id: 'suv',
    label: 'SUV',
    baseFare: 700,
    perKmRate: 4.2,
    maxFare: 3400,
  },
  premium_sedan: {
    id: 'premium_sedan',
    label: 'Premium Sedan',
    baseFare: 900,
    perKmRate: 4.8,
    maxFare: 4200,
  },
  luxury_suv: {
    id: 'luxury_suv',
    label: 'Luxury SUV',
    baseFare: 1200,
    perKmRate: 5.8,
    maxFare: 5600,
  },
  electric_cab: {
    id: 'electric_cab',
    label: 'Electric Cab',
    baseFare: 420,
    perKmRate: 2.6,
    maxFare: 2200,
  },
  traveller_van: {
    id: 'traveller_van',
    label: 'Traveller Van',
    baseFare: 1300,
    perKmRate: 6.2,
    maxFare: 6200,
  },
};

const destinationTravelRules = {
  'Andaman Islands': {
    availableModes: ['flight'],
    defaultMode: 'flight',
    flightOnly: true,
    airportTransferIncluded: true,
    airportName: 'Veer Savarkar Airport, Port Blair',
    airportCoordinates: { lat: 11.6412, lon: 92.7297 },
    airportTransferLabel: 'Airport transfer cab from Veer Savarkar Airport',
    airportTransferPrice: 1400,
    airportTransferCarType: 'suv',
    transportNote: 'Road and bus travel are not available to Andaman Islands. Flight is the only primary transfer option.',
  },
};

const facilityCatalog = [
  {
    id: 'food',
    title: 'Food plan',
    description: 'Meal-friendly dining options and restaurant clusters close to your booked destination.',
    priceLabel: 'Per stay',
    query: 'restaurants',
    calculatePrice: ({ nightlyRate, nights }) => roundToNearest(Math.max(250, nightlyRate * 0.08) * nights, 50),
  },
  {
    id: 'beverage',
    title: 'Beverage plan',
    description: 'Coffee stops, juice bars, and comfort beverage spots for breaks during the trip.',
    priceLabel: 'Per booking',
    query: 'cafes',
    calculatePrice: ({ nightlyRate, guests }) => roundToNearest(Math.max(120, nightlyRate * 0.04) * Math.max(1, Math.ceil(guests / 2)), 50),
  },
  {
    id: 'residence',
    title: 'Hotel residences',
    description: 'Nearby hotel and residence options with an added stay-support budget around the destination.',
    priceLabel: 'Per stay',
    query: 'hotels',
    calculatePrice: ({ nightlyRate, nights }) => roundToNearest(Math.max(350, nightlyRate * 0.1) * nights, 50),
  },
];

export const transportOptions = Object.values(transportCatalog).map(({ id, label, description }) => ({
  id,
  label,
  description,
}));

export const carTypeOptions = Object.values(carCatalog).map(({ id, label }) => ({
  id,
  label,
}));

export const getDestinationCoordinates = (locationName) => destinationCoordinates[locationName] || null;

const getDestinationTravelRule = (location) => {
  if (!location?.name) {
    return null;
  }

  return destinationTravelRules[location.name] || null;
};

export const getTransportOptionsForBooking = ({ location, distanceKm }) => {
  const rule = getDestinationTravelRule(location);
  const safeDistance = Number.isFinite(distanceKm) ? distanceKm : null;

  if (rule?.availableModes?.length) {
    return rule.availableModes.map((modeId) => transportCatalog[modeId]).filter(Boolean);
  }

  if (safeDistance == null) {
    return [transportCatalog.car, transportCatalog.bus];
  }

  if (safeDistance <= 12) {
    return [transportCatalog.car];
  }

  if (safeDistance < 180) {
    return [transportCatalog.car, transportCatalog.bus];
  }

  return [transportCatalog.car, transportCatalog.bus, transportCatalog.flight];
};

export const getDefaultTransportMode = ({ location, distanceKm }) => {
  const rule = getDestinationTravelRule(location);
  if (rule?.defaultMode) {
    return rule.defaultMode;
  }

  const safeDistance = Number.isFinite(distanceKm) ? distanceKm : null;
  if (safeDistance == null || safeDistance <= 60) {
    return 'car';
  }

  if (safeDistance >= 300) {
    return 'flight';
  }

  return 'bus';
};

export const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) {
    return 1;
  }

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMs = end.getTime() - start.getTime();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || diffMs <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

export const calculateDistanceKm = (origin, destination) => {
  if (!origin || !destination) {
    return null;
  }

  const toRadians = (value) => (value * Math.PI) / 180;
  const latDelta = toRadians(destination.lat - origin.lat);
  const lonDelta = toRadians(destination.lon - origin.lon);
  const originLat = toRadians(origin.lat);
  const destinationLat = toRadians(destination.lat);

  const arc =
    (Math.sin(latDelta / 2) ** 2) +
    (Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(lonDelta / 2) ** 2);

  const distance = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(arc));
  return Number.isFinite(distance) ? distance : null;
};

export const calculateDistanceSurcharge = (distanceKm) => {
  if (!Number.isFinite(distanceKm) || distanceKm <= 40) {
    return 0;
  }

  const surcharge = Math.min(900, Math.max(0, (distanceKm - 40) * 1.75));
  return roundToNearest(surcharge, 50);
};

const getMapRouteContext = ({ location, origin, destination, transportMode }) => {
  const travelRule = getDestinationTravelRule(location);

  if (travelRule?.flightOnly && travelRule.airportCoordinates && destination) {
    return {
      origin: travelRule.airportCoordinates,
      destination,
      routeLabel: 'airport transfer route',
      routeNote: `Map preview shows the included cab transfer from ${travelRule.airportName} after your flight lands.`,
    };
  }

  if (!origin || !destination) {
    return {
      origin: null,
      destination,
      routeLabel: transportMode === 'flight' ? 'destination map' : 'Google route',
      routeNote: transportMode === 'flight'
        ? 'Flight bookings show the destination map because the long-distance leg is handled by air.'
        : '',
    };
  }

  return {
    origin,
    destination,
    routeLabel: 'Google route',
    routeNote: '',
  };
};

export const buildGoogleDirectionsUrl = (origin, destination) => {
  if (!origin || !destination) {
    return '';
  }

  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lon}&destination=${destination.lat},${destination.lon}&travelmode=driving`;
};

export const buildGoogleDirectionsEmbedUrl = (origin, destination) => {
  if (!destination) {
    return '';
  }

  if (!origin) {
    return buildGoogleDestinationEmbedUrl(destination);
  }

  return `https://www.google.com/maps?saddr=${origin.lat},${origin.lon}&daddr=${destination.lat},${destination.lon}&output=embed`;
};

export const buildGoogleDestinationEmbedUrl = (destination) => {
  if (!destination) {
    return '';
  }

  return `https://www.google.com/maps?q=${destination.lat},${destination.lon}&z=12&output=embed`;
};

export const buildGoogleSearchUrl = (query) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const buildFacilityOptions = ({ location, nights, guests }) => {
  if (!location) {
    return [];
  }

  return facilityCatalog.map((facility) => ({
    id: facility.id,
    title: facility.title,
    description: facility.description,
    priceLabel: facility.priceLabel,
    price: facility.calculatePrice({
      nightlyRate: Number(location.price_per_night || 0),
      nights,
      guests,
    }),
    googleMapsUrl: buildGoogleSearchUrl(`${facility.query} near ${location.name}, ${location.state}, India`),
  }));
};

export const buildTransportPlan = ({ location, distanceKm, transportMode = 'bus', carType = 'hatchback' }) => {
  const safeDistance = Number.isFinite(distanceKm) ? distanceKm : null;
  const travelRule = getDestinationTravelRule(location);
  const allowedModeIds = getTransportOptionsForBooking({ location, distanceKm }).map((option) => option.id);
  const resolvedTransportMode = allowedModeIds.includes(transportMode)
    ? transportMode
    : getDefaultTransportMode({ location, distanceKm });
  const selectedTransport = transportCatalog[resolvedTransportMode] || transportCatalog.bus;
  const selectedCar = carCatalog[carType] || carCatalog.hatchback;

  if (selectedTransport.id === 'flight') {
    const baseFare = travelRule?.flightOnly ? 4200 : 2200;
    const fare = safeDistance == null
      ? baseFare
      : Math.min(travelRule?.flightOnly ? 9800 : 5200, baseFare + Math.max(0, safeDistance - 120) * (travelRule?.flightOnly ? 2.1 : 1.35));
    const airportTransfer = travelRule?.airportTransferIncluded
      ? {
          included: true,
          label: travelRule.airportTransferLabel,
          estimated_price: roundToNearest(travelRule.airportTransferPrice || 0, 50),
          car_type: travelRule.airportTransferCarType || 'suv',
          car_label: (carCatalog[travelRule.airportTransferCarType || 'suv'] || carCatalog.suv).label,
        }
      : null;

    return {
      mode: selectedTransport.id,
      label: selectedTransport.label,
      description: travelRule?.transportNote || selectedTransport.description,
      car_type: null,
      car_label: null,
      airport_transfer: airportTransfer,
      estimated_price: roundToNearest(fare, 50),
    };
  }

  if (selectedTransport.id === 'car') {
    const fare = safeDistance == null
      ? selectedCar.baseFare
      : Math.min(selectedCar.maxFare, selectedCar.baseFare + Math.max(0, safeDistance - 20) * selectedCar.perKmRate);

    return {
      mode: selectedTransport.id,
      label: selectedTransport.label,
      description: travelRule?.transportNote || selectedTransport.description,
      car_type: selectedCar.id,
      car_label: selectedCar.label,
      airport_transfer: null,
      estimated_price: roundToNearest(fare, 50),
    };
  }

  const fare = safeDistance == null
    ? 250
    : Math.min(1400, 200 + Math.max(0, safeDistance - 40) * 0.9);

  return {
    mode: selectedTransport.id,
    label: selectedTransport.label,
    description: travelRule?.transportNote || selectedTransport.description,
    car_type: null,
    car_label: null,
    airport_transfer: null,
    estimated_price: roundToNearest(fare, 50),
  };
};

export const buildPricingBreakdown = ({
  location,
  nights,
  distanceKm,
  selectedFacilityIds,
  origin,
  destination,
  guests,
  transportMode,
  carType,
}) => {
  const stayAmount = roundToNearest(Number(location?.price_per_night || 0) * nights, 50);
  const transport = buildTransportPlan({ location, distanceKm, transportMode, carType });
  const airportTransferCost = transport.airport_transfer?.estimated_price || 0;
  const facilityOptions = buildFacilityOptions({ location, nights, guests });
  const selectedFacilities = facilityOptions.filter((facility) => selectedFacilityIds.includes(facility.id));
  const facilityTotal = selectedFacilities.reduce((sum, facility) => sum + facility.price, 0);
  const totalPrice = stayAmount + transport.estimated_price + airportTransferCost + facilityTotal;
  const mapRoute = getMapRouteContext({
    location,
    origin,
    destination,
    transportMode: transport.mode,
  });

  return {
    nights,
    nightly_rate: Number(location?.price_per_night || 0),
    stay_amount: stayAmount,
    distance_km: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(1)) : null,
    distance_surcharge: transport.estimated_price,
    transport,
    transport_cost: transport.estimated_price,
    airport_transfer_cost: airportTransferCost,
    facility_total: facilityTotal,
    total_price: totalPrice,
    selected_facilities: selectedFacilities,
    google_maps: {
      directions_url: buildGoogleDirectionsUrl(mapRoute.origin, mapRoute.destination),
      directions_embed_url: buildGoogleDirectionsEmbedUrl(mapRoute.origin, mapRoute.destination),
      destination_embed_url: buildGoogleDestinationEmbedUrl(destination),
      route_label: mapRoute.routeLabel,
      route_note: mapRoute.routeNote,
    },
  };
};

function roundToNearest(amount, step = 50) {
  return Math.round(amount / step) * step;
}
