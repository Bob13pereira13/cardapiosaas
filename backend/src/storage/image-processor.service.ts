import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 85;

export interface ProcessedImage {
  buffer: Buffer;
  contentType: 'image/webp';
  width: number;
  height: number;
  byteSize: number;
}

@Injectable()
export class ImageProcessorService {
  async process(file: Express.Multer.File): Promise<ProcessedImage> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        'Imagem maior que 5 MB. Reduza o tamanho antes de enviar.',
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      throw new UnsupportedMediaTypeException(
        'Formato não suportado. Use JPG, PNG, WEBP ou HEIC.',
      );
    }

    try {
      const buffer = await sharp(file.buffer, { failOn: 'none' })
        .rotate()
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY, effort: 4 })
        .toBuffer();

      const meta = await sharp(buffer).metadata();

      return {
        buffer,
        contentType: 'image/webp',
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        byteSize: buffer.length,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'erro desconhecido';
      throw new BadRequestException(`Falha ao processar imagem: ${msg}`);
    }
  }
}
