import React from 'react';
import { CalendarRange, CheckCircle2, Route, Sparkles } from 'lucide-react';
import { guideCards, journeySteps, seasonalMoments } from '../data/siteContent';

const Guides = () => (
  <div className="page-stack">
    <section className="page-hero page-hero--guides">
      <div className="page-hero__content">
        <p className="section-eyebrow">Travel Guides</p>
        <h1>Plan with route ideas, seasonal timing, and practical trip rhythm.</h1>
        <p className="section-copy">
          These sections turn the site into a planning companion, not just a list of destinations.
        </p>
      </div>
      <div className="guide-pillars">
        <div><Route size={18} /> Route ideas</div>
        <div><CalendarRange size={18} /> Best seasons</div>
        <div><Sparkles size={18} /> Smart trip pacing</div>
      </div>
    </section>

    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Suggested Itineraries</p>
          <h2 className="section-title">Multi-stop trips that feel intentional</h2>
        </div>
      </div>

      <div className="guide-grid">
        {guideCards.map((guide) => (
          <article key={guide.title} className="guide-card">
            <span className="guide-card__duration">{guide.duration}</span>
            <h3>{guide.title}</h3>
            <p>{guide.summary}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="split-section">
      <div className="checklist-card">
        <p className="section-eyebrow">Trip Flow</p>
        <h2 className="section-title">How to use the platform</h2>
        <div className="checklist">
          {journeySteps.map((step) => (
            <div key={step.title} className="checklist__item">
              <CheckCircle2 size={18} />
              <div>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="season-card">
        <p className="section-eyebrow">Seasonality</p>
        <h2 className="section-title">When to go</h2>
        <div className="season-list">
          {seasonalMoments.map((item) => (
            <div key={item.season} className="season-list__item">
              <strong>{item.season}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  </div>
);

export default Guides;
