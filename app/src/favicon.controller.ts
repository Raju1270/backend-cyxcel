import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

@Controller()
export class FaviconController {
  @Get('favicon.ico')
  getFavicon(@Res() res: Response) {
    const faviconPath = join(__dirname, '..', '..', 'public', 'favicon.ico');

    if (existsSync(faviconPath)) {
      res.sendFile(faviconPath);
    } else {
      res.status(404).send('Favicon not found');
    }
  }
}
