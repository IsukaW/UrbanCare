/**
 * Resize and encode as JPEG data URL so decoded size stays under backend limits (~400KB).
 * @param {File} file
 * @param {{ maxDecodedBytes?: number, maxDimension?: number }} [opts]
 * @returns {Promise<string>}
 */
export function fileToProfilePhotoDataUrl(file, opts = {}) {
  const maxDecodedBytes = opts.maxDecodedBytes ?? 380 * 1024;
  const maxDimension = opts.maxDimension ?? 512;

  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Please choose an image file (JPEG, PNG, WebP, or GIF).'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          const scale = Math.min(1, maxDimension / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not process image'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.88;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          let decoded = dataUrlToDecodedBytes(dataUrl);

          while (decoded > maxDecodedBytes && quality > 0.45) {
            quality -= 0.06;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            decoded = dataUrlToDecodedBytes(dataUrl);
          }

          if (decoded > maxDecodedBytes) {
            reject(new Error('Image is still too large after compression. Try a smaller image.'));
            return;
          }

          resolve(dataUrl);
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Could not process image'));
        }
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function dataUrlToDecodedBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  if (!base64) return 0;
  return Math.floor((base64.length * 3) / 4);
}
