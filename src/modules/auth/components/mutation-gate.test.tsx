import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { MutationGate } from '@/modules/auth/components/mutation-gate';

const isEmailVerifiedMock = vi.fn<() => boolean>();

vi.mock('@/modules/auth/hooks/use-is-email-verified', () => ({
  useIsEmailVerified: () => isEmailVerifiedMock(),
}));

vi.mock('@/paraglide/messages', () => ({
  m: new Proxy(
    {},
    {
      get: (_target, key: string) => () =>
        key === 'auth.verification.gateTooltip'
          ? 'Verify your email to use this.'
          : key,
    },
  ),
}));

describe('MutationGate', () => {
  beforeEach(() => {
    isEmailVerifiedMock.mockReset();
  });

  it('renders children normally when email is verified', async () => {
    const handleClick = vi.fn();
    isEmailVerifiedMock.mockReturnValue(true);

    render(<MutationGate onClick={handleClick}>Add account</MutationGate>);

    const button = screen.getByRole('button', { name: 'Add account' });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-disabled');

    await userEvent.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('honors native disabled even when unverified (precedence)', () => {
    isEmailVerifiedMock.mockReturnValue(false);

    render(
      <MutationGate disabled onClick={vi.fn()}>
        Add account
      </MutationGate>,
    );

    // Caller's `disabled` wins: plain Button renders, no gate
    // wrapper, no aria-disabled marker. Guards the Codex
    // regression where `disabled={!hydrated}` was overridden.
    const button = screen.getByRole('button', { name: 'Add account' });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-disabled');
  });

  it('marks the button aria-disabled and intercepts clicks when unverified', async () => {
    const handleClick = vi.fn();
    isEmailVerifiedMock.mockReturnValue(false);

    render(<MutationGate onClick={handleClick}>Add account</MutationGate>);

    const button = screen.getByRole('button', { name: 'Add account' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    // Not natively disabled so pointer events fire for the tooltip.
    expect(button).not.toBeDisabled();

    await userEvent.click(button);
    // Caller's onClick is dropped — the gate swallows the click.
    expect(handleClick).not.toHaveBeenCalled();
  });
});
