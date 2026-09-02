export const normalizeDisplayText = (text?: string | null): string => {
  if (!text) return '';
  return text
    .trim()
    .replace(/\r\n/g, '\n')
    // Remove spaces/tabs from otherwise empty lines to make them truly empty
    .replace(/^[ \t]+$/gm, '')
    // Collapse 3 or more newlines into exactly 2 newlines (one blank line)
    .replace(/\n{3,}/g, '\n\n');
};
