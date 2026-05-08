// @vitest-environment node

import { vi } from 'vitest';

vi.mock('@/lib/logging/hash', () => ({
  hashId: vi.fn((id: string) => `hashed_${id}`),
}));

vi.mock('@/lib/logging/evlog', () => ({
  log: { info: vi.fn(), warn: vi.fn() },
}));

const importModule = async () => {
  vi.resetModules();

  const evlog = await import('@/lib/logging/evlog');
  const hash = await import('@/lib/logging/hash');
  const mod = await import('./log-audit-event');
  // oxlint-disable-next-line typescript/unbound-method -- mock fn
  const logInfo = vi.mocked(evlog.log.info);
  // oxlint-disable-next-line typescript/unbound-method -- mock fn
  const logWarn = vi.mocked(evlog.log.warn);
  return { ...mod, hashId: hash.hashId, logInfo, logWarn };
};

describe('logAuditEvent', () => {
  it('calls log.info with evlog audit contract fields', async () => {
    const { logAuditEvent, logInfo } = await importModule();

    logAuditEvent({
      action: 'create',
      actorId: 'user-1',
      entityId: 'account-1',
      tableName: 'ledger_accounts',
    });

    expect(logInfo).toHaveBeenCalledWith({
      action: 'ledger_accounts.create',
      audit: {
        action: 'ledger_accounts.create',
        actor: { id: 'hashed_user-1', type: 'user' },
        outcome: 'success',
        target: { id: 'hashed_account-1', type: 'ledger_accounts' },
      },
      user: { idHash: 'hashed_user-1' },
    });
  });

  it('hashes actorId and entityId', async () => {
    const { hashId, logAuditEvent } = await importModule();

    logAuditEvent({
      action: 'delete',
      actorId: 'user-42',
      entityId: 'account-99',
      tableName: 'ledger_accounts',
    });

    expect(hashId).toHaveBeenCalledWith('account-99');
    expect(hashId).toHaveBeenCalledWith('user-42');
  });

  it.each([
    ['update', 'categories'],
    ['delete', 'transactions'],
  ] as const)(
    'emits the full evlog contract for %s on %s',
    async (action, tableName) => {
      const { logAuditEvent, logInfo } = await importModule();

      logAuditEvent({
        action,
        actorId: 'user-1',
        entityId: 'entity-1',
        tableName,
      });

      const expected = `${tableName}.${action}`;
      expect(logInfo).toHaveBeenCalledWith({
        action: expected,
        audit: {
          action: expected,
          actor: { id: 'hashed_user-1', type: 'user' },
          outcome: 'success',
          target: { id: 'hashed_entity-1', type: tableName },
        },
        user: { idHash: 'hashed_user-1' },
      });
    },
  );

  it('does not throw when hashId fails and emits a warning', async () => {
    const { hashId, logAuditEvent, logWarn } = await importModule();
    vi.mocked(hashId).mockImplementation(() => {
      throw new Error('LOG_HASH_SECRET missing');
    });

    expect(() =>
      logAuditEvent({
        action: 'create',
        actorId: 'user-1',
        entityId: 'acc-1',
        tableName: 'ledger_accounts',
      }),
    ).not.toThrow();

    expect(logWarn).toHaveBeenCalledWith({
      action: 'audit.log.failed',
      auditAction: 'create',
      error: 'LOG_HASH_SECRET missing',
      tableName: 'ledger_accounts',
    });
  });

  it('does not throw when log.info itself fails and emits a warning', async () => {
    const { hashId, logAuditEvent, logInfo, logWarn } = await importModule();
    // Ensure hashId works so the error comes from log.info, not hashId
    vi.mocked(hashId).mockReturnValue('hashed_ok');
    logInfo.mockImplementation(() => {
      throw new Error('evlog serialization error');
    });

    expect(() =>
      logAuditEvent({
        action: 'create',
        actorId: 'user-1',
        entityId: 'acc-1',
        tableName: 'ledger_accounts',
      }),
    ).not.toThrow();

    expect(logWarn).toHaveBeenCalledWith({
      action: 'audit.log.failed',
      auditAction: 'create',
      error: 'evlog serialization error',
      tableName: 'ledger_accounts',
    });
  });
});
