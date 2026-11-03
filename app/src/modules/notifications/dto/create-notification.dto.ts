import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { NOTIFICATION_FILE_PATH_PATTERN } from '../notifications.constants';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Title shown to every user',
    example: 'Q4 cyber risk briefing',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    description: 'Short description shown under the title',
    example: 'Key threats and recommended actions for the quarter.',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @ApiProperty({
    description: 'Original name of the uploaded PDF',
    example: 'Q4 briefing.pdf',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({
    description:
      'Vercel Blob pathname returned by the direct upload (private blob)',
    example: 'notifications/q4-briefing-AbC123.pdf',
  })
  @IsString()
  @Matches(NOTIFICATION_FILE_PATH_PATTERN, {
    message: 'filePath must be a PDF under notifications/',
  })
  filePath: string;
}
