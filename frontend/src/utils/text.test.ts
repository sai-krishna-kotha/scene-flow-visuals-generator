import { describe, it, expect } from 'vitest';
import { normalizeDisplayText } from './text';

describe('normalizeDisplayText', () => {
  it('returns empty string for null or undefined', () => {
    expect(normalizeDisplayText(null)).toBe('');
    expect(normalizeDisplayText(undefined)).toBe('');
  });

  it('removes leading and trailing whitespace', () => {
    expect(normalizeDisplayText('  hello world  ')).toBe('hello world');
  });

  it('collapses multiple empty lines into a single empty line', () => {
    const input = 'Paragraph one.\n\n\n\nParagraph two.';
    const expected = 'Paragraph one.\n\nParagraph two.';
    expect(normalizeDisplayText(input)).toBe(expected);
  });

  it('handles empty lines that only contain spaces', () => {
    const input = 'Paragraph one.\n \n  \nParagraph two.';
    const expected = 'Paragraph one.\n\nParagraph two.';
    expect(normalizeDisplayText(input)).toBe(expected);
  });

  it('preserves single newlines (meaningful line breaks)', () => {
    const input = 'Line one.\nLine two.';
    const expected = 'Line one.\nLine two.';
    expect(normalizeDisplayText(input)).toBe(expected);
  });
});
