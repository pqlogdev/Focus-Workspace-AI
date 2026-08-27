/**
 * Image optimization utility to prevent memory bloat and localStorage QuotaExceededError
 * Scales large clipboard screenshots/photos down to crisp, lightweight dimensions (~50-120KB)
 */

export async function optimizeImage(
  fileOrBlob: File | Blob,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawDataUrl = e.target?.result as string;
        if (!rawDataUrl) {
          resolve('');
          return;
        }

        // If file is small (< 80KB), we can use it directly
        if (fileOrBlob.size && fileOrBlob.size < 80 * 1024) {
          resolve(rawDataUrl);
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            let width = img.width || 800;
            let height = img.height || 600;

            // Compute scaled dimensions preserving aspect ratio
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawDataUrl);
              return;
            }

            // High-quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Export as efficient JPEG (or WebP if supported)
            const isTransparent = fileOrBlob.type === 'image/png' && hasAlphaChannel(ctx, width, height);
            const outputType = isTransparent ? 'image/png' : 'image/jpeg';
            const optimized = canvas.toDataURL(outputType, isTransparent ? undefined : quality);

            resolve(optimized);
          } catch (err) {
            console.warn('Image optimization canvas error, falling back to raw data:', err);
            resolve(rawDataUrl);
          }
        };

        img.onerror = () => {
          resolve(rawDataUrl);
        };

        img.src = rawDataUrl;
      };

      reader.onerror = () => {
        resolve('');
      };

      reader.readAsDataURL(fileOrBlob);
    } catch (err) {
      console.warn('Error reading image file:', err);
      resolve('');
    }
  });
}

function hasAlphaChannel(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    // Quick sample of corner / border pixels to check for transparency
    const sampleSize = Math.min(width, height, 10);
    const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    for (let i = 3; i < imgData.data.length; i += 4) {
      if (imgData.data[i] < 250) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
