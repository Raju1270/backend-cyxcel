import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { RootModule } from './modules/root/root.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { PerilLikelihoodModule } from './modules/peril-likelihood/peril-likelihood.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { ServicesModule } from './modules/services/services.module';
import { RiskCategoriesModule } from './modules/risk-categories/risk-categories.module';
import { RiskOwnersModule } from './modules/risk-owners/risk-owners.module';
import { ImportLogModule } from './modules/import-log/import-log.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { ThoughtLeadershipModule } from './modules/thought-leadership/thought-leadership.module';
import { PostmanModule } from './modules/postman/postman.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { FaviconController } from './favicon.controller';
import * as path from 'path';

const nodeEnv = process.env.NODE_ENV ?? 'production';
const isProduction = nodeEnv === 'production';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', '..', 'public'),
      serveRoot: '/',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: [
        path.join(process.cwd(), '..', '.env.local'),
        path.join(process.cwd(), '..', '.env'),
      ],
      expandVariables: true,
    }),
    PrismaModule,
    AuthModule,
    RootModule,
    PerilLikelihoodModule,
    ArticlesModule,
    ServicesModule,
    RiskCategoriesModule,
    RiskOwnersModule,
    ImportLogModule,
    QuestionsModule,
    ThoughtLeadershipModule,
    // Postman module is only available in non-production environments
    ...(isProduction ? [] : [PostmanModule]),
  ],
  controllers: [FaviconController],
  providers: [],
})
export class AppModule {}
