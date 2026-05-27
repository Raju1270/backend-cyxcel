import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsQueryDto } from './dto/questions-query.dto';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Updates a question by marking the old question as inactive and creating a new one
   * @param id - Question ID to update
   * @param updateQuestionDto - DTO containing the updated question text
   * @returns The newly created question record
   */
  async updateQuestion(
    id: string,
    updateQuestionDto: UpdateQuestionDto,
  ): Promise<any> {
    // Find the existing question
    const existingQuestion = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!existingQuestion) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    // Use a transaction to ensure both operations succeed or fail together
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the new active question first
      const newQuestion = await tx.question.create({
        data: {
          question: updateQuestionDto.question,
          riskCategoryId: existingQuestion.riskCategoryId,
          number: existingQuestion.number,
          inactive: false,
        },
        include: {
          riskCategory: true,
        },
      });

      // Find the current active question in the chain
      // If the question being updated is inactive, traverse to find the active one
      let currentActiveId: string = id;
      if (existingQuestion.inactive && existingQuestion.replacedById) {
        // Traverse the chain to find the active question
        let nextId: string | null = existingQuestion.replacedById;
        while (nextId) {
          const nextQuestion = await tx.question.findUnique({
            where: { id: nextId },
            select: { id: true, inactive: true, replacedById: true },
          });

          if (!nextQuestion) break;

          // If we found an active question, that's our target
          if (!nextQuestion.inactive) {
            currentActiveId = nextQuestion.id;
            break;
          }

          // Continue traversing
          nextId = nextQuestion.replacedById;
        }
      }

      // Find ALL inactive questions that reference the current active question
      // This includes direct references and indirect references through the chain
      const findAllInactiveQuestions = async (
        activeQuestionId: string,
      ): Promise<string[]> => {
        const allInactiveIds: string[] = [];
        const visited = new Set<string>();

        // Recursively find all inactive questions that reference this active question
        const findRecursive = async (questionId: string) => {
          if (visited.has(questionId)) return;
          visited.add(questionId);

          // Find all inactive questions that reference this question
          const inactiveQuestions = await tx.question.findMany({
            where: {
              replacedById: questionId,
              inactive: true,
            },
            select: { id: true },
          });

          for (const inactive of inactiveQuestions) {
            allInactiveIds.push(inactive.id);
            // Recursively find inactive questions that reference this inactive one
            await findRecursive(inactive.id);
          }
        };

        await findRecursive(activeQuestionId);
        return allInactiveIds;
      };

      // Get all inactive questions in the chain
      const allInactiveIds = await findAllInactiveQuestions(currentActiveId);

      // Add the current question being updated to the list if it's not already there
      const inactiveQuestionsToUpdate = Array.from(
        new Set([id, ...allInactiveIds]),
      );

      // Update all inactive questions in the chain to reference the new active question
      await tx.question.updateMany({
        where: {
          id: { in: inactiveQuestionsToUpdate },
        },
        data: {
          inactive: true,
          replacedById: newQuestion.id, // All inactive questions reference the current active one
        },
      });

      this.logger.log(
        `Updated question: oldId=${id}, newId=${newQuestion.id}, riskCategoryId=${existingQuestion.riskCategoryId}, number=${existingQuestion.number}. Updated ${inactiveQuestionsToUpdate.length} inactive question(s) to reference new active question.`,
      );

      return newQuestion;
    });

    return result;
  }

  /**
   * Finds all questions (both active and inactive) with pagination, filtering, and ordering
   * @param query - Query parameters for pagination, filtering, and ordering
   * @returns Paginated questions with metadata
   */
  async findAll(
    query: QuestionsQueryDto,
  ): Promise<{ data: any[]; meta: PaginationMeta }> {
    try {
      // Ensure defaults are applied
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const riskCategoryId = query.riskCategoryId;
      const orderBy = query.orderBy ?? 'number';
      const orderDirection = query.orderDirection ?? 'ASC';
      const skip = (page - 1) * limit;

      this.logger.debug(
        `Finding questions with params: page=${page}, limit=${limit}, riskCategoryId=${riskCategoryId}, orderBy=${orderBy}, orderDirection=${orderDirection}`,
      );

      // Build where clause for filtering
      const where: any = {};
      if (riskCategoryId) {
        where.riskCategoryId = riskCategoryId;
      }
      // Note: We don't filter by inactive status - we return all questions (active and inactive)

      // Build orderBy clause
      const orderByClause: any = {};
      orderByClause[orderBy] = orderDirection.toLowerCase();

      this.logger.debug(`OrderBy clause: ${JSON.stringify(orderByClause)}`);

      // Execute queries in parallel
      const [data, total] = await Promise.all([
        this.prisma.question.findMany({
          where,
          skip,
          take: limit,
          orderBy: orderByClause,
          include: {
            riskCategory: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.question.count({ where }),
      ]);

      this.logger.log(`Found ${data.length} questions out of ${total} total`);

      const pageCount = Math.ceil(total / limit);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          pageCount,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error finding questions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Gets the version history of a question by finding all inactive versions that were replaced
   * and the current active version
   * @param id - Question ID to get version history for (can be active or inactive)
   * @returns Array of questions in version order (oldest to newest)
   */
  async getVersionHistory(id: string): Promise<any[]> {
    try {
      // Find the starting question
      let currentQuestion = await this.prisma.question.findUnique({
        where: { id },
        include: {
          riskCategory: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      });

      if (!currentQuestion) {
        throw new NotFoundException(`Question with ID ${id} not found`);
      }

      // If the question is inactive, find the active version it was replaced by
      if (currentQuestion.inactive && currentQuestion.replacedById) {
        const activeQuestion = await this.prisma.question.findUnique({
          where: { id: currentQuestion.replacedById },
          include: {
            riskCategory: {
              select: {
                id: true,
                slug: true,
                name: true,
              },
            },
          },
        });
        if (activeQuestion) {
          currentQuestion = activeQuestion;
        }
      }

      // Find ALL inactive questions that reference this active question
      // Since all inactive questions in a chain reference the same active question,
      // we just need to find all questions with replacedById = currentActiveId
      const allInactiveVersions = await this.prisma.question.findMany({
        where: {
          replacedById: currentQuestion.id,
          inactive: true,
        },
        include: {
          riskCategory: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc', // Oldest first
        },
      });

      // Build the history: all inactive versions (oldest to newest) + current active version
      const history: any[] = [...allInactiveVersions, currentQuestion];

      this.logger.log(
        `Retrieved version history for question ${id}: ${history.length} versions found (${allInactiveVersions.length} inactive + 1 active)`,
      );

      return history;
    } catch (error) {
      this.logger.error(
        `Error retrieving version history for question ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
