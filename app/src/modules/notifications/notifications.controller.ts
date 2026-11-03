import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import type { HandleUploadBody } from '@vercel/blob/client';
import type { Request } from 'express';
import { ApiTag } from '../../common/decorators/swagger.decorators';
import { ClerkAuthGuard } from '../auth';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';

@ApiTag('notifications')
@Controller('notifications')
@UseGuards(ClerkAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('upload-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a client token for a direct PDF upload',
    description:
      'Called by the Vercel Blob client SDK from the admin panel. Returns a short-lived token limited to PDF files under notifications/, so the file goes straight from the browser to the private blob store.',
  })
  @ApiOkResponse({ description: 'Returns the client token payload' })
  @ApiResponse({ status: 400, description: 'Pathname is not an allowed PDF' })
  @ApiResponse({ status: 503, description: 'File storage is not configured' })
  createUploadToken(@Body() body: HandleUploadBody, @Req() request: Request) {
    return this.notificationsService.createUploadToken(body, request);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Publish a notification',
    description:
      'Creates a notification for every user. The PDF must already be uploaded using the token from upload-token.',
  })
  @ApiCreatedResponse({ description: 'Notification created' })
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get published notifications',
    description:
      'Retrieves a paginated list of notifications, newest first. Soft-deleted records are excluded.',
  })
  @ApiOkResponse({ description: 'Returns paginated notifications' })
  async findAll(@Query() query: NotificationQueryDto) {
    return this.notificationsService.findAll(query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Withdraw a notification',
    description:
      'Soft deletes the notification (users stop seeing it) and removes its PDF from storage. If the record is already deleted, the operation is a no-op.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 204, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.notificationsService.softDelete(id);
  }
}
