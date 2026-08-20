import React, { useState } from 'react';
import { Sparkles, ArrowRight, RotateCcw, MapPin, Star, Heart, Check } from 'lucide-react';
import { resolveImageUrl, FALLBACK_IMAGE_URL } from '../services/api';
import { Link } from 'react-router-dom';

const MOODS = [
  { id: 'mountains', label: 'Misty Mountains', icon: '🏔️', desc: 'Cool breeze, pine trees, tea hills', keywords: ['Munnar', 'Darjeeling', 'Ladakh', 'Ooty', 'Valley of Flowers', 'Rishikesh'] },
  { id: 'coastal', label: 'Coastal Breeze', icon: '🏖️', desc: 'Sunlit shores, backwaters, lagoons', keywords: ['Goa', 'Kerala', 'Andaman', 'Puducherry'] },
  { id: 'heritage', label: 'Royal Heritage', icon: '🏰', desc: 'Palaces, ancient forts, storied architecture', keywords: ['Jaipur', 'Taj Mahal', 'Mysore', 'Udaipur', 'Jaisalmer', 'Hampi', 'Golkonda', 'Charminar'] },
  { id: 'spiritual', label: 'Spiritual Calm', icon: '🕉️', desc: 'Ghats, morning bells, temple art', keywords: ['Varanasi', 'Golden Temple', 'Rishikesh', 'Khajuraho', 'Konark', 'Ellora'] },
  { id: 'wildlife', label: 'Nature & Wildlife', icon: '🌿', desc: 'National parks, mangroves, biodiversity', keywords: ['Kaziranga', 'Sunderbans', 'Meghalaya', 'Coorg', 'Rann of Kutch'] },
];

const STYLES = [
  { id: 'solo', label: 'Solo Wanderer', icon: '🎒', desc: 'Mindful slow travel & self-discovery' },
  { id: 'couple', label: 'Romantic Escape', icon: '💑', desc: 'Scenic stays & intimate sunset views' },
  { id: 'family', label: 'Family Holiday', icon: '👨‍👩‍👧‍👦', desc: 'Comfortable pacing & rich stories for all ages' },
  { id: 'friends', label: 'Group Adventure', icon: '🚗', desc: 'Active trails, road trips & vibrant culture' },
];

const BUDGETS = [
  { id: 'budget', label: 'Budget Explorer', priceRange: 'Under Rs. 3,000 / night', maxPrice: 3000 },
  { id: 'balanced', label: 'Comfort & Charm', priceRange: 'Rs. 3,000 - 4,500 / night', maxPrice: 4500 },
  { id: 'luxury', label: 'Scenic Stays', priceRange: 'Rs. 4,500+ / night', maxPrice: 99999 },
];

export const VibeMatcher = ({ allLocations = [], onSelectDestination, onQuickView }) => {
  const [step, setStep] = useState(1);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [matchedResults, setMatchedResults] = useState([]);

  const handleMatch = (budget) => {
    setSelectedBudget(budget);
    setStep(4);

    // Calculate match scores
    const moodObj = MOODS.find((m) => m.id === selectedMood);
    const keywords = moodObj ? moodObj.keywords : [];

    const scored = allLocations.map((loc) => {
      let score = 70;
      // Mood match
      if (keywords.some((k) => loc.name.toLowerCase().includes(k.toLowerCase()) || loc.description.toLowerCase().includes(k.toLowerCase()))) {
        score += 25;
      }
      // Budget match
      const price = loc.price_per_night || 3000;
      if (budget.id === 'budget' && price <= 3000) score += 10;
      else if (budget.id === 'balanced' && price >= 2500 && price <= 4500) score += 10;
      else if (budget.id === 'luxury' && price >= 4000) score += 10;

      // Add a slight deterministic variance for match rate
      const variance = (loc.id * 7) % 5;
      const finalScore = Math.min(99, Math.max(82, score + variance));

      return { ...loc, matchScore: finalScore };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    setMatchedResults(scored.slice(0, 3));
  };

  const handleReset = () => {
    setStep(1);
    setSelectedMood(null);
    setSelectedStyle(null);
    setSelectedBudget(null);
    setMatchedResults([]);
  };

  return (
    <div className="vibe-matcher-card">
      <div className="vibe-matcher__header">
        <div className="vibe-matcher__badge">
          <Sparkles size={16} />
          <span>Interactive Travel Matcher</span>
        </div>
        <h3>Find Your Perfect Indian Escape in 30 Seconds</h3>
        <p>Answer 3 quick preferences to get AI-tailored destination recommendations.</p>

        {step <= 3 && (
          <div className="vibe-matcher__steps-indicator">
            <span className={`step-dot${step >= 1 ? ' step-dot--active' : ''}`}>1. Vibe</span>
            <span className="step-line" />
            <span className={`step-dot${step >= 2 ? ' step-dot--active' : ''}`}>2. Style</span>
            <span className="step-line" />
            <span className={`step-dot${step >= 3 ? ' step-dot--active' : ''}`}>3. Budget</span>
          </div>
        )}
      </div>

      <div className="vibe-matcher__body">
        {step === 1 && (
          <div className="vibe-step animate-fade-in">
            <span className="vibe-step__title">Step 1: What landscape or atmosphere calls you?</span>
            <div className="vibe-options-grid">
              {MOODS.map((mood) => (
                <button
                  key={mood.id}
                  type="button"
                  className={`vibe-option-card${selectedMood === mood.id ? ' vibe-option-card--selected' : ''}`}
                  onClick={() => {
                    setSelectedMood(mood.id);
                    setStep(2);
                  }}
                >
                  <span className="vibe-option-icon">{mood.icon}</span>
                  <strong>{mood.label}</strong>
                  <p>{mood.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="vibe-step animate-fade-in">
            <div className="vibe-step__header-row">
              <span className="vibe-step__title">Step 2: Who is traveling with you?</span>
              <button type="button" className="btn-text-link" onClick={() => setStep(1)}>
                Back
              </button>
            </div>
            <div className="vibe-options-grid">
              {STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`vibe-option-card${selectedStyle === style.id ? ' vibe-option-card--selected' : ''}`}
                  onClick={() => {
                    setSelectedStyle(style.id);
                    setStep(3);
                  }}
                >
                  <span className="vibe-option-icon">{style.icon}</span>
                  <strong>{style.label}</strong>
                  <p>{style.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="vibe-step animate-fade-in">
            <div className="vibe-step__header-row">
              <span className="vibe-step__title">Step 3: What is your preferred budget range?</span>
              <button type="button" className="btn-text-link" onClick={() => setStep(2)}>
                Back
              </button>
            </div>
            <div className="vibe-options-grid">
              {BUDGETS.map((budget) => (
                <button
                  key={budget.id}
                  type="button"
                  className="vibe-option-card"
                  onClick={() => handleMatch(budget)}
                >
                  <span className="vibe-option-icon">✨</span>
                  <strong>{budget.label}</strong>
                  <p>{budget.priceRange}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="vibe-step vibe-step--results animate-fade-in">
            <div className="results-banner">
              <div className="results-banner__copy">
                <strong>We found your top matches!</strong>
                <p>Personalized based on your mood, group style, and stay preference.</p>
              </div>
              <button type="button" className="btn-secondary btn-sm" onClick={handleReset}>
                <RotateCcw size={14} /> Try again
              </button>
            </div>

            <div className="matched-grid">
              {matchedResults.map((loc) => (
                <div key={loc.id} className="matched-card">
                  <div className="matched-card__badge">
                    <Sparkles size={12} /> {loc.matchScore}% Match
                  </div>
                  <img
                    src={resolveImageUrl(loc.image_url)}
                    alt={loc.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FALLBACK_IMAGE_URL;
                    }}
                  />
                  <div className="matched-card__body">
                    <div className="matched-card__meta">
                      <div>
                        <h4>{loc.name}</h4>
                        <div className="inline-meta">
                          <MapPin size={13} />
                          <span>{loc.state}</span>
                        </div>
                      </div>
                      <span className="matched-card__price">Rs. {loc.price_per_night}/n</span>
                    </div>
                    <p>{loc.description}</p>
                    <div className="matched-card__actions">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => onQuickView && onQuickView(loc)}
                      >
                        Quick View
                      </button>
                      <Link to={`/location/${loc.id}/book`} className="btn-primary btn-sm">
                        Reserve <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VibeMatcher;
