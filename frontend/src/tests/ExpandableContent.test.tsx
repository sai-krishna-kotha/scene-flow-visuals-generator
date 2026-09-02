import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExpandableContent } from '../components/ui/ExpandableContent';

describe('ExpandableContent', () => {
  it('renders nothing when content is empty', () => {
    const { container } = render(<ExpandableContent content="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders short content without View more button', () => {
    // Mock scrollHeight <= clientHeight
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 50 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 50 });

    render(<ExpandableContent content="Short text" />);
    
    expect(screen.getByText('Short text')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view more/i })).not.toBeInTheDocument();
  });

  it('renders View more button when content is long (overflows)', () => {
    // Mock scrollHeight > clientHeight
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 100 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 50 });

    render(<ExpandableContent content="Very long text" />);
    
    expect(screen.getByText('Very long text')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view more/i })).toBeInTheDocument();
  });

  it('toggles content expansion and button text on click', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 100 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 50 });

    render(<ExpandableContent content="Very long text" />);
    
    const button = screen.getByRole('link', { name: /view more/i });
    expect(button).toBeInTheDocument();

    // Click to expand
    fireEvent.click(button);
    expect(screen.getByRole('link', { name: /view less/i })).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByRole('link', { name: /view less/i }));
    expect(screen.getByRole('link', { name: /view more/i })).toBeInTheDocument();
  });

  it('passes responsive css variables correctly', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 50 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 50 });

    const { container } = render(
      <ExpandableContent 
        content="Test" 
        collapsedLinesDesktop={10} 
        collapsedLinesMobile={4} 
      />
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({
      '--mobile-lines': '4',
      '--desktop-lines': '10'
    });
  });

  it('independent instances do not affect each other', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 100 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 50 });

    render(
      <>
        <ExpandableContent content="Instance 1" />
        <ExpandableContent content="Instance 2" />
      </>
    );

    const buttons = screen.getAllByRole('link', { name: /view more/i });
    expect(buttons).toHaveLength(2);

    // Expand the first one
    fireEvent.click(buttons[0]);

    // First one should say View less, second one should still say View more
    expect(screen.getByRole('link', { name: /view less/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /view more/i })).toHaveLength(1);
  });
});
