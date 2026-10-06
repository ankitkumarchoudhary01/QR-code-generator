import DOMPurify from 'dompurify';

/**
 * Sanitizes a string value against XSS injection using DOMPurify.
 * Strips all HTML tags and dangerous attributes before storing in state.
 */
export function sanitizeInput(value: string): string {
  // DOMPurify with ALLOWED_TAGS=[] strips all tags, leaving plain text.
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Builds the QR code payload from a Ticket object.
 * Returns a stable JSON string so downstream consumers can parse it.
 */
export function buildQRValue(ticket: { id: string; title: string; assignee: string; priority: string; createdAt: string }): string {
  return JSON.stringify({
    id: ticket.id,
    title: ticket.title,
    assignee: ticket.assignee,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
  });
}

/**
 * Generates a lightweight unique ID (not crypto-secure; suitable for local state).
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Fires a simulated analytics ping.
 * [Telemetry] — logs to console per NFR spec.
 */
export function analyticsping(action: string): void {
  console.log(`[Analytics] User interacted with Ticket QR Code Generator Worker — ${action}`);
}
