import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock qrcode.react so jsdom doesn't choke on canvas
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg data-testid="qr-code" data-value={value} />
  ),
}));

// Helper: fills and submits a valid ticket form
async function submitTicket(
  user: ReturnType<typeof userEvent.setup>,
  opts: { title: string; description: string; assignee: string; priority?: string }
) {
  await user.type(screen.getByLabelText(/ticket title/i), opts.title);
  await user.type(screen.getByRole('textbox', { name: /^description/i }), opts.description);
  await user.type(screen.getByLabelText(/assignee/i), opts.assignee);
  if (opts.priority) await user.selectOptions(screen.getByLabelText(/priority/i), opts.priority);
  await user.click(screen.getByRole('button', { name: /generate qr code/i }));
}

// ─── Happy Path: Form Rendering ───────────────────────────────────────────────

describe('App — Happy Path', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('renders the application heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /ticket qr code generator/i })
    ).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    render(<App />);
    expect(screen.getByLabelText(/ticket title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/assignee/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
  });

  it('renders the generate button', () => {
    render(<App />);
    expect(
      screen.getByRole('button', { name: /generate qr code/i })
    ).toBeInTheDocument();
  });

  it('generates a QR entry and displays it after valid form submission', async () => {
    const user = userEvent.setup();
    render(<App />);

    await submitTicket(user, {
      title: 'Fix login bug',
      description: 'Mobile users cannot log in',
      assignee: 'alice@corp.com',
      priority: 'high',
      status: 'open',
    });

    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });
    expect(screen.getByText(/fix login bug/i)).toBeInTheDocument();
  });

  it('fires analytics ping on QR generation', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'log');
    render(<App />);

    await submitTicket(user, {
      title: 'Analytics test',
      description: 'Testing telemetry',
      assignee: 'bob',
      priority: 'low',
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Analytics]')
      );
    });
  });

  it('shows all generated QR entries in the list', async () => {
    const user = userEvent.setup();
    render(<App />);

    // First entry
    await submitTicket(user, { title: 'Ticket One', description: 'Desc One', assignee: 'alice', priority: 'low' });

    // Wait for first submission to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate qr code/i })).not.toBeDisabled();
    }, { timeout: 3000 });

    // Second entry
    await submitTicket(user, { title: 'Ticket Two', description: 'Desc Two', assignee: 'bob' });

    await waitFor(() => {
      expect(screen.getByText(/ticket one/i)).toBeInTheDocument();
      expect(screen.getByText(/ticket two/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

// ─── Unhappy Path: Validation / Empty States ──────────────────────────────────

describe('App — Unhappy Path', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /generate qr code/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('highlights the title field in error state when empty', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /generate qr code/i }));

    await waitFor(() => {
      const titleInput = screen.getByLabelText(/ticket title/i);
      expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('shows "No QR codes generated yet" empty state initially', () => {
    render(<App />);
    expect(screen.getByText(/no qr codes generated yet/i)).toBeInTheDocument();
  });

  it('does NOT render a QR code when form is invalid', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /generate qr code/i }));

    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
  });

  it('strips XSS from title input before generating QR', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText(/ticket title/i),
      '<script>alert("xss")</script>Real Title'
    );
    await user.type(screen.getByLabelText(/description/i), 'Safe desc');
    await user.type(screen.getByLabelText(/assignee/i), 'carol');
    await user.selectOptions(screen.getByLabelText(/priority/i), 'medium');
    await user.click(screen.getByRole('button', { name: /generate qr code/i }));

    await waitFor(() => {
      expect(screen.queryByText(/<script>/i)).not.toBeInTheDocument();
    });
  });
});

// ─── Filter Functionality ─────────────────────────────────────────────────────

describe('App — Status Filter', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('shows filter bar only after at least one entry is generated', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Filter bar not visible initially
    expect(screen.queryByLabelText(/filter qr codes by status/i)).not.toBeInTheDocument();

    await submitTicket(user, { title: 'T1', description: 'D1', assignee: 'a1' });

    await waitFor(() => {
      expect(screen.getByLabelText(/filter qr codes by status/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows filtered empty state when no entries match selected status', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Generate an "open" ticket (default status)
    await submitTicket(user, { title: 'Open ticket', description: 'Desc', assignee: 'alice' });

    // Wait for it to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/filter qr codes by status/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Filter by "resolved" — none should match
    await user.selectOptions(screen.getByLabelText(/filter qr codes by status/i), 'resolved');

    await waitFor(() => {
      expect(screen.getByText(/no matching tickets/i)).toBeInTheDocument();
    });
  });

  it('shows matching entries when filter matches ticket status', async () => {
    const user = userEvent.setup();
    render(<App />);

    await submitTicket(user, { title: 'In-progress ticket', description: 'Desc', assignee: 'bob' });

    await waitFor(() => {
      expect(screen.getByLabelText(/filter qr codes by status/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Change status on the card itself to 'in-progress'
    await user.selectOptions(screen.getByLabelText(/status for ticket: in-progress ticket/i), 'in-progress');

    // Filter by in-progress
    await user.selectOptions(screen.getByLabelText(/filter qr codes by status/i), 'in-progress');

    await waitFor(() => {
      expect(screen.getByText(/in-progress ticket/i)).toBeInTheDocument();
    });
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('App — Accessibility (a11y)', () => {
  it('all inputs have accessible labels', () => {
    render(<App />);
    expect(screen.getByLabelText(/ticket title/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^description/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/assignee/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
  });

  it('generate button has accessible name', () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /generate qr code/i });
    expect(btn).toBeInTheDocument();
  });

  it('error messages are associated with inputs via aria-describedby', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /generate qr code/i }));

    await waitFor(() => {
      const titleInput = screen.getByLabelText(/ticket title/i);
      const describedBy = titleInput.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      const errorEl = document.getElementById(describedBy!);
      expect(errorEl).toBeInTheDocument();
    });
  });
});

// ─── Modal Functionality ──────────────────────────────────────────────────────

describe('App — Ticket Modal', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('opens modal with ticket description when "Show Details" is clicked, and closes on "✖"', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Generate a ticket
    await submitTicket(user, { 
      title: 'Modal Test Ticket', 
      description: 'This is a secret long description for the modal.', 
      assignee: 'alice' 
    });

    await waitFor(() => {
      expect(screen.getByText(/Modal Test Ticket/i)).toBeInTheDocument();
    });

    // Click Show Details
    const showDetailsBtn = screen.getByRole('button', { name: /Show description for ticket: Modal Test Ticket/i });
    await user.click(showDetailsBtn);

    // Verify modal is open and shows description
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('This is a secret long description for the modal.')).toBeInTheDocument();
    });

    // Click close button
    const closeBtn = screen.getByRole('button', { name: /Close modal/i });
    await user.click(closeBtn);

    // Verify modal is closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
