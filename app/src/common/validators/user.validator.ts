import type { Request } from 'express';
import { createClerkClient } from '@clerk/backend';
import type { ClerkClient } from '@clerk/backend';
import type { User, UserSettings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Creates a user in the database from Clerk user data
 * @param clerkId - Clerk user ID
 * @param prisma - Prisma service instance
 * @param clerkClient - Clerk client instance (optional, will be created if not provided)
 * @returns User ID if created successfully, undefined otherwise
 */
export async function createUserFromClerk(
  clerkId: string,
  prisma: PrismaService,
  clerkClient?: ClerkClient,
): Promise<string | undefined> {
  try {
    // Create clerkClient if not provided
    let client = clerkClient;
    if (!client) {
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!secretKey) {
        console.warn(
          `Cannot create user: CLERK_SECRET_KEY is not configured. clerkId: ${clerkId}`,
        );
        return undefined;
      }
      client = createClerkClient({ secretKey });
    }

    // Fetch user data from Clerk
    const clerkUser = await client.users.getUser(clerkId);

    // Extract email (use primary email address)
    const email =
      clerkUser.emailAddresses?.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;

    if (!email) {
      console.warn(
        `Cannot create user: email not found for clerkId: ${clerkId}`,
      );
      return undefined;
    }

    // Extract name (prefer full name, fallback to username or email prefix)
    let name = '';
    if (clerkUser.firstName || clerkUser.lastName) {
      name = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
    }
    if (!name && clerkUser.username) {
      name = clerkUser.username;
    }
    if (!name) {
      name = email.split('@')[0] || 'User';
    }

    // Create UserSettings first
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const settings: UserSettings = await prisma.userSettings.create({
      data: {},
    });

    // Create User
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user: Pick<User, 'id'> = await prisma.user.create({
      data: {
        clerkId,
        email,
        name,
        settingsId: settings.id,
      },
      select: { id: true },
    });

    console.log(`Created new user: ${email} (${user.id})`);
    return user.id;
  } catch (error) {
    console.warn(
      `Failed to create user from Clerk for clerkId: ${clerkId}`,
      error,
    );
    return undefined;
  }
}

/**
 * Extracts user ID from request (when auth is enabled)
 * Creates user in database if not found
 * Returns undefined if user creation fails or auth is not enabled
 */
export async function extractUserIdFromRequest(
  request: Request | undefined,
  prisma: PrismaService,
): Promise<string | undefined> {
  type RequestWithUser = Request & { user?: { id?: unknown } };

  const requestWithUser = request as RequestWithUser | undefined;

  if (!requestWithUser?.user) {
    return undefined;
  }

  const clerkId = requestWithUser.user.id;
  if (typeof clerkId !== 'string' || !clerkId) {
    return undefined;
  }

  try {
    // Try to find existing user
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    let user: Pick<User, 'id'> | null = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    // If user doesn't exist, create it
    if (!user) {
      const userId = await createUserFromClerk(clerkId, prisma);
      if (!userId) {
        return undefined;
      }
      user = { id: userId };
    }

    return user?.id;
  } catch (error) {
    console.warn(`Failed to find/create user by clerkId: ${clerkId}`, error);
    return undefined;
  }
}
