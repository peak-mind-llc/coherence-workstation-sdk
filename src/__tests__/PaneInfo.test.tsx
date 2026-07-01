import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { PaneInfo } from '../PaneInfo';

// Helpers — the tooltip + popover are portaled to document.body, so we
// query the whole document rather than the render container.
const $ = (sel: string) => document.body.querySelector(sel);
const text = () => document.body.textContent ?? '';

afterEach(() => {
  cleanup();
});

describe('PaneInfo', () => {
  it('renders nothing when info is null', () => {
    const { container } = render(<PaneInfo info={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when info is undefined', () => {
    const { container } = render(<PaneInfo />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the icon when info has at least a headline', () => {
    render(<PaneInfo info={{ headline: 'Test' }} />);
    expect($('[data-test="pane-info-trigger"]')).toBeTruthy();
    expect($('[data-test="pane-info-trigger"] svg')).toBeTruthy();
  });

  it('shows headline on hover (portaled to body)', () => {
    const { getByRole } = render(
      <PaneInfo info={{ headline: 'What does this answer?' }} />,
    );
    fireEvent.mouseEnter(getByRole('button'));
    expect($('[data-test="pane-info-tooltip"]')).toBeTruthy();
    expect(text()).toContain('What does this answer?');
  });

  it('opens popover on click with full content', () => {
    const { getByRole } = render(
      <PaneInfo info={{
        headline: 'Headline text',
        methodology: 'Method paragraph here',
        docHref: '/docs/example',
      }} />,
    );
    fireEvent.click(getByRole('button'));
    expect($('[data-test="pane-info-popover"]')).toBeTruthy();
    expect(text()).toContain('Headline text');
    expect(text()).toContain('Method paragraph here');
    expect($('a[href="/docs/example"]')).toBeTruthy();
  });

  it('uses custom doc label when provided', () => {
    const { getByRole } = render(
      <PaneInfo info={{
        headline: 'Headline',
        docHref: '/docs/example',
        docLabel: 'Read the spec',
      }} />,
    );
    fireEvent.click(getByRole('button'));
    expect(text()).toContain('Read the spec');
  });

  it('omits methodology and doc link when not supplied', () => {
    const { getByRole } = render(
      <PaneInfo info={{ headline: 'Just a headline' }} />,
    );
    fireEvent.click(getByRole('button'));
    expect(text()).toContain('Just a headline');
    expect($('[data-test="pane-info-popover"] a')).toBeNull();
  });

  it('dismisses popover on Escape', () => {
    const { getByRole } = render(
      <PaneInfo info={{ headline: 'H', methodology: 'M' }} />,
    );
    fireEvent.click(getByRole('button'));
    expect($('[data-test="pane-info-popover"]')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect($('[data-test="pane-info-popover"]')).toBeNull();
  });

  it('toggles popover closed on second click', () => {
    const { getByRole } = render(<PaneInfo info={{ headline: 'H' }} />);
    const btn = getByRole('button');
    fireEvent.click(btn);
    expect($('[data-test="pane-info-popover"]')).toBeTruthy();
    fireEvent.click(btn);
    expect($('[data-test="pane-info-popover"]')).toBeNull();
  });
});
