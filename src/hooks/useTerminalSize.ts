import { useState, useEffect } from 'react';
import { MIN_BOX_WIDTH, MAX_BOX_WIDTH } from '../utils/config.js';

/** Returns a clamped box width that updates on terminal resize. */
export function useTerminalSize() {
  const calc = () => {
    const cols = process.stdout.columns || 80;
    return Math.max(MIN_BOX_WIDTH, Math.min(MAX_BOX_WIDTH, cols));
  };

  const [boxWidth, setBoxWidth] = useState(calc);

  useEffect(() => {
    const onResize = () => setBoxWidth(calc());
    process.stdout.on('resize', onResize);
    return () => { process.stdout.off('resize', onResize); };
  }, []);

  return { boxWidth, innerWidth: boxWidth - 2 };
}
