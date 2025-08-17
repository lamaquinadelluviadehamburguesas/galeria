import React, { useState, useEffect, useMemo } from 'react';
import useMeasure from 'react-use-measure';
import { useTransition, a } from '@react-spring/web';
import { shuffle } from 'lodash';

import useMedia from './useMedia';
import data from './data';
import styles from './styles.module.css';

interface ImageItem {
  css: string;
  height: number;
}

interface MasonryProps {
  onSelectImage: (image: ImageItem | null) => void;
  isOverlayActive: boolean;
}

function Masonry({ onSelectImage, isOverlayActive }: MasonryProps) {
  const columns = useMedia(['(min-width: 1500px)', '(min-width: 1000px)', '(min-width: 600px)'], [5, 4, 3], 2);
  const [ref, { width }] = useMeasure();
  const [items, set] = useState(data);
  const [hoveredItemKey, setHoveredItemKey] = useState<string | null>(null);

  useEffect(() => {
    let t: number | undefined;
    if (!isOverlayActive) {
      set(shuffle);
      t = (window.setInterval(() => set(shuffle), 5000) as unknown) as number;
    }
    return () => {
      if (t) window.clearInterval(t);
    };
  }, [isOverlayActive]);

  const [heights, gridItems] = useMemo(() => {
    let heights = new Array(columns).fill(0);
    let gridItems = items.map((child, i) => {
      const column = heights.indexOf(Math.min(...heights));
      const x = (width / columns) * column;
      const y = (heights[column] += child.height / 2) - child.height / 2;
      return { ...child, x, y, width: width / columns, height: child.height / 2 };
    });
    return [heights, gridItems];
  }, [columns, items, width]);

  const transitions = useTransition(gridItems, {
    key: (item: { css: string; height: number }) => item.css,
    from: ({ x, y, width, height }) => ({ x, y, width, height, opacity: 0 }),
    enter: ({ x, y, width, height }) => ({ x, y, width, height, opacity: 1 }),
    update: (animatedProps: { x: number, y: number, width: number, height: number, opacity: number }, item: { css: string; height: number }) => ({
      x: animatedProps.x,
      y: animatedProps.y,
      width: item.css === hoveredItemKey ? animatedProps.width * 1.1 : animatedProps.width,
      height: item.css === hoveredItemKey ? animatedProps.height * 1.1 : animatedProps.height,
    }),
    leave: { height: 0, opacity: 0 },
    config: { mass: 5, tension: 500, friction: 100 },
    trail: 25,
  });

  return (
    <div
      ref={ref}
      className={styles.list}
      style={{
        height: Math.max(...heights),
        opacity: isOverlayActive ? 0.3 : 1,
      }}
    >
      {transitions((style, item) => (
        <a.div
          style={style}
          onMouseEnter={() => setHoveredItemKey(item.css)}
          onMouseLeave={() => setHoveredItemKey(null)}
          onClick={() => onSelectImage(item)}
        >
          <div style={{ backgroundImage: `url(${item.css})` }} />
        </a.div>
      ))}
    </div>
  );
}

export default function App() {
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (selectedImage) {
      const idx = data.findIndex(img => img.css === selectedImage.css);
      setCurrentIndex(idx !== -1 ? idx : null);
    } else {
      setCurrentIndex(null);
    }
  }, [selectedImage]);

  const nextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentIndex !== null && currentIndex < data.length - 1) {
      setSelectedImage(data[currentIndex + 1]);
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentIndex !== null && currentIndex > 0) {
      setSelectedImage(data[currentIndex - 1]);
    }
  };

  useEffect(() => {
    if (selectedImage) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'Escape') setSelectedImage(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
    return () => {};
  }, [selectedImage, currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diff = touchStartX - currentX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextImage();
      } else {
        prevImage();
      }
      setIsDragging(false);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchStartX(null);
  };

  return (
    <>
      <Masonry onSelectImage={setSelectedImage} isOverlayActive={!!selectedImage} />
      {selectedImage && currentIndex !== null && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            boxSizing: 'border-box',
          }}
          onClick={() => setSelectedImage(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <button
            onClick={prevImage}
            disabled={currentIndex === 0}
            style={{
              position: 'absolute',
              left: '5vw',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 'clamp(24px, 5vw, 32px)',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              zIndex: 1001,
            }}
          >
            &#8592;
          </button>
          <div
            style={{
              position: 'relative',
              width: '90vw',
              height: '90vh',
              maxWidth: '90vw',
              maxHeight: '90vh',
              backgroundImage: 'url(/frames/new-frame.png)',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <img
              src={selectedImage.css}
              alt="Ampliada"
              style={{
                maxWidth: '80%', /* Ajuste para que quepa dentro del marco */
                maxHeight: '80%',
                objectFit: 'contain',
                zIndex: 1002,
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <button
            onClick={nextImage}
            disabled={currentIndex === data.length - 1}
            style={{
              position: 'absolute',
              right: '5vw',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 'clamp(24px, 5vw, 32px)',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: currentIndex === data.length - 1 ? 'not-allowed' : 'pointer',
              zIndex: 1001,
            }}
          >
            &#8594;
          </button>
        </div>
      )}
    </>
  );
}