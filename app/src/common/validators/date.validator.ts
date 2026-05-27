import { BadRequestException } from '@nestjs/common';

/**
 * Validates month string format (01-12)
 */
export function validateMonth(month: string | undefined): void {
  if (!month || !month.match(/^(0[1-9]|1[0-2])$/)) {
    throw new BadRequestException('Month must be a string between 01 and 12');
  }
}

/**
 * Validates year string format (4 digits)
 */
export function validateYear(year: string | undefined): void {
  if (!year || !year.match(/^\d{4}$/)) {
    throw new BadRequestException('Year must be a 4-digit string (e.g., 2025)');
  }
}

/**
 * Validates both month and year
 */
export function validateMonthAndYear(
  month: string | undefined,
  year: string | undefined,
): void {
  validateMonth(month);
  validateYear(year);
}
