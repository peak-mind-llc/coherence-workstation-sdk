import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useActiveLayers,
  setActiveLayersForTests,
  resetActiveLayersForTests,
} from '../active-layers';

describe('useActiveLayers', () => {
  beforeEach(() => {
    resetActiveLayersForTests();
  });

  it('returns isVisible=true when target layer is active', () => {
    setActiveLayersForTests(new Set([0, 1, 2]));
    const { result } = renderHook(() => useActiveLayers([1]));
    expect(result.current.isVisible).toBe(true);
  });

  it('returns isVisible=false when target layer is not active (substrate sacred)', () => {
    setActiveLayersForTests(new Set([0]));
    const { result } = renderHook(() => useActiveLayers([1]));
    expect(result.current.isVisible).toBe(false);
  });

  it('defaults target layers to [1,2,3,4] when none specified', () => {
    setActiveLayersForTests(new Set([0]));
    const { result } = renderHook(() => useActiveLayers());
    expect(result.current.isVisible).toBe(false);
  });
});
