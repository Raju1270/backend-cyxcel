import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Normalize title for duplicate comparison:
 * - Trim whitespace
 * - Replace multiple spaces with single space
 * - Convert to lowercase for case-insensitive comparison
 */
function normalizeTitleForComparison(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple whitespace characters with single space
    .toLowerCase();
}

interface DuplicateGroup {
  normalizedTitle: string;
  riskCategoryId: string;
  riskCategoryName: string;
  articles: Array<{
    id: string;
    title: string;
    link: string;
    publishedDate: Date;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

/**
 * Find all duplicate articles grouped by normalized title and riskCategoryId
 */
async function findDuplicateArticles(
  outputJson: boolean = false,
): Promise<DuplicateGroup[]> {
  if (!outputJson) {
    console.log('🔍 Searching for duplicate articles...\n');
  }

  // Fetch all articles with their risk categories
  const allArticles = await prisma.thoughtLeadership.findMany({
    include: {
      riskCategory: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: [{ riskCategoryId: 'asc' }, { createdAt: 'asc' }],
  });

  if (!outputJson) {
    console.log(`📊 Total articles in database: ${allArticles.length}\n`);
  }

  // Group articles by normalized title and riskCategoryId
  const duplicateMap = new Map<string, DuplicateGroup>();

  for (const article of allArticles) {
    const normalizedTitle = normalizeTitleForComparison(article.title);
    const key = `${normalizedTitle}|||${article.riskCategoryId}`;

    if (!duplicateMap.has(key)) {
      duplicateMap.set(key, {
        normalizedTitle,
        riskCategoryId: article.riskCategoryId,
        riskCategoryName: article.riskCategory.name,
        articles: [],
      });
    }

    duplicateMap.get(key).articles.push({
      id: article.id,
      title: article.title,
      link: article.link,
      publishedDate: article.publishedDate,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    });
  }

  // Filter only groups with duplicates (more than 1 article)
  const duplicates = Array.from(duplicateMap.values()).filter(
    (group) => group.articles.length > 1,
  );

  if (outputJson) {
    // Output JSON format
    const jsonOutput = {
      totalArticles: allArticles.length,
      duplicateGroups: duplicates.length,
      totalDuplicateArticles: duplicates.reduce(
        (sum, group) => sum + group.articles.length,
        0,
      ),
      uniqueArticles:
        allArticles.length -
        duplicates.reduce((sum, group) => sum + group.articles.length - 1, 0),
      duplicates: duplicates.map((group) => ({
        ...group,
        articles: group.articles.map((article) => ({
          ...article,
          publishedDate: article.publishedDate.toISOString(),
          createdAt: article.createdAt.toISOString(),
          updatedAt: article.updatedAt.toISOString(),
        })),
      })),
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    return duplicates;
  }

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!\n');
    return duplicates;
  }

  console.log(`⚠️  Found ${duplicates.length} duplicate group(s):\n`);
  console.log('═'.repeat(100));

  // Display duplicates
  duplicates.forEach((group, index) => {
    console.log(`\n📌 Duplicate Group ${index + 1}:`);
    console.log(`   Normalized Title: "${group.normalizedTitle}"`);
    console.log(
      `   Risk Category: ${group.riskCategoryName} (${group.riskCategoryId})`,
    );
    console.log(`   Count: ${group.articles.length} duplicate(s)\n`);

    group.articles.forEach((article, articleIndex) => {
      console.log(`   ${articleIndex + 1}. Article ID: ${article.id}`);
      console.log(`      Original Title: "${article.title}"`);
      console.log(`      Link: ${article.link}`);
      console.log(
        `      Published Date: ${article.publishedDate.toISOString().split('T')[0]}`,
      );
      console.log(`      Created At: ${article.createdAt.toISOString()}`);
      console.log(`      Updated At: ${article.updatedAt.toISOString()}`);
      if (articleIndex < group.articles.length - 1) {
        console.log('');
      }
    });

    if (index < duplicates.length - 1) {
      console.log('\n' + '─'.repeat(100));
    }
  });

  console.log('\n' + '═'.repeat(100));
  console.log(`\n📈 Summary:`);
  console.log(`   Total duplicate groups: ${duplicates.length}`);
  console.log(
    `   Total duplicate articles: ${duplicates.reduce((sum, group) => sum + group.articles.length, 0)}`,
  );
  console.log(
    `   Unique articles (non-duplicates): ${allArticles.length - duplicates.reduce((sum, group) => sum + group.articles.length - 1, 0)}\n`,
  );

  return duplicates;
}

/**
 * Main function
 */
async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
Usage: ts-node -r tsconfig-paths/register src/scripts/find-duplicate-articles.ts [options]

Options:
  --help, -h    Show this help message
  --json, -j    Output results in JSON format (useful for piping or saving to file)

Description:
  Finds and displays all duplicate articles in the ThoughtLeadership table.
  Articles are considered duplicates if they have the same normalized title
  (case-insensitive, whitespace-normalized) and the same riskCategoryId.

Examples:
  # Find all duplicates (formatted output)
  ts-node -r tsconfig-paths/register src/scripts/find-duplicate-articles.ts

  # Output as JSON
  ts-node -r tsconfig-paths/register src/scripts/find-duplicate-articles.ts --json

  # Save JSON to file
  ts-node -r tsconfig-paths/register src/scripts/find-duplicate-articles.ts --json > duplicates.json
      `);
      process.exit(0);
    }

    const outputJson = args.includes('--json') || args.includes('-j');
    await findDuplicateArticles(outputJson);
  } catch (error) {
    console.error('❌ Error finding duplicate articles:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
