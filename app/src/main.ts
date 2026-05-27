import { ConfigService } from '@nestjs/config';
import { createNestApp } from './bootstrap/create-nest-app';

async function bootstrap() {
  const app = await createNestApp();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3010);
  await app.listen(port, '0.0.0.0');

  console.log(`HTTP server listening on 0.0.0.0:${port}`);
}
void bootstrap();
