import React, { useState, useEffect, useMemo } from 'react'
import useMeasure from 'react-use-measure'
import { useTransition, a } from '@react-spring/web'
import { shuffle } from 'lodash'

import useMedia from './useMedia'
import data from './data'

import styles from './styles.module.css'

interface ImageItem {
  css: string;
  height: number;
}

interface MasonryProps {
  onSelectImage: (image: ImageItem | null) => void;
  isOverlayActive: boolean; // Nueva prop
}

function Masonry({ onSelectImage, isOverlayActive }: MasonryProps) {
  // Hook1: Tie media queries to the number of columns
  const columns = useMedia(['(min-width: 1500px)', '(min-width: 1000px)', '(min-width: 600px)'], [5, 4, 3], 2)
  // Hook2: Measure the width of the container element
  const [ref, { width }] = useMeasure()
  // Hook3: Hold items
  const [items, set] = useState(data)
  const [hoveredItemKey, setHoveredItemKey] = useState<string | null>(null);
  // Hook4: shuffle data every 2 seconds
  useEffect(() => {
    let t: number | undefined;
    if (!isOverlayActive) {
      set(shuffle); // Forzar un shuffle inmediato al desactivarse el overlay
      t = (window.setInterval(() => set(shuffle), 2000) as unknown) as number;
    }
    return () => {
      if (t) window.clearInterval(t);
    };
  }, [isOverlayActive]);
  // Hook5: Form a grid of stacked items using width & columns we got from hooks 1 & 2
  const [heights, gridItems] = useMemo(() => {
    let heights = new Array(columns).fill(0) // Each column gets a height starting with zero
    let gridItems = items.map((child, i) => {
      const column = heights.indexOf(Math.min(...heights)) // Basic masonry-grid placing, puts tile into the smallest column using Math.min
      const x = (width / columns) * column // x = container width / number of columns * column index,
      const y = (heights[column] += child.height / 2) - child.height / 2 // y = it's just the height of the current column
      return { ...child, x, y, width: width / columns, height: child.height / 2 }
    })
    return [heights, gridItems]
  }, [columns, items, width])
  // Hook6: Turn the static grid values into animated transitions, any addition, removal or change will be animated
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
  })
  // Render the grid
  return (
    <div
      ref={ref}
      className={styles.list}
      style={{
        height: Math.max(...heights),
        opacity: isOverlayActive ? 0.3 : 1, // Opacidad condicional
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
  )
}

export default function App() {
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

  return (
    <>
      <Masonry onSelectImage={setSelectedImage} isOverlayActive={!!selectedImage} />
      {selectedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage.css}
            alt="Ampliada"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
            }}
            onClick={e => e.stopPropagation()} // Evita que el clic en la imagen cierre el overlay
          />
        </div>
      )}
    </>
  )
}
