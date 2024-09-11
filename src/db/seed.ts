import { db, client } from '.';
import { goalCompletions, goals } from './schema';
import dayjs from 'dayjs';

const startOfWeek = dayjs().startOf('week');

async function seed() {
  await db.delete(goalCompletions);
  await db.delete(goals);

  const result = await db
    .insert(goals)
    .values([
      {
        title: 'Acordar cedo',
        desiredWeeklyFrequency: 5,
      },
      {
        title: 'Praticar inglês',
        desiredWeeklyFrequency: 3,
      },
      {
        title: 'Me exercitar',
        desiredWeeklyFrequency: 1,
      },
    ])
    .returning();

  for (let i = 0; i < result.length; i++) {
    await db
      .insert(goalCompletions)
      .values({
        goalId: result[i].id,
        createdAt: startOfWeek.add(i, 'day').toDate(),
      });
  }
}

seed().finally(() => {
  client.end();
});
