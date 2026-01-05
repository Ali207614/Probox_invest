import { ImageUrls } from 'src/upload/upload.service';

export function parseProfilePicture(pictureField: string | null): ImageUrls | null {
  if (!pictureField) return null;
  try {
    const parsed = JSON.parse(pictureField);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'small' in parsed &&
      'medium' in parsed &&
      'large' in parsed &&
      typeof parsed.small === 'string' &&
      typeof parsed.medium === 'string' &&
      typeof parsed.large === 'string'
    ) {
      return parsed as ImageUrls;
    }
    return null;
  } catch {
    return null;
  }
}
