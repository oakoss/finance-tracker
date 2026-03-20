import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';

// Mock Paraglide messages
vi.mock('@/paraglide/messages', () => ({
  m: new Proxy(
    {},
    {
      get: (_target, key: string) => {
        const messages: Record<string, (...args: unknown[]) => string> = {
          'actions.cancel': () => 'Cancel',
          'actions.delete': () => 'Delete',
          'confirm.copied': () => 'Copied!',
          'confirm.typePhraseLabel': () => 'Type the following to confirm:',
        };
        return messages[key] ?? (() => key);
      },
    },
  ),
}));

const defaultProps = {
  confirmPhrase: 'DELETE',
  description: 'This action cannot be undone.',
  onConfirm: vi.fn(),
  title: 'Delete account?',
  trigger: <button>Open</button>,
};

describe('ConfirmDestructiveDialog', () => {
  it('renders the trigger', () => {
    render(<ConfirmDestructiveDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('opens the dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmDestructiveDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByText('Delete account?')).toBeInTheDocument();
    expect(
      screen.getByText('This action cannot be undone.'),
    ).toBeInTheDocument();
  });

  it('shows the confirm phrase in a styled code element', async () => {
    const user = userEvent.setup();
    render(<ConfirmDestructiveDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    const phrase = screen.getByText('DELETE');
    expect(phrase.tagName).toBe('CODE');
    expect(phrase).toHaveClass(
      'font-mono',
      'font-semibold',
      'bg-muted',
      'select-all',
      'cursor-copy',
    );
  });

  it('disables the action button until phrase matches', async () => {
    const user = userEvent.setup();
    render(<ConfirmDestructiveDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    const actionButton = screen.getByRole('button', { name: 'Delete' });
    expect(actionButton).toBeDisabled();
  });

  it('enables the action button when phrase matches exactly', async () => {
    const user = userEvent.setup();
    render(<ConfirmDestructiveDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');

    const actionButton = screen.getByRole('button', { name: 'Delete' });
    expect(actionButton).toBeEnabled();
  });

  it('does not enable the action button for partial match', async () => {
    const user = userEvent.setup();
    render(<ConfirmDestructiveDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(screen.getByPlaceholderText('DELETE'), 'DELET');

    const actionButton = screen.getByRole('button', { name: 'Delete' });
    expect(actionButton).toBeDisabled();
  });

  it('does not enable the action button for case mismatch', async () => {
    const user = userEvent.setup();
    render(<ConfirmDestructiveDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(screen.getByPlaceholderText('DELETE'), 'delete');

    const actionButton = screen.getByRole('button', { name: 'Delete' });
    expect(actionButton).toBeDisabled();
  });

  it('calls onConfirm when action button is clicked with matching phrase', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDestructiveDialog {...defaultProps} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('clears the input when dialog is closed and reopened', async () => {
    const user = userEvent.setup();
    render(<ConfirmDestructiveDialog {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await user.click(screen.getByRole('button', { name: 'Open' }));
    const input = screen.getByPlaceholderText('DELETE');
    expect(input).toHaveValue('');
  });

  it('uses custom actionLabel when provided', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDestructiveDialog
        {...defaultProps}
        actionLabel="Remove forever"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(
      screen.getByRole('button', { name: 'Remove forever' }),
    ).toBeInTheDocument();
  });

  it('shows placeholder matching the confirm phrase', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDestructiveDialog
        {...defaultProps}
        confirmPhrase="delete my account"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(
      screen.getByPlaceholderText('delete my account'),
    ).toBeInTheDocument();
  });

  it('shows loading state on the action button', async () => {
    const user = userEvent.setup();
    render(<ConfirmDestructiveDialog {...defaultProps} loading />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    const actionButton = screen.getByRole('button', { name: /Delete/ });
    expect(actionButton).toBeDisabled();
    expect(actionButton).toHaveAttribute('data-loading', 'true');
  });

  it('does not call onConfirm when phrase does not match', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDestructiveDialog {...defaultProps} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(screen.getByPlaceholderText('DELETE'), 'WRONG');

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps action button disabled when loading even if phrase matches', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDestructiveDialog
        {...defaultProps}
        loading
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');

    const actionButton = screen.getByRole('button', { name: /Delete/ });
    expect(actionButton).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps action button disabled when confirmPhrase is empty', async () => {
    const user = userEvent.setup();
    render(<ConfirmDestructiveDialog {...defaultProps} confirmPhrase="" />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    const actionButton = screen.getByRole('button', { name: 'Delete' });
    expect(actionButton).toBeDisabled();
  });

  it('prevents closing dialog while loading', async () => {
    const user = userEvent.setup();
    render(<ConfirmDestructiveDialog {...defaultProps} loading />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByText('Delete account?')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.getByText('Delete account?')).toBeInTheDocument();
  });

  it('disables cancel button while loading', async () => {
    const user = userEvent.setup();
    render(<ConfirmDestructiveDialog {...defaultProps} loading />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});

describe('ConfirmDestructiveDialog (controlled mode)', () => {
  it('renders open when open prop is true', () => {
    render(
      <ConfirmDestructiveDialog
        open
        confirmPhrase="DELETE"
        description="This action cannot be undone."
        title="Delete item?"
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Delete item?')).toBeInTheDocument();
  });

  it('does not render dialog when open prop is false', () => {
    render(
      <ConfirmDestructiveDialog
        confirmPhrase="DELETE"
        description="This action cannot be undone."
        open={false}
        title="Delete item?"
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.queryByText('Delete item?')).not.toBeInTheDocument();
  });

  it('calls onOpenChange when dialog is dismissed', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDestructiveDialog
        open
        confirmPhrase="DELETE"
        description="This action cannot be undone."
        title="Delete item?"
        onConfirm={vi.fn()}
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not call onOpenChange while loading', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDestructiveDialog
        loading
        open
        confirmPhrase="DELETE"
        description="This action cannot be undone."
        title="Delete item?"
        onConfirm={vi.fn()}
        onOpenChange={onOpenChange}
      />,
    );

    await user.keyboard('{Escape}');

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('stays open when parent does not update open prop', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDestructiveDialog
        open
        confirmPhrase="DELETE"
        description="This action cannot be undone."
        title="Delete item?"
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Delete item?')).toBeInTheDocument();
  });

  it('calls onConfirm when phrase matches in controlled mode', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDestructiveDialog
        open
        confirmPhrase="DELETE"
        description="This action cannot be undone."
        title="Delete item?"
        onConfirm={onConfirm}
        onOpenChange={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
