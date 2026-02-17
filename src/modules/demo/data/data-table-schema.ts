import { type } from 'arktype';

const schema = type({
  header: 'string',
  id: 'number',
  limit: 'string',
  reviewer: 'string',
  status: 'string',
  target: 'string',
  type: 'string',
});

export type DataTableRow = typeof schema.infer;

export { schema };
