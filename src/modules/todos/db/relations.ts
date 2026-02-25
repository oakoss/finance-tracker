import { relations } from 'drizzle-orm';

import { users } from '@/modules/auth/db/schema';
import { todos } from '@/modules/todos/db/schema';

export const todosRelations = relations(todos, ({ one }) => ({
  createdBy: one(users, {
    fields: [todos.createdById],
    references: [users.id],
  }),
}));
