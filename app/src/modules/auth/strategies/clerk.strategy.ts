import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { createClerkClient, verifyToken } from '@clerk/backend';
import type { Request } from 'express';
import * as passport from 'passport';

// Custom strategy name
const STRATEGY_NAME = 'clerk';

// Create a custom strategy class
const ClerkPassportStrategy = class extends passport.Strategy {
  name = STRATEGY_NAME;
  private validateFn: (req: Request) => Promise<any>;

  constructor(validateFn: (req: Request) => Promise<any>) {
    super();
    this.validateFn = validateFn;
  }

  authenticate(req: Request): void {
    this.validateFn(req)
      .then((user) => {
        if (!user) {
          return this.fail(new UnauthorizedException('Unauthorized'), 401);
        }
        this.success(user);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedException) {
          return this.fail(err, 401);
        }
        this.error(err);
      });
  }
};

@Injectable()
export class ClerkStrategy extends PassportStrategy(
  ClerkPassportStrategy as any,
  STRATEGY_NAME,
) {
  private clerkClient: ReturnType<typeof createClerkClient>;
  private secretKey: string;
  private enabled = true;

  constructor(private configService: ConfigService) {
    super(async (req: Request) => {
      return this.validate(req);
    });

    const secretKey = this.configService.get<string>('clerk.secretKey');
    if (!secretKey) {
      const nodeEnv =
        this.configService.get<string>('app.env') ??
        process.env.NODE_ENV ??
        'production';

      if (nodeEnv === 'production') {
        throw new Error('CLERK_SECRET_KEY is not configured');
      }

      this.enabled = false;
      this.secretKey = '';
      console.warn(
        'CLERK_SECRET_KEY is not configured; Clerk auth disabled for this environment.',
      );
      // Intentionally skip Clerk client initialization in non-production.
      return;
    }
    this.secretKey = secretKey;
    this.clerkClient = createClerkClient({ secretKey: this.secretKey });
  }

  async validate(req: Request): Promise<any> {
    if (!this.enabled) {
      throw new UnauthorizedException('Authentication is not configured');
    }

    let token: string | undefined;

    // First, try to get token from Authorization header (Bearer token)
    // This is for API clients that send tokens in headers
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // If no token in header, try to get from cookie (for browser-based requests)
    // Clerk uses '__session' cookie name for session tokens
    if (!token && req.cookies && req.cookies.__session) {
      token = req.cookies.__session;
    }

    if (!token) {
      throw new UnauthorizedException('Authorization token is required');
    }

    try {
      let userId: string;
      let sessionClaims: any;

      // Support both session tokens (sess_*) and JWT tokens
      if (token.startsWith('sess_')) {
        const session = await this.clerkClient.sessions.getSession(token);
        if (!session || !session.userId) {
          throw new UnauthorizedException('Invalid or expired session');
        }
        userId = session.userId;

        // For session tokens, try to verify token to get claims
        // If that fails, get user metadata from Clerk API
        try {
          const payload = await verifyToken(token, {
            secretKey: this.secretKey,
          });
          sessionClaims = payload;
        } catch {
          // If verification fails, get user metadata from Clerk API
          const user = await this.clerkClient.users.getUser(userId);
          // Map user publicMetadata to sessionClaims format
          sessionClaims = {
            metadata: user.publicMetadata || {},
          };
        }
      } else {
        // Handle JWT tokens
        const payload = await verifyToken(token, {
          secretKey: this.secretKey,
        });

        if (!payload || !payload.sub) {
          throw new UnauthorizedException('Invalid or expired token');
        }

        userId = payload.sub;
        sessionClaims = payload;

        // For JWT tokens, if metadata is not in the token, fetch from Clerk API
        if (!sessionClaims?.metadata) {
          try {
            const user = await this.clerkClient.users.getUser(userId);
            sessionClaims = {
              ...sessionClaims,
              metadata: user.publicMetadata || {},
            };
          } catch (error) {
            console.error('Failed to fetch user metadata from Clerk API:', error);
          }
        }
      }

      // Check if user is admin
      // Only allow access if admin is explicitly set to true in metadata
      const isAdminUser = sessionClaims?.metadata?.admin === true;

      if (!isAdminUser) {
        console.warn('Admin check failed for user:', {
          userId,
          metadata: sessionClaims?.metadata,
          isAdminUser,
        });
        throw new UnauthorizedException(
          'Access denied. Admin privileges required.',
        );
      }

      return { id: userId };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
