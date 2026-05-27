import { BadRequestException } from '@nestjs/common';
import { PreviewStatus } from '../utils/preview-status.enum';

/**
 * Parses and validates status array from request
 * Handles both string (comma-separated) and array formats
 */
export function parseAndValidateStatuses(
  status: string | string[] | undefined,
): PreviewStatus[] {
  let allowedStatuses: PreviewStatus[] = [PreviewStatus.READY];

  if (!status) {
    return allowedStatuses;
  }

  const validStatuses = Object.values(PreviewStatus);
  const statusArray = Array.isArray(status)
    ? status
    : typeof status === 'string'
      ? status.split(',').map((s) => s.trim())
      : [];

  const parsedStatuses = statusArray.filter(
    (s) => s && validStatuses.includes(s as PreviewStatus),
  ) as PreviewStatus[];

  if (statusArray.length > 0 && parsedStatuses.length === 0) {
    throw new BadRequestException(
      `Invalid status values. Allowed values: ${validStatuses.join(', ')}`,
    );
  }

  if (parsedStatuses.length > 0) {
    if (parsedStatuses.includes(PreviewStatus.DUPLICATE)) {
      throw new BadRequestException(
        'DUPLICATE status is not allowed for import. Items with DUPLICATE status will never be imported.',
      );
    }
    allowedStatuses = parsedStatuses;
  }

  return allowedStatuses;
}
