import JSZip from 'jszip';
import { JobResultAsset } from '../types/api';

export interface ZipResult {
  success: boolean;
  successfulAssets: number;
  totalAssets: number;
  error?: string;
}

function getFilenameFromUrl(url: string, index: number, seenNames: Set<string>): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let filename = pathname.split('/').pop() || `image-${index}.jpg`;
    
    // Sanitize filename: keep alphanumeric, dots, hyphens, and underscores
    filename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    // Fallback if no extension or if it's just an extension
    if (!filename.includes('.') || filename.startsWith('.')) {
      filename += '.jpg';
    }

    // Handle duplicates
    let finalName = filename;
    let counter = 1;
    const nameParts = filename.split('.');
    const ext = nameParts.pop();
    const base = nameParts.join('.');
    
    while (seenNames.has(finalName)) {
      finalName = `${base}-${counter}.${ext}`;
      counter++;
    }
    
    seenNames.add(finalName);
    return finalName;
  } catch {
    const name = `asset-${index}.jpg`;
    seenNames.add(name);
    return name;
  }
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
      const filename = getFilenameFromUrl(asset.image_url, index, seenNames);
      zip.file(filename, blob);
      successfulAssets++;
    } catch (error) {
      console.error(`Error downloading ${asset.provider} asset ${asset.provider_asset_id}:`, error);
    }
  });

  await Promise.all(promises);

  if (successfulAssets === 0 && assets.length > 0) {
    return {
      success: false,
      successfulAssets: 0,
      totalAssets: assets.length,
      error: 'Failed to download any assets. This might be due to CORS restrictions.'
    };
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const objectUrl = URL.createObjectURL(zipBlob);
  
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = 'assets.zip';
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 100);

  return {
    success: true,
    successfulAssets,
    totalAssets: assets.length,
    error: successfulAssets < assets.length 
      ? `ZIP created with ${successfulAssets} of ${assets.length} assets. ${assets.length - successfulAssets} asset(s) could not be downloaded.` 
      : undefined
  };
}
