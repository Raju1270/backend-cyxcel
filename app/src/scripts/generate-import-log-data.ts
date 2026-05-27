import { PrismaClient, ImportStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface GenerateOptions {
  count: number;
  userId?: string;
  successRatio?: number; // 0-1, default 0.7 (70% success)
}

const sampleFilenames = [
  'peril_data_2024.xlsx',
  'risk_categories_import.xlsx',
  'likelihood_data.xlsx',
  'articles_import.xlsx',
  'sectors_data.xlsx',
  'nature_of_losses.xlsx',
  'custom_risk_categories.xlsx',
  'exposure_data.xlsx',
  'user_settings_import.xlsx',
  'reports_data.xlsx',
];

/**
 * Generates test data for ImportLog
 */
async function generateImportLogData(options: GenerateOptions): Promise<void> {
  const { count, userId, successRatio = 0.7 } = options;

  console.log(`Generating ${count} ImportLog records...`);

  // Get or create test user
  let targetUserId = userId;
  if (!targetUserId) {
    const existingUser = await prisma.user.findFirst();
    if (existingUser) {
      targetUserId = existingUser.id;
      console.log(
        `Using existing user: ${existingUser.email} (${existingUser.id})`,
      );
    } else {
      // Create a test user if none exists
      const testUser = await prisma.user.create({
        data: {
          clerkId: `test-clerk-${Date.now()}`,
          email: `test-user-${Date.now()}@example.com`,
          name: 'Test User',
          settings: {
            create: {},
          },
        },
      });
      targetUserId = testUser.id;
      console.log(`Created test user: ${testUser.email} (${testUser.id})`);
    }
  } else {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new Error(`User with id ${targetUserId} not found`);
    }
    console.log(`Using specified user: ${user.email} (${user.id})`);
  }

  // Generate import logs
  const importLogs = [];
  const successCount = Math.floor(count * successRatio);
  const failedCount = count - successCount;

  // Generate success logs
  for (let i = 0; i < successCount; i++) {
    const filename =
      sampleFilenames[Math.floor(Math.random() * sampleFilenames.length)];
    const rowCount = Math.floor(Math.random() * 1000) + 10; // 10-1009 rows
    const daysAgo = Math.floor(Math.random() * 90); // Random date within last 90 days
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    importLogs.push({
      userId: targetUserId,
      filename,
      rowCount,
      status: ImportStatus.SUCCESS,
      createdAt,
      updatedAt: createdAt,
    });
  }

  // Generate failed logs
  for (let i = 0; i < failedCount; i++) {
    const filename =
      sampleFilenames[Math.floor(Math.random() * sampleFilenames.length)];
    const rowCount = Math.floor(Math.random() * 100); // 0-99 rows (failed imports usually have fewer rows)
    const daysAgo = Math.floor(Math.random() * 90);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    importLogs.push({
      userId: targetUserId,
      filename,
      rowCount,
      status: ImportStatus.FAILED,
      createdAt,
      updatedAt: createdAt,
    });
  }

  // Insert in batches
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < importLogs.length; i += batchSize) {
    const batch = importLogs.slice(i, i + batchSize);
    await prisma.importLog.createMany({
      data: batch,
    });
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${importLogs.length} records...`);
  }

  console.log(`\n✅ Successfully generated ${inserted} ImportLog records!`);
  console.log(`   - Success: ${successCount}`);
  console.log(`   - Failed: ${failedCount}`);
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options: GenerateOptions = {
      count: 50, // default
      successRatio: 0.7,
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--count' || arg === '-c') {
        options.count = parseInt(args[++i], 10);
        if (isNaN(options.count) || options.count < 1) {
          throw new Error('Count must be a positive number');
        }
      } else if (arg === '--user-id' || arg === '-u') {
        options.userId = args[++i];
      } else if (arg === '--success-ratio' || arg === '-s') {
        options.successRatio = parseFloat(args[++i]);
        if (
          isNaN(options.successRatio) ||
          options.successRatio < 0 ||
          options.successRatio > 1
        ) {
          throw new Error('Success ratio must be between 0 and 1');
        }
      } else if (arg === '--help' || arg === '-h') {
        console.log(`
Usage: ts-node -r tsconfig-paths/register src/scripts/generate-import-log-data.ts [options]

Options:
  --count, -c <number>        Number of ImportLog records to generate (default: 50)
  --user-id, -u <string>      User ID to use for imports (default: uses first existing user or creates one)
  --success-ratio, -s <0-1>   Ratio of successful imports (default: 0.7)
  --help, -h                   Show this help message

Examples:
  # Generate 100 records with default settings
  ts-node -r tsconfig-paths/register src/scripts/generate-import-log-data.ts --count 100

  # Generate 50 records for a specific user
  ts-node -r tsconfig-paths/register src/scripts/generate-import-log-data.ts --user-id "user-123"

  # Generate 200 records with 50% success rate
  ts-node -r tsconfig-paths/register src/scripts/generate-import-log-data.ts --count 200 --success-ratio 0.5
        `);
        process.exit(0);
      }
    }

    await generateImportLogData(options);
  } catch (error) {
    console.error('❌ Error generating ImportLog data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
