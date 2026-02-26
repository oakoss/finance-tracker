// @vitest-environment node

import { vi } from 'vitest';

const importModule = async () => {
  vi.resetModules();

  vi.mock('@/lib/logging/evlog', () => ({
    log: { info: vi.fn(), warn: vi.fn() },
  }));

  vi.mock('@/lib/logging/hash', () => ({
    hashId: vi.fn((id: string) => `hashed_${id}`),
  }));

  const evlog = await import('@/lib/logging/evlog');
  const hash = await import('@/lib/logging/hash');
  const mod = await import('./log-audit-event');
  // eslint-disable-next-line @typescript-eslint/unbound-method -- mock fn
  const logInfo = vi.mocked(evlog.log.info);
  // eslint-disable-next-line @typescript-eslint/unbound-method -- mock fn
  const logWarn = vi.mocked(evlog.log.warn);
  return { ...mod, hashId: hash.hashId, logInfo, logWarn };
};

describe('logAuditEvent', () => {
  it('calls log.info with correct audit fields', async () => {
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
        entity: 'ledger_accounts',
        entityIdHash: 'hashed_account-1',
        operation: 'create',
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

  it('passes the action through to audit.operation', async () => {
    const { logAuditEvent, logInfo } = await importModule();

    logAuditEvent({
      action: 'update',
      actorId: 'user-1',
      entityId: 'cat-1',
      tableName: 'categories',
    });

    expect(logInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: expect.objectContaining({ operation: 'update' }),
      }),
    );
  });

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

    expect(logWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'audit.log.failed',
        error: 'LOG_HASH_SECRET missing',
      }),
    );
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

    expect(logWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'audit.log.failed',
        error: 'evlog serialization error',
      }),
    );
  });
});
