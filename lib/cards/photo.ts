import sharp from 'sharp'

export const MAX_PHOTO_UPLOAD_BYTES = 5 * 1024 * 1024
export const CARD_PHOTO_WIDTH = 600
export const CARD_PHOTO_HEIGHT = 720 // 5:6, the card's photo frame

export class PhotoError extends Error {}

// Accepts a phone/camera photo (JPEG, PNG or WebP), respects EXIF rotation,
// centre-crops to the card's 5:6 frame and re-encodes as a small JPEG. The
// re-encode also strips metadata (location etc.) and means only a real image
// can ever reach storage.
export async function processCardPhoto(input: Buffer): Promise<Buffer> {
  if (input.length === 0) throw new PhotoError('The file is empty.')
  if (input.length > MAX_PHOTO_UPLOAD_BYTES) throw new PhotoError('The picture is too large (maximum 5 MB).')
  try {
    const image = sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' })
    const meta = await image.metadata()
    if (!meta.format || !['jpeg', 'png', 'webp'].includes(meta.format)) {
      throw new PhotoError('Please upload a JPEG, PNG or WebP picture.')
    }
    return await image
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize(CARD_PHOTO_WIDTH, CARD_PHOTO_HEIGHT, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer()
  } catch (e) {
    if (e instanceof PhotoError) throw e
    throw new PhotoError('That file could not be read as a picture.')
  }
}
