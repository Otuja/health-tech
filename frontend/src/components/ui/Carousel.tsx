import React, { useState } from 'react';
import { Button } from './Button';

export interface CarouselItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface CarouselProps {
  items: CarouselItem[];
  className?: string;
}

export function Carousel({ items, className = '' }: CarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const next = () => setActiveIndex((i) => (i + 1) % items.length);
  const prev = () => setActiveIndex((i) => (i - 1 + items.length) % items.length);

  if (!items || items.length === 0) return null;

  return (
    <div className={`relative w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-base)] shadow-[0_50px_100px_-20px_rgba(50,50,93,0.1)] p-8 ${className}`}>
      <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
        {items.map((item) => (
          <div key={item.id} className="min-w-full flex-shrink-0 px-4">
            <div className="text-4xl mb-4">{item.icon}</div>
            <h3 className="text-[var(--font-size-2xl)] font-medium text-[var(--color-text-tertiary)] mb-2">{item.title}</h3>
            <p className="text-[var(--font-size-md)] text-[var(--color-text-primary)] leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
      
      {/* Controls */}
      <div className="flex justify-between items-center mt-8 px-4">
        <div className="flex gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${idx === activeIndex ? 'bg-[var(--color-surface-strong)] w-6' : 'bg-gray-300 hover:bg-gray-400'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={prev} aria-label="Previous slide" className="p-2">
            &larr;
          </Button>
          <Button variant="ghost" onClick={next} aria-label="Next slide" className="p-2">
            &rarr;
          </Button>
        </div>
      </div>
    </div>
  );
}
