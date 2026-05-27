import { BadRequestException } from '@nestjs/common';
import type { Express } from 'express';
import 'multer';

export interface FileValidationOptions {
  allowCsv?: boolean;
  allowedExtensions?: string[];
}

/**
 * Validates that a file exists and has a buffer
 */
export function validateFileExists(
  file: Express.Multer.File | undefined,
): void {
  if (!file || !file.buffer) {
    throw new BadRequestException('File is required');
  }
}

/**
 * Validates file type for Excel/CSV files
 */
export function validateFileType(
  file: Express.Multer.File,
  options: FileValidationOptions = {},
): void {
  const { allowCsv = true, allowedExtensions = ['xlsx', 'xls', 'csv'] } =
    options;

  const hasValidMimeType =
    file.mimetype.includes('spreadsheet') ||
    file.mimetype.includes('excel') ||
    (allowCsv &&
      (file.mimetype.includes('csv') || file.mimetype.includes('text/csv')));

  const extensionPattern = allowedExtensions
    .map((ext) => ext.toLowerCase())
    .join('|');
  const hasValidExtension = file.originalname.match(
    new RegExp(`\\.(${extensionPattern})$`, 'i'),
  );

  if (!hasValidMimeType && !hasValidExtension) {
    const allowedTypes = allowedExtensions.join(', ');
    const fileTypeDescription = allowCsv
      ? `Excel files (.xlsx, .xls) or CSV files (.csv)`
      : `Excel files (.xlsx, .xls)`;
    throw new BadRequestException(
      `Invalid file type. Only ${fileTypeDescription} are allowed`,
    );
  }
}

/**
 * Validates file exists and has correct type
 */
export function validateFile(
  file: Express.Multer.File | undefined,
  options: FileValidationOptions = {},
): void {
  validateFileExists(file);
  validateFileType(file, options);
}
