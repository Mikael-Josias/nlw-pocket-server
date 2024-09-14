import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { goalCompletions, goals } from '../db/schema';
import dayjs from 'dayjs';

export async function getWeekSummary() {
  const firstDayOfWeek = dayjs().startOf('week').toDate();
  const lastDayOfWeek = dayjs().endOf('week').toDate();

  const goalsCreatedUpToWeek = db.$with('goals_created_up_to_week').as(
    db
      .select({
        id: goals.id,
        title: goals.title,
        desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .where(lte(goals.createdAt, lastDayOfWeek))
  );

  const goalCompleteInWeek = db.$with('goal_complete_in_week').as(
    db
      .select({
        id: goalCompletions.id,
        title: goals.title,
        completedAt: goalCompletions.createdAt,
        completedAtDate: sql`DATE(${goalCompletions.createdAt})`.as(
          'completedAtDate'
        ),
      })
      .from(goalCompletions)
      .innerJoin(goals, eq(goals.id, goalCompletions.goalId))
      .where(
        and(
          gte(goalCompletions.createdAt, firstDayOfWeek),
          lte(goalCompletions.createdAt, lastDayOfWeek)
        )
      )
      .orderBy(desc(goalCompletions.createdAt))
  );

  const goalCompleteByWeekDay = db.$with('goals_completed_by_week_day').as(
    db
      .select({
        completedAtDate: goalCompleteInWeek.completedAtDate,
        completions:
          sql`JSON_AGG(JSON_BUILD_OBJECT('id', ${goalCompleteInWeek.id}, 'title', ${goalCompleteInWeek.title}, 'createdAt', ${goalCompleteInWeek.completedAt}))`.as(
            'completions'
          ),
      })
      .from(goalCompleteInWeek)
      .groupBy(goalCompleteInWeek.completedAtDate)
      .orderBy(desc(goalCompleteInWeek.completedAtDate))
  );

  type GoalsPerDay = Record<
    string,
    {
      id: string;
      title: string;
      completedAt: string;
    }[]
  >;

  const result = await db
    .with(goalsCreatedUpToWeek, goalCompleteInWeek, goalCompleteByWeekDay)
    .select({
      completed: sql`(SELECT COUNT(*) FROM ${goalCompleteInWeek})`.mapWith(
        Number
      ),
      total:
        sql`(SELECT SUM(${goalsCreatedUpToWeek.desiredWeeklyFrequency}) FROM ${goalsCreatedUpToWeek})`.mapWith(
          Number
        ),
      goalsPerDay: sql<GoalsPerDay>`JSON_OBJECT_AGG(${goalCompleteByWeekDay.completedAtDate}, ${goalCompleteByWeekDay.completions})`,
    })
    .from(goalCompleteByWeekDay);

  return {
    summary: result[0],
  };
}
