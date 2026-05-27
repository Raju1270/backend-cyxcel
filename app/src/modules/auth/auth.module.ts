import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ClerkStrategy } from './strategies/clerk.strategy';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Module({
  imports: [PassportModule],
  providers: [ClerkStrategy, ClerkAuthGuard],
  exports: [ClerkAuthGuard],
})
export class AuthModule {}
