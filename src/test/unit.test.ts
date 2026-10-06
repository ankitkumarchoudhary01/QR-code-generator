import { describe, it, expect } from 'vitest';
import { validateTicketForm, hasErrors } from '../types';
import { sanitizeInput, buildQRValue } from '../utils';

// ─── Unit: Validation ──────────────────────────────────────────────────────────

describe('validateTicketForm', () => {
  it('returns no errors for a fully valid form', () => {
    const errors = validateTicketForm({
      title: 'Fix login bug',
      description: 'Users cannot log in on mobile',
      assignee: 'alice@corp.com',
      priority: 'high',
    });
    expect(hasErrors(errors)).toBe(false);
  });

  it('returns an error when title is empty', () => {
    const errors = validateTicketForm({
      title: '',
      description: 'desc',
      assignee: 'bob',
      priority: 'low',
    });
    expect(errors.title).toBeDefined();
  });

  it('returns an error when title is only whitespace', () => {
    const errors = validateTicketForm({
      title: '   ',
      description: 'desc',
      assignee: 'bob',
      priority: 'low',
    });
    expect(errors.title).toBeDefined();
  });

  it('returns an error when description is empty', () => {
    const errors = validateTicketForm({
      title: 'Title',
      description: '',
      assignee: 'bob',
      priority: 'medium',
    });
    expect(errors.description).toBeDefined();
  });

  it('returns an error when assignee is empty', () => {
    const errors = validateTicketForm({
      title: 'Title',
      description: 'Desc',
      assignee: '',
      priority: 'medium',
    });
    expect(errors.assignee).toBeDefined();
  });

  it('accumulates multiple errors simultaneously', () => {
    const errors = validateTicketForm({
      title: '',
      description: '',
      assignee: '',
      priority: 'low',
    });
    expect(errors.title).toBeDefined();
    expect(errors.description).toBeDefined();
    expect(errors.assignee).toBeDefined();
  });
});

// ─── Unit: XSS Sanitization ────────────────────────────────────────────────────

describe('sanitizeInput', () => {
  it('passes through clean strings unchanged', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World');
  });

  it('strips <script> tags to prevent XSS', () => {
    const result = sanitizeInput('<script>alert("xss")</script>Ticket title');
    expect(result).not.toContain('<script>');
    expect(result).toContain('Ticket title');
  });

  it('strips HTML tags from input', () => {
    const result = sanitizeInput('<b>Bold</b> text');
    expect(result).not.toContain('<b>');
    expect(result).toContain('Bold');
  });

  it('strips onerror event attributes', () => {
    const result = sanitizeInput('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('<img');
  });

  it('keeps plain numeric strings intact', () => {
    expect(sanitizeInput('12345')).toBe('12345');
  });
});

// ─── Unit: QR Value Builder ────────────────────────────────────────────────────

describe('buildQRValue', () => {
  it('produces valid JSON', () => {
    const ticket = {
      id: 'abc-123',
      title: 'Test ticket',
      assignee: 'carol',
      priority: 'high',
      status: 'open' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    const result = buildQRValue(ticket);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('includes all required fields in the QR payload', () => {
    const ticket = {
      id: 'xyz-789',
      title: 'Deploy hotfix',
      assignee: 'dave',
      priority: 'critical',
      status: 'in-progress' as const,
      createdAt: '2024-06-15T12:00:00.000Z',
    };
    const parsed = JSON.parse(buildQRValue(ticket));
    expect(parsed.id).toBe('xyz-789');
    expect(parsed.title).toBe('Deploy hotfix');
    expect(parsed.assignee).toBe('dave');
    expect(parsed.priority).toBe('critical');
    expect(parsed.status).toBe('in-progress');
    expect(parsed.createdAt).toBe('2024-06-15T12:00:00.000Z');
  });

  it('does not include description in QR payload (keeps QR compact)', () => {
    const ticket = {
      id: '1',
      title: 'T',
      assignee: 'A',
      priority: 'low',
      status: 'closed' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    const parsed = JSON.parse(buildQRValue(ticket));
    expect(parsed.description).toBeUndefined();
  });
});
