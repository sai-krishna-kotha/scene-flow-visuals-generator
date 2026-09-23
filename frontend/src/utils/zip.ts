import JSZip from 'jszip';
import { JobResultAsset } from '../types/api';

export interface ZipResult {
  success: boolean;
  successfulAssets: number;
  totalAssets: number;
  error?: string;
}

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/svg+xml': 'svg',
};

function extensionFromMimeType(contentType: string): string | null {
  const normalized = contentType.split(';', 1)[0].trim().toLowerCase();
  return MIME_TO_EXTENSION[normalized] ?? null;
}

function getUrlExtension(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() ?? '';
    const match = filename.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

function getFilenameFromUrl(
  url: string,
  index: number,
  seenNames: Set<string>,
  fallbackExtension: string
): string {
  let filename: string;

  try {
    const pathname = new URL(url).pathname;
    const rawFilename = pathname.split('/').pop() ?? '';
    filename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Many provider/CDN URLs are extensionless. In that case, derive the
    // extension from the downloaded blob's MIME type instead of assuming JPEG.
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(filename);
    if (!filename || !hasExtension || filename.startsWith('.')) {
      filename = `asset-${index}.${fallbackExtension}`;
    } else {
      // Prefer the actual MIME type when known because provider URLs can
      // carry misleading or generic extensions (for example, a WebP payload
      // served from a URL ending in ".jpg").
      const dotIndex = filename.lastIndexOf('.');
      const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
      filename = `${base}.${fallbackExtension}`;
    }
  } catch {
    filename = `asset-${index}.${fallbackExtension}`;
  }

  const dotIndex = filename.lastIndexOf('.');
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  const extension = dotIndex > 0 ? filename.slice(dotIndex + 1) : fallbackExtension;

  let finalName = filename;
  let counter = 1;
  while (seenNames.has(finalName)) {
    finalName = `${base}-${counter}.${extension}`;
    counter++;
  }

  seenNames.add(finalName);
  return finalName;
}

export async function downloadAssetsAsZip(assets: JobResultAsset[]): Promise<ZipResult> {
  const zip = new JSZip();
  const seenNames = new Set<string>();
  let successfulAssets = 0;

  const promises = assets.map(async (asset, index) => {
    try {
      const response = await fetch(asset.image_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${asset.image_url}: ${response.status}`);
      }

      const blob = await response.blob();
      const contentType =
        blob.type ||
        response.headers.get('content-type') ||
        '';

      if (!contentType.toLowerCase().startsWith('image/')) {
        throw new Error(
          `Downloaded content is not an image (content-type: ${contentType || 'unknown'})`
        );
      }

      const mimeExtension = extensionFromMimeType(contentType);
      const fallbackExtension =
        mimeExtension ??
        getUrlExtension(asset.image_url) ??
        'jpg';

      const filename = getFilenameFromUrl(
        asset.image_url,
        index,
        seenNames,
        fallbackExtension
      );

      zip.file(filename, blob);
      successfulAssets++;
    } catch (error) {
      console.error(
        `Error downloading ${asset.provider} asset ${asset.provider_asset_id}:`,
        error
      );
    }
  });

  await Promise.all(promises);

  if (successfulAssets === 0 && assets.length > 0) {
    return {
      success: false,
      successfulAssets: 0,
      totalAssets: assets.length,
      error: 'Failed to download any assets. Check image CORS restrictions or image URLs.'
    };
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const objectUrl = URL.createObjectURL(zipBlob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = 'assets.zip';
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 100);

  return {
    success: true,
    successfulAssets,
    totalAssets: assets.length,
    error:
      successfulAssets < assets.length
        ? `ZIP created with ${successfulAssets} of ${assets.length} assets. ${assets.length - successfulAssets} asset(s) could not be downloaded.`
        : undefined,
  };
}
