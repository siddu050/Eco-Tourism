import React from 'react';
import { HeartHandshake, Leaf, ShieldCheck } from 'lucide-react';
import { values } from '../data/siteContent';

const icons = [HeartHandshake, Leaf, ShieldCheck];

const About = () => (
  <div className="page-stack">
    <section className="page-hero page-hero--about">
      <div className="page-hero__content">
        <p className="section-eyebrow">About</p>
        <h1>A travel interface shaped around atmosphere, trust, and discoverability.</h1>
        <p className="section-copy">
          This experience is built to feel editorial on the surface while keeping the core search and booking flow easy to use.
        </p>
      </div>
    </section>

    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">What Changed</p>
          <h2 className="section-title">A richer product story across multiple pages</h2>
        </div>
      </div>

      <div className="value-grid">
        {values.map((value, index) => {
          const Icon = icons[index];
          return (
            <article key={value.title} className="value-card">
              <div className="value-card__icon">
                <Icon size={22} />
              </div>
              <h3>{value.title}</h3>
              <p>{value.body}</p>
            </article>
          );
        })}
      </div>
    </section>

    <section className="quote-banner">
      <p>"The goal is a travel site that helps people feel the place before they book the stay."</p>
    </section>
  </div>
);

export default About;
