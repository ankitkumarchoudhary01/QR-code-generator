// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string; // ISO 8601
}

// Status is NOT in the form — assigned on the card after generation
export type TicketFormValues = Omit<Ticket, 'id' | 'createdAt' | 'status'>;

export interface QREntry {
  ticket: Ticket;
  qrValue: string;
  generatedAt: string; // ISO 8601
}

// ─── Validation ────────────────────────────────────────────────────────────────

export interface ValidationErrors {
  title?: string;
  description?: string;
  assignee?: string;
  priority?: string;
}

export function validateTicketForm(values: TicketFormValues): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!values.title.trim()) errors.title = 'Title is required.';
  if (!values.description.trim()) errors.description = 'Description is required.';
  if (!values.assignee.trim()) errors.assignee = 'Assignee is required.';
  if (!values.priority) errors.priority = 'Priority is required.';
  return errors;
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ─── Status Options (used by filter bar and card status selector) ─────────────

export type StatusFilter = Ticket['status'] | 'all';

export const STATUS_OPTIONS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all',         label: 'All Statuses', color: '#6b6b6b' },
  { value: 'open',        label: 'Open',         color: '#2563eb' },
  { value: 'in-progress', label: 'In Progress',  color: '#d97706' },
  { value: 'resolved',    label: 'Resolved',     color: '#16a34a' },
  { value: 'closed',      label: 'Closed',       color: '#374151' },
];

export const TICKET_STATUS_OPTIONS = STATUS_OPTIONS.filter(
  (s) => s.value !== 'all'
) as { value: Ticket['status']; label: string; color: string }[];
