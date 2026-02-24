import { relations } from 'drizzle-orm';

import { users } from '@/modules/auth/schema';
import { todos } from '@/modules/todos/schema';

export const todosRelations = relations(todos, ({ one }) => ({
  createdBy: one(users, {
    fields: [todos.createdById],
    references: [users.id],
  }),
}));
