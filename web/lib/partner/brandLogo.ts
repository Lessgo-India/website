export const BRAND_LOGO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const BRAND_LOGO_MAX_BYTES = 10 * 1024 * 1024;

const BRAND_LOGO_TYPES = new Set(BRAND_LOGO_ACCEPT.split(','));

export function brandLogoError(file: File): string | null {
  if (!BRAND_LOGO_TYPES.has(file.type.toLowerCase())) {
    return 'Choose a JPG, PNG or WebP image.';
  }
  if (file.size <= 0 || file.size > BRAND_LOGO_MAX_BYTES) {
    return 'Brand logo must be 10 MB or smaller.';
  }
  return null;
}
