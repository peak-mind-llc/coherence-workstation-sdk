import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, render, screen } from '@testing-library/react';
import {
  setPaneRuntime,
  resetPaneRuntimeForTesting,
  useWorkstationSession,
  useScopedBusArtifact,
  usePriorRecording,
  usePriorBusArtifact,
  SignOffToAnalyze,
  useNotSignedOff,
  useStaleFitPendingReview,
  useSpectralScalePref,
  useMontage,
  type PaneRuntime,
  type PaneSession,
} from '../pane-runtime';

function makeFakeSession(): PaneSession {
  return {
    subjectId: 'subj-1',
    sessionDate: '2026-01-01',
    instances: [
      { kind: 'qeeg', seed: { instanceId: 'qeeg:resting_eo', label: 'QEEG · EO', context: { condition: 'resting_eo' } } },
    ],
    activeLayers: new Set([1, 2, 4]),
    operationStack: { some: 'opaque-shape' },
    signOffRevision: 3,
    synchronizer: {
      getLastEvent: vi.fn(() => ({ payload: { fake: true } })),
      subscribe: vi.fn(() => () => undefined),
    },
    maximizedPaneId: null,
    toggleMaximize: vi.fn(),
  };
}

function makeFakeRuntime(): PaneRuntime {
  return {
    useWorkstationSession: () => makeFakeSession(),
    useScopedBusArtifact: vi.fn((baseName: string, programInstanceId: string | undefined) => ({
      provenance: { producer: 'fake', hash: 'x' } as never,
      data: { baseName, programInstanceId },
    })) as unknown as PaneRuntime['useScopedBusArtifact'],
    usePriorRecording: vi.fn((subjectId, currentDate, paradigm) => ({
      date: '2025-12-01',
      reason: null,
      loading: false,
      error: null,
      _args: { subjectId, currentDate, paradigm },
    })) as unknown as PaneRuntime['usePriorRecording'],
    usePriorBusArtifact: vi.fn((baseName, subjectId, priorDate, condition) => ({
      data: { baseName, subjectId, priorDate, condition },
      loading: false,
      error: null,
    })) as unknown as PaneRuntime['usePriorBusArtifact'],
    SignOffToAnalyze: ({ label }: { label?: string }) => (
      <div data-testid="fake-sign-off">{label ?? 'analysis'}</div>
    ),
    useNotSignedOff: () => false,
    useStaleFitPendingReview: () => false,
    useSpectralScalePref: () => ['amplitude', vi.fn()],
    useMontage: () => 'average_ref',
  };
}

describe('pane-runtime', () => {
  beforeEach(() => {
    resetPaneRuntimeForTesting();
  });

  it('throws a clear error when nothing has been registered', () => {
    expect(() => renderHook(() => useWorkstationSession())).toThrow(
      /PaneRuntime is not registered/,
    );
  });

  it('throws for every delegating export when unregistered', () => {
    expect(() => renderHook(() => useScopedBusArtifact('psd.welch.per_channel', 'inst-1'))).toThrow(
      /PaneRuntime is not registered/,
    );
    expect(() => renderHook(() => usePriorRecording('subj-1', '2026-01-01'))).toThrow(
      /PaneRuntime is not registered/,
    );
    expect(() =>
      renderHook(() => usePriorBusArtifact('normative.report', 'subj-1', '2025-12-01', 'resting_eo')),
    ).toThrow(/PaneRuntime is not registered/);
    expect(() => render(<SignOffToAnalyze />)).toThrow(/PaneRuntime is not registered/);
    expect(() => renderHook(() => useNotSignedOff())).toThrow(/PaneRuntime is not registered/);
    expect(() => renderHook(() => useStaleFitPendingReview())).toThrow(
      /PaneRuntime is not registered/,
    );
    expect(() => renderHook(() => useSpectralScalePref())).toThrow(
      /PaneRuntime is not registered/,
    );
    expect(() => renderHook(() => useMontage())).toThrow(/PaneRuntime is not registered/);
  });

  it('useWorkstationSession delegates to the registered implementation', () => {
    const fake = makeFakeRuntime();
    setPaneRuntime(fake);

    const { result } = renderHook(() => useWorkstationSession());
    expect(result.current.subjectId).toBe('subj-1');
    expect(result.current.sessionDate).toBe('2026-01-01');
    expect(result.current.activeLayers.has(4)).toBe(true);
    expect(result.current.activeLayers.has(3)).toBe(false);
    expect(result.current.signOffRevision).toBe(3);
    expect(result.current.synchronizer.getLastEvent('group', 'channel')).toEqual({
      payload: { fake: true },
    });
  });

  it('useScopedBusArtifact delegates its arguments and return value', () => {
    const fake = makeFakeRuntime();
    setPaneRuntime(fake);

    const { result } = renderHook(() =>
      useScopedBusArtifact<{ baseName: string; programInstanceId: string | undefined }>(
        'psd.welch.per_channel',
        'inst-1',
      ),
    );
    expect(fake.useScopedBusArtifact).toHaveBeenCalledWith('psd.welch.per_channel', 'inst-1');
    expect(result.current?.data).toEqual({
      baseName: 'psd.welch.per_channel',
      programInstanceId: 'inst-1',
    });
  });

  it('usePriorRecording and usePriorBusArtifact delegate their arguments', () => {
    const fake = makeFakeRuntime();
    setPaneRuntime(fake);

    const { result: priorRecording } = renderHook(() =>
      usePriorRecording('subj-1', '2026-01-01', 'resting'),
    );
    expect(fake.usePriorRecording).toHaveBeenCalledWith('subj-1', '2026-01-01', 'resting');
    expect(priorRecording.current.date).toBe('2025-12-01');

    const { result: priorArtifact } = renderHook(() =>
      usePriorBusArtifact('normative.report', 'subj-1', '2025-12-01', 'resting_eo'),
    );
    expect(fake.usePriorBusArtifact).toHaveBeenCalledWith(
      'normative.report',
      'subj-1',
      '2025-12-01',
      'resting_eo',
    );
    expect(priorArtifact.current.data).toEqual({
      baseName: 'normative.report',
      subjectId: 'subj-1',
      priorDate: '2025-12-01',
      condition: 'resting_eo',
    });
  });

  it('SignOffToAnalyze renders the registered component', () => {
    setPaneRuntime(makeFakeRuntime());

    render(<SignOffToAnalyze label="spectral" />);
    expect(screen.getByTestId('fake-sign-off').textContent).toBe('spectral');
  });

  it('useNotSignedOff, useStaleFitPendingReview, useSpectralScalePref, and useMontage delegate to the registered implementation', () => {
    const fake = makeFakeRuntime();
    fake.useStaleFitPendingReview = () => true;
    setPaneRuntime(fake);

    const { result: notSignedOff } = renderHook(() => useNotSignedOff());
    expect(notSignedOff.current).toBe(false);

    const { result: staleFitPendingReview } = renderHook(() => useStaleFitPendingReview());
    expect(staleFitPendingReview.current).toBe(true);

    const { result: spectralScale } = renderHook(() => useSpectralScalePref());
    expect(spectralScale.current[0]).toBe('amplitude');

    const { result: montage } = renderHook(() => useMontage());
    expect(montage.current).toBe('average_ref');
  });

  it('a later setPaneRuntime call replaces the registered implementation', () => {
    setPaneRuntime(makeFakeRuntime());
    const second = makeFakeRuntime();
    second.useWorkstationSession = () => ({ ...makeFakeSession(), subjectId: 'subj-2' });
    setPaneRuntime(second);

    const { result } = renderHook(() => useWorkstationSession());
    expect(result.current.subjectId).toBe('subj-2');
  });
});
