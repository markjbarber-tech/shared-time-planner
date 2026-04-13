import { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface DialPickerProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

export function DialPicker({ items, value, onChange, className }: DialPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const scrollStart = useRef(0);

  const currentIndex = items.indexOf(value);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const container = containerRef.current;
    if (!container) return;
    const offset = index * ITEM_HEIGHT;
    container.scrollTo({ top: offset, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToIndex(currentIndex, false);
  }, [currentIndex, scrollToIndex]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || isDragging.current) return;
    const index = Math.round(container.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    if (items[clamped] !== value) {
      onChange(items[clamped]);
    }
  }, [items, value, onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleScroll, 80);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, [handleScroll]);

  return (
    <div className={cn('relative', className)}>
      {/* Selection indicator */}
      <div
        className="absolute left-0 right-0 border-y border-foreground/10 pointer-events-none z-10"
        style={{
          top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          height: ITEM_HEIGHT,
        }}
      />
      <div
        ref={containerRef}
        className="dial-picker overflow-y-auto scrollbar-hide"
        style={{
          height: ITEM_HEIGHT * VISIBLE_ITEMS,
        }}
      >
        {/* Padding items */}
        <div style={{ height: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) }} />
        {items.map((item, i) => (
          <div
            key={item}
            className={cn('dial-picker-item', i === currentIndex && 'active')}
            onClick={() => {
              onChange(item);
              scrollToIndex(i);
            }}
          >
            {item}
          </div>
        ))}
        <div style={{ height: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) }} />
      </div>
    </div>
  );
}
