/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';

export function useSpatialNavigation(options: { 
  topItems: number; 
  bottomItems: number; 
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const totalItems = options.topItems + options.bottomItems;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        setActiveIndex((prev) => (prev + 1) % totalItems);
        break;
      case 'ArrowLeft':
        setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
        break;
      case 'ArrowDown':
        if (activeIndex < options.topItems) {
          // Move from top row to bottom carrousel
          setActiveIndex(options.topItems);
        }
        break;
      case 'ArrowUp':
        if (activeIndex >= options.topItems) {
          // Move from bottom carrousel to top row (center item)
          setActiveIndex(Math.floor(options.topItems / 2));
        }
        break;
      case 'Enter':
        const focused = document.querySelector('[data-focused="true"]') as HTMLElement;
        if (focused) focused.click();
        break;
    }
  }, [activeIndex, totalItems, options]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { activeIndex, setActiveIndex };
}

