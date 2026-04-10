import { defineTask } from 'nitro/task';

import { db } from '@/db';
import { runPurgeExpiredAccounts } from '@/modules/auth/services/run-purge';

export default defineTask({
  meta: {
    description: 'Hard-deletes accounts past the 7-day grace period.',
    name: 'purge-deleted-accounts',
  },
  run: async () => {
    await runPurgeExpiredAccounts(db);
    return { result: 'success' };
  },
});
