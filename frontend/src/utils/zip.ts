import JSZip from 'jszip';
import { JobResultAsset } from '../types/api';

export interface ZipAsset {
  asset: JobResultAsset;
  rank: number;
}

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

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'from',
  'with', 'for', 'by', 'is', 'are', 'was', 'were', 'this', 'that',
  'these', 'those', 'into', 'over', 'under', 'near', 'their', 'his',
  'her', 'its', 'photo', 'image', 'picture'
]);

function extensionFromMimeType(contentType: string): string | null {
  const normalized = contentType.split(';', 1)[0].trim().toLowerCase();
  return MIME_TO_EXTENSION[normalized] ?? null;
}

function getUrlExtension(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() ?? '';
    const match = filename.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function getContentDispositionExtension(header: string | null): string | null {
  if (!header) return null;

  const filenameMatch = header.match(
    /filename\*?=(?:UTF-8''|")?([^";]+)"?/i
  );
  if (!filenameMatch) return null;

  const filename = decodeURIComponent(filenameMatch[1].trim());
  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
}

function getSafeExtension(
  url: string,
  response: Response,
  blob: Blob
): string {
  const contentType =
    blob.type ||
    response.headers.get('content-type') ||
    '';

  const mimeExtension = extensionFromMimeType(contentType);
  const dispositionExtension = getContentDispositionExtension(
    response.headers.get('content-disposition')
  );
  const urlExtension = getUrlExtension(url);

  // Prefer an original filename extension when the server exposes one.
  // Otherwise preserve the URL extension when it is consistent with the
  // actual MIME type. If the URL has no usable extension, use the MIME type.
  if (dispositionExtension && mimeExtension) {
    const dispositionMime =
      MIME_TO_EXTENSION[contentType.split(';', 1)[0].trim().toLowerCase()];
    if (!dispositionMime || dispositionExtension.toLowerCase() === dispositionMime) {
      return dispositionExtension;
    }
  }

  if (urlExtension && mimeExtension) {
    if (urlExtension.toLowerCase() === mimeExtension) {
      return urlExtension;
    }
    // Keep the downloaded file openable when the provider URL has a misleading
    // extension but the actual response has a different image MIME type.
    return mimeExtension;
  }

  return dispositionExtension ?? urlExtension ?? mimeExtension ?? 'jpg';
}

function getMetadataWords(asset: JobResultAsset): string[] {
  const metadata = asset.alt_text?.trim() || '';
  if (!metadata) return ['image'];

  const words = metadata
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map(word => word.trim().toLowerCase())
    .filter(Boolean)
    .filter(word => !STOP_WORDS.has(word));

  const selected = words.slice(0, 3);
  return selected.length > 0 ? selected : ['image'];
}

function buildBaseFilename(asset: JobResultAsset, rank: number): string {
  const provider = asset.provider
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'asset';

  const metadata = getMetadataWords(asset).join('-');
  const resultNumber = String(rank).padStart(3, '0');

  return `${resultNumber}_${provider}_${metadata}`;
}

function makeUniqueFilename(
  base: string,
  extension: string,
  seenNames: Set<string>
): string {
  let filename = `${base}.${extension}`;
  let counter = 1;

  while (seenNames.has(filename)) {
    filename = `${base}-${counter}.${extension}`;
    counter++;
  }

  seenNames.add(filename);
  return filename;
}

export async function downloadAssetsAsZip(
  assets: ZipAsset[]
): Promise<ZipResult> {
  const zip = new JSZip();
  const seenNames = new Set<string>();
  let successfulAssets = 0;

  const promises = assets.map(async ({ asset, rank }) => {
    try {
      const response = await fetch(asset.image_url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${asset.image_url}: ${response.status}`
        );
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

      const extension = getSafeExtension(asset.image_url, response, blob);
      const baseFilename = buildBaseFilename(asset, rank);
      const filename = makeUniqueFilename(
        baseFilename,
        extension,
        seenNames
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
      error:
        'Failed to download any assets. Check image CORS restrictions or image URLs.'
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
