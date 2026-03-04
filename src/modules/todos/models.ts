import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import { todos } from '@/modules/todos/db/schema';

export const todosSelectSchema = createSelectSchema(todos);
export const todosInsertSchema = createInsertSchema(todos);
export const todosUpdateSchema = createUpdateSchema(todos);
export const todosDeleteSchema = todosSelectSchema.pick('id');

export type Todo = typeof todosSelectSchema.infer;
export type TodoInsert = typeof todosInsertSchema.infer;
