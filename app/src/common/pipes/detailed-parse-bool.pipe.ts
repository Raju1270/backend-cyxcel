import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';

@Injectable()
export class DetailedParseBoolPipe
  implements PipeTransform<string | boolean, boolean>
{
  transform(value: string | boolean, metadata: ArgumentMetadata): boolean {
    if (value === undefined || value === null) {
      throw new BadRequestException(
        `Validation failed: Field '${metadata.data}' is required. Expected a boolean value ('true' or 'false'), but received: ${value === undefined ? 'undefined' : 'null'}`,
      );
    }

    // Handle boolean values directly
    if (typeof value === 'boolean') {
      return value;
    }

    // Handle string values
    if (typeof value === 'string') {
      const normalizedValue = value.toLowerCase().trim();

      if (normalizedValue === 'true' || normalizedValue === '1') {
        return true;
      }
      if (normalizedValue === 'false' || normalizedValue === '0') {
        return false;
      }
    }

    throw new BadRequestException(
      `Validation failed: Field '${metadata.data}' must be a boolean. Expected 'true' or 'false' (as string), but received: '${value}' (type: ${typeof value})`,
    );
  }
}
