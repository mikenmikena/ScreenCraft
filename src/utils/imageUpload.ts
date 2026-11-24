/**
 * Client-side image upload helper that reads a selected image file,
 * scales oversized photos down cleanly to fit within localStorage/.sccrft budgets,
 * and returns a compact base64 Data URL.
 */
export async function processUploadedImageFile(
  file: File,
  maxDimension = 720
): Promise<string> {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (PNG, JPG, WebP, GIF).');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  // For SVGs or small files under 180 KB, keep directly without re-encoding
  if (file.type === 'image/svg+xml' || file.size <= 180 * 1024) {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) {
        resolve(rawDataUrl);
        return;
      }

      const scale = Math.min(1, maxDimension / Math.max(w, h));
      const targetW = Math.max(1, Math.round(w * scale));
      const targetH = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Preserve PNG alpha if original was PNG and reasonably sized; otherwise JPEG 0.85
      if (file.type === 'image/png' && targetW <= 560 && targetH <= 560) {
        const pngUrl = canvas.toDataURL('image/png');
        resolve(pngUrl.length < 450_000 ? pngUrl : canvas.toDataURL('image/jpeg', 0.86));
      } else {
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}
