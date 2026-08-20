import React from 'react';

export const SkeletonCard = () => {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card__image shimmer" />
      <div className="skeleton-card__body">
        <div className="skeleton-card__line skeleton-card__line--title shimmer" />
        <div className="skeleton-card__line skeleton-card__line--subtitle shimmer" />
        <div className="skeleton-card__line skeleton-card__line--text shimmer" />
        <div className="skeleton-card__line skeleton-card__line--text shimmer" style={{ width: '80%' }} />
        <div className="skeleton-card__footer">
          <div className="skeleton-card__pill shimmer" />
          <div className="skeleton-card__pill shimmer" style={{ width: '90px' }} />
        </div>
      </div>
    </div>
  );
};

export const SkeletonGrid = ({ count = 6 }) => {
  return (
    <div className="destination-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export default SkeletonCard;
