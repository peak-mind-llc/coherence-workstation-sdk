import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { paneFromRenderer } from '../pane-adapter';
import type { PaneAdapterProps } from '../pane-adapter';

describe('paneFromRenderer', () => {
  it('returns a PaneAdapterDefinition keyed by slot id', () => {
    const def = paneFromRenderer('phase7.spectral.foo', () => null);
    expect(def.type).toBe('phase7.spectral.foo');
    expect(def.axes).toEqual([]);
    expect(def.emits).toBeUndefined();
    expect(def.schemaVersion).toBe(1);
  });

  it('supplies empty-object default/snapshot/restore state', () => {
    const def = paneFromRenderer('phase7.spectral.foo', () => null);
    expect(def.defaultState()).toEqual({});
    expect(def.snapshotState({})).toEqual({});
    expect(def.restoreState({ junk: 'data' })).toEqual({});
  });

  it('forwards PaneProps through to the wrapped renderer', () => {
    const seen: { paneId?: string; syncGroup?: string; visible?: boolean } = {};
    function Inner(props: PaneAdapterProps<Record<string, never>>) {
      seen.paneId = props.paneId;
      seen.syncGroup = props.syncGroup;
      seen.visible = props.visible;
      return <div data-testid="inner">renderer-content</div>;
    }
    const def = paneFromRenderer('phase7.spectral.foo', Inner);

    const props: PaneAdapterProps<Record<string, never>> = {
      paneId: 'pane-1',
      programInstanceId: 'prog-1',
      syncGroup: 'group-1',
      state: {},
      setState: () => undefined,
      axes: [],
      visible: true,
    };

    const Component = def.Component;
    render(<Component {...props} />);
    expect(screen.getByTestId('inner').textContent).toBe('renderer-content');
    expect(seen.paneId).toBe('pane-1');
    expect(seen.syncGroup).toBe('group-1');
    expect(seen.visible).toBe(true);
  });

  it('still mounts a no-prop renderer (props are dropped)', () => {
    function Inner() {
      return <div data-testid="bare">no-prop</div>;
    }
    const def = paneFromRenderer('phase7.spectral.bar', Inner);
    const props: PaneAdapterProps<Record<string, never>> = {
      paneId: 'p',
      programInstanceId: 'pr',
      syncGroup: 'g',
      state: {},
      setState: () => undefined,
      axes: [],
      visible: true,
    };
    const Component = def.Component;
    render(<Component {...props} />);
    expect(screen.getByTestId('bare').textContent).toBe('no-prop');
  });

  it('threads axes and emits options into the definition', () => {
    const def = paneFromRenderer('phase7.spectral.cursor-aware', () => null, {
      axes: ['session-time', 'frequency'],
      emits: 'session-time',
    });
    expect(def.axes).toEqual(['session-time', 'frequency']);
    expect(def.emits).toBe('session-time');
  });

  it('threads info option onto the definition (SPEC-026 T35)', () => {
    const info = {
      headline: 'What question does this pane answer?',
      methodology: 'How the numbers are computed.',
      docHref: '/docs/spec/SPEC-test#section',
    };
    const def = paneFromRenderer('phase7.spectral.self-describing', () => null, {
      info,
    });
    expect(def.info).toEqual(info);
  });

  it('leaves info undefined when not supplied', () => {
    const def = paneFromRenderer('phase7.spectral.no-info', () => null);
    expect(def.info).toBeUndefined();
  });

  it('threads componentV2 into ComponentV2 on the definition (RUO-13 B2d-3)', () => {
    function V1() {
      return <div data-testid="v1">v1-content</div>;
    }
    function V2() {
      return <div data-testid="v2">v2-content</div>;
    }
    const def = paneFromRenderer('phase7.spectral.redesign-aware', V1, {
      componentV2: V2,
    });

    expect(def.ComponentV2).toBeDefined();
    const ComponentV2 = def.ComponentV2!;
    const props: PaneAdapterProps<Record<string, never>> = {
      paneId: 'p',
      programInstanceId: 'pr',
      syncGroup: 'g',
      state: {},
      setState: () => undefined,
      axes: [],
      visible: true,
    };
    render(<ComponentV2 {...props} />);
    expect(screen.getByTestId('v2').textContent).toBe('v2-content');
  });

  it('leaves ComponentV2 undefined when componentV2 is not supplied', () => {
    const def = paneFromRenderer('phase7.spectral.no-v2', () => null);
    expect(def.ComponentV2).toBeUndefined();
  });

  it('threads supportsLightCapture option onto the definition', () => {
    const def = paneFromRenderer('phase7.spectral.light-capture', () => null, {
      supportsLightCapture: true,
    });
    expect(def.supportsLightCapture).toBe(true);
  });

  it('lets a renderer call setState through forwarded props', () => {
    const setState = vi.fn();
    function Inner(props: PaneAdapterProps<Record<string, never>>) {
      return (
        <button data-testid="btn" onClick={() => props.setState({})}>
          click
        </button>
      );
    }
    const def = paneFromRenderer('phase7.spectral.stateful', Inner);
    const Component = def.Component;
    render(
      <Component
        paneId="p"
        programInstanceId="pr"
        syncGroup="g"
        state={{}}
        setState={setState}
        axes={[]}
        visible
      />,
    );
    fireEvent.click(screen.getByTestId('btn'));
    expect(setState).toHaveBeenCalledTimes(1);
  });
});
