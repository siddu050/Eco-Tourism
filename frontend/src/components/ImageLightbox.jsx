import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { resolveImageUrl, FALLBACK_IMAGE_URL } from '../services/api';

export const ImageLightbox = ({
  isOpen,
  onClose,
  images = [],
  currentIndex = 0,
  onNavigate,
  title = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onNavigate && images.length > 1) {
        onNavigate((currentIndex - 1 + images.length) % images.length);
      }
      if (e.key === 'ArrowRight' && onNavigate && images.length > 1) {
        onNavigate((currentIndex + 1) % images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-header">
          <span className="lightbox-title">{title}</span>
          <button type="button" className="lightbox-close-btn" onClick={onClose} aria-label="Close image viewer">
            <X size={24} />
          </button>
        </div>

        <div className="lightbox-stage">
          {images.length > 1 && (
            <button
              type="button"
              className="lightbox-nav-btn lightbox-nav-btn--prev"
              onClick={() => onNavigate((currentIndex - 1 + images.length) % images.length)}
              aria-label="Previous image"
            >
              <ChevronLeft size={30} />
            </button>
          )}

          <img
            src={resolveImageUrl(currentImage)}
            alt={title}
            className="lightbox-image"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_IMAGE_URL;
            }}
          />

          {images.length > 1 && (
            <button
              type="button"
              className="lightbox-nav-btn lightbox-nav-btn--next"
              onClick={() => onNavigate((currentIndex + 1) % images.length)}
              aria-label="Next image"
            >
              <ChevronRight size={30} />
            </button>
          )}
        </div>

        {images.length > 1 && (
          <div className="lightbox-thumbnails">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                className={`lightbox-thumb${idx === currentIndex ? ' lightbox-thumb--active' : ''}`}
                onClick={() => onNavigate(idx)}
              >
                <img
                  src={resolveImageUrl(img)}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_IMAGE_URL;
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;
