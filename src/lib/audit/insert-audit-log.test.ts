// @vitest-environment node

import { vi } from 'vitest';

const importModule = async () => {
  vi.resetModules();

  vi.mock('@/db', () => ({}));

  vi.mock('@/lib/logging/evlog', () => ({
    log: { info: vi.fn(), warn: vi.fn() },
  }));

  vi.mock('@/lib/logging/hash', () => ({
    hashId: vi.fn((id: string) => `hashed_${id}`),
  }));

  vi.mock('@/db/audit', () => ({
    auditLogs: Symbol('auditLogs'),
  }));

  const evlog = await import('@/lib/logging/evlog');
  const schema = await import('@/db/audit');
  const mod = await import('./insert-audit-log');
  // oxlint-disable-next-line typescript/unbound-method -- mock fn
  const logInfo = vi.mocked(evlog.log.info);
  return { ...mod, auditLogs: schema.auditLogs, logInfo };
};

function createMockTx(mockValues: ReturnType<typeof vi.fn>) {
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  return { insert: mockInsert, mockInsert };
}

describe('insertAuditLog', () => {
  it('inserts correct values for a create action', async () => {
    const { auditLogs, insertAuditLog } = await importModule();
    const mockValues = vi.fn().mockImplementation(() => Promise.resolve());
    const { mockInsert, ...tx } = createMockTx(mockValues);

    await insertAuditLog(
      tx as unknown as Parameters<typeof insertAuditLog>[0],
      {
        action: 'create',
        actorId: 'actor-1',
        afterData: { name: 'New Account' },
        entityId: 'record-1',
        tableName: 'ledger_accounts',
      },
    );

    expect(mockInsert).toHaveBeenCalledWith(auditLogs);
    const calledWith = mockValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(calledWith.action).toBe('create');
    expect(calledWith.actorId).toBe('actor-1');
    expect(calledWith.afterData).toEqual({ name: 'New Account' });
    expect(calledWith.beforeData).toBeUndefined();
    expect(calledWith.recordId).toBe('record-1');
    expect(calledWith.tableName).toBe('ledger_accounts');
  });

  it('inserts correct values for an update action with beforeData and afterData', async () => {
    const { insertAuditLog } = await importModule();
    const mockValues = vi.fn().mockImplementation(() => Promise.resolve());
    const tx = createMockTx(mockValues);

    await insertAuditLog(
      tx as unknown as Parameters<typeof insertAuditLog>[0],
      {
        action: 'update',
        actorId: 'actor-2',
        afterData: { name: 'Updated' },
        beforeData: { name: 'Original' },
        entityId: 'record-2',
        tableName: 'ledger_accounts',
      },
    );

    const calledWith = mockValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(calledWith.action).toBe('update');
    expect(calledWith.afterData).toEqual({ name: 'Updated' });
    expect(calledWith.beforeData).toEqual({ name: 'Original' });
  });

  it('inserts correct values for a delete action', async () => {
    const { insertAuditLog } = await importModule();
    const mockValues = vi.fn().mockImplementation(() => Promise.resolve());
    const tx = createMockTx(mockValues);

    await insertAuditLog(
      tx as unknown as Parameters<typeof insertAuditLog>[0],
      {
        action: 'delete',
        actorId: 'actor-3',
        beforeData: { name: 'Deleted Account' },
        entityId: 'record-3',
        tableName: 'ledger_accounts',
      },
    );

    const calledWith = mockValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(calledWith.action).toBe('delete');
    expect(calledWith.beforeData).toEqual({ name: 'Deleted Account' });
    expect(calledWith.afterData).toBeUndefined();
  });

  it('omits beforeData and afterData when not provided', async () => {
    const { insertAuditLog } = await importModule();
    const mockValues = vi.fn().mockImplementation(() => Promise.resolve());
    const tx = createMockTx(mockValues);

    await insertAuditLog(
      tx as unknown as Parameters<typeof insertAuditLog>[0],
      {
        action: 'create',
        actorId: 'actor-4',
        entityId: 'record-4',
        tableName: 'categories',
      },
    );

    const calledWith = mockValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(calledWith.beforeData).toBeUndefined();
    expect(calledWith.afterData).toBeUndefined();
  });

  it('logs via logAuditEvent with correct fields', async () => {
    const { insertAuditLog, logInfo } = await importModule();
    const mockValues = vi.fn().mockImplementation(() => Promise.resolve());
    const tx = createMockTx(mockValues);

    await insertAuditLog(
      tx as unknown as Parameters<typeof insertAuditLog>[0],
      {
        action: 'create',
        actorId: 'actor-5',
        entityId: 'record-5',
        tableName: 'ledger_accounts',
      },
    );

    expect(logInfo).toHaveBeenCalledWith({
      action: 'ledger_accounts.create',
      audit: {
        entity: 'ledger_accounts',
        entityIdHash: 'hashed_record-5',
        operation: 'create',
      },
      user: { idHash: 'hashed_actor-5' },
    });
  });

  it('propagates DB insert errors without calling log.info', async () => {
    const { insertAuditLog, logInfo } = await importModule();
    const dbError = new Error('unique_violation');
    const mockValues = vi.fn().mockRejectedValue(dbError);
    const tx = createMockTx(mockValues);

    await expect(
      insertAuditLog(tx as unknown as Parameters<typeof insertAuditLog>[0], {
        action: 'create',
        actorId: 'actor-1',
        entityId: 'record-1',
        tableName: 'ledger_accounts',
      }),
    ).rejects.toThrow('unique_violation');

    expect(logInfo).not.toHaveBeenCalled();
  });

  it('resolves successfully even when logging fails', async () => {
    const { insertAuditLog, logInfo } = await importModule();
    const mockValues = vi.fn().mockImplementation(() => Promise.resolve());
    const tx = createMockTx(mockValues);

    logInfo.mockImplementation(() => {
      throw new Error('evlog transport failed');
    });

    await expect(
      insertAuditLog(tx as unknown as Parameters<typeof insertAuditLog>[0], {
        action: 'create',
        actorId: 'actor-1',
        entityId: 'record-1',
        tableName: 'ledger_accounts',
      }),
    ).resolves.toBeUndefined();

    expect(mockValues).toHaveBeenCalled();
  });
});
