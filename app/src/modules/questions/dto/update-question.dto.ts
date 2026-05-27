import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateQuestionDto {
  @ApiProperty({
    description: 'Updated question text',
    example: "What is your organization's approach to risk management?",
  })
  @IsString()
  @IsNotEmpty()
  question: string;
}
