import { useState, useId, useMemo, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './styles.css';
import type { Ticket, TicketFormValues, QREntry, ValidationErrors } from './types';
import { validateTicketForm, hasErrors, STATUS_OPTIONS, TICKET_STATUS_OPTIONS } from './types';
import { sanitizeInput, buildQRValue, generateId, analyticsping } from './utils';

// ─── TicketForm Component ─────────────────────────────────────────────────────

interface TicketFormProps {
  onGenerate: (entry: QREntry) => void;
}

function TicketForm({ onGenerate }: TicketFormProps) {
  const baseId = useId();
  const [values, setValues] = useState<TicketFormValues>({
    title: '',
    description: '',
    assignee: '',
    priority: 'medium',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(field: keyof TicketFormValues, raw: string) {
    const clean = sanitizeInput(raw);
    setValues((prev) => ({ ...prev, [field]: clean }));
    if (errors[field]) {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateTicketForm(values);
    if (hasErrors(validationErrors)) { setErrors(validationErrors); return; }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    const ticket: Ticket = {
      id: generateId(),
      ...values,
      status: 'open', // Default; user changes it on the card
      createdAt: new Date().toISOString(),
    };
    const entry: QREntry = {
      ticket,
      qrValue: buildQRValue(ticket),
      generatedAt: new Date().toISOString(),
    };

    analyticsping('Generate QR Code');
    onGenerate(entry);

    setValues({ title: '', description: '', assignee: '', priority: 'medium' });
    setErrors({});
    setIsLoading(false);
  }

  const ids = {
    title: `${baseId}-title`,
    titleError: `${baseId}-title-error`,
    description: `${baseId}-description`,
    descriptionError: `${baseId}-description-error`,
    assignee: `${baseId}-assignee`,
    assigneeError: `${baseId}-assignee-error`,
    priority: `${baseId}-priority`,
    priorityError: `${baseId}-priority-error`,
  };

  return (
    <section className="card" aria-label="Ticket QR Code Generator Form">
      <h2 className="card__heading">
        <span aria-hidden="true">🎟️</span> New Ticket
      </h2>
      <form className="form" onSubmit={handleSubmit} noValidate>

        {/* Title */}
        <div className="field">
          <label className="field__label" htmlFor={ids.title}>
            Ticket Title <span className="required" aria-hidden="true">*</span>
          </label>
          <input
            id={ids.title}
            className={`field__control${errors.title ? ' field__control--error' : ''}`}
            type="text"
            value={values.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g. Fix login issue on mobile"
            aria-required="true"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? ids.titleError : undefined}
            autoComplete="off"
          />
          {errors.title && (
            <p id={ids.titleError} className="field__error" role="alert">
              <span aria-hidden="true">⚠</span> {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="field">
          <label className="field__label" htmlFor={ids.description}>
            Description <span className="required" aria-hidden="true">*</span>
          </label>
          <textarea
            id={ids.description}
            className={`field__control${errors.description ? ' field__control--error' : ''}`}
            value={values.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Provide a clear description of the issue or task…"
            aria-required="true"
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? ids.descriptionError : undefined}
          />
          {errors.description && (
            <p id={ids.descriptionError} className="field__error" role="alert">
              <span aria-hidden="true">⚠</span> {errors.description}
            </p>
          )}
        </div>

        {/* Assignee */}
        <div className="field">
          <label className="field__label" htmlFor={ids.assignee}>
            Assignee <span className="required" aria-hidden="true">*</span>
          </label>
          <input
            id={ids.assignee}
            className={`field__control${errors.assignee ? ' field__control--error' : ''}`}
            type="text"
            value={values.assignee}
            onChange={(e) => handleChange('assignee', e.target.value)}
            placeholder="e.g. john.doe@company.com"
            aria-required="true"
            aria-invalid={!!errors.assignee}
            aria-describedby={errors.assignee ? ids.assigneeError : undefined}
            autoComplete="off"
          />
          {errors.assignee && (
            <p id={ids.assigneeError} className="field__error" role="alert">
              <span aria-hidden="true">⚠</span> {errors.assignee}
            </p>
          )}
        </div>

        {/* Priority */}
        <div className="field">
          <label className="field__label" htmlFor={ids.priority}>
            Priority <span className="required" aria-hidden="true">*</span>
          </label>
          <select
            id={ids.priority}
            className={`field__control${errors.priority ? ' field__control--error' : ''}`}
            value={values.priority}
            onChange={(e) => handleChange('priority', e.target.value as TicketFormValues['priority'])}
            aria-required="true"
            aria-invalid={!!errors.priority}
            aria-describedby={errors.priority ? ids.priorityError : undefined}
          >
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🟠 High</option>
            <option value="critical">🔴 Critical</option>
          </select>
          {errors.priority && (
            <p id={ids.priorityError} className="field__error" role="alert">
              <span aria-hidden="true">⚠</span> {errors.priority}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
          aria-label={isLoading ? 'Generating QR code, please wait…' : 'Generate QR Code'}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <><span className="spinner" aria-hidden="true" /> Generating…</>
          ) : (
            <><span aria-hidden="true">⚡</span> Generate QR Code</>
          )}
        </button>
      </form>
    </section>
  );
}

// ─── QREntryCard — Vertical: 60% QR zone / 40% info zone ────────────────────

const QR_REVEAL_DURATION = 10; // seconds

interface QREntryCardProps {
  entry: QREntry;
  onStatusChange: (id: string, status: Ticket['status']) => void;
  onShowDetails: (ticket: Ticket) => void;
}

function QREntryCard({ entry, onStatusChange, onShowDetails }: QREntryCardProps) {
  const { ticket, qrValue } = entry;
  const statusId = useId();

  // ── QR reveal state ──────────────────────────────────────────────────────
  const [isRevealed, setIsRevealed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  function handleReveal() {
    // Clear any existing timers first
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setIsRevealed(true);
    setCountdown(QR_REVEAL_DURATION);
    analyticsping('Reveal QR Code');

    // Tick countdown every second
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Hide after 10 seconds
    hideTimerRef.current = setTimeout(() => {
      setIsRevealed(false);
      setCountdown(0);
    }, QR_REVEAL_DURATION * 1000);
  }

  // ── Derived display values ────────────────────────────────────────────────
  const priorityLabel =
    ticket.priority === 'critical' ? '🔴 Critical' :
      ticket.priority === 'high' ? '🟠 High' :
        ticket.priority === 'medium' ? '🟡 Medium' : '🟢 Low';

  const statusMeta = TICKET_STATUS_OPTIONS.find((s) => s.value === ticket.status)
    ?? TICKET_STATUS_OPTIONS[0];

  const formattedTime = new Date(ticket.createdAt).toLocaleString('en-IN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });


  return (
    <article className="qr-entry" aria-label={`QR code for ticket: ${ticket.title}`}>

      {/* ── QR Zone: 60% ── */}
      <div className="qr-entry__qr-zone">
        {/* QR code — blurred until revealed */}
        <div className="qr-entry__qr-wrap" aria-hidden={!isRevealed}>
          <QRCodeSVG
            value={qrValue}
            size={150}
            aria-label={`QR Code for ticket ${ticket.id}: ${ticket.title}`}
            className={`qr-entry__svg${isRevealed ? ' qr-entry__svg--revealed' : ''}`}
          />
        </div>

        {/* Overlay: Show QR button OR countdown ring */}
        {!isRevealed ? (
          <div className="qr-overlay" aria-live="polite">
            <button
              className="btn-reveal"
              onClick={handleReveal}
              aria-label={`Show QR code for ticket: ${ticket.title}`}
            >
              <span className="btn-reveal__text">Show QR</span>
            </button>
          </div>
        ) : (
          <div className="qr-countdown" aria-live="polite" aria-label={`QR visible for ${countdown} more seconds`}>

          </div>
        )}

        <p className="qr-entry__id">#{ticket.id.slice(-6).toUpperCase()}</p>
      </div>

      {/* ── Info Zone: 40% ── */}
      <div className="qr-entry__info">
        {/* Title */}
        <p className="qr-entry__title" title={ticket.title}>{ticket.title}</p>

        {/* Status selector — inline on card */}
        <div className="qr-entry__status-row">
          <label className="qr-entry__status-label" htmlFor={`${statusId}-status`}>
            Status
          </label>
          <select
            id={`${statusId}-status`}
            className="qr-entry__status-select"
            value={ticket.status}
            style={{ borderColor: statusMeta.color, color: statusMeta.color }}
            onChange={(e) => {
              onStatusChange(ticket.id, e.target.value as Ticket['status']);
              analyticsping(`Update ticket status: ${e.target.value}`);
            }}
            aria-label={`Status for ticket: ${ticket.title}`}
          >
            {TICKET_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Priority badge + time */}
        <div className="qr-entry__footer-row">
          <span className={`badge badge--${ticket.priority}`}>{priorityLabel}</span>
          <span className="qr-entry__time">{formattedTime}</span>
        </div>

        {/* Assignee + Show Details Button */}
        <div className="qr-entry__assignee-row">
          <p className="qr-entry__assignee" title={ticket.assignee}>👤 {ticket.assignee}</p>
          <button
            className="btn-link"
            onClick={() => {
              analyticsping('Show ticket details');
              onShowDetails(ticket);
            }}
            aria-label={`Show description for ticket: ${ticket.title}`}
          >
            Show Details
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── FilterBar Component ──────────────────────────────────────────────────────

interface FilterBarProps {
  activeStatus: string;
  onStatusChange: (status: string) => void;
  totalCount: number;
  filteredCount: number;
}

function FilterBar({ activeStatus, onStatusChange, totalCount, filteredCount }: FilterBarProps) {
  const filterId = useId();
  return (
    <div className="filter-bar" role="search" aria-label="Filter generated QR codes">
      <label className="filter-bar__label" htmlFor={`${filterId}-status`}>
        <span aria-hidden="true">🔍</span> Filter by Status
      </label>
      <select
        id={`${filterId}-status`}
        className="filter-bar__select"
        value={activeStatus}
        onChange={(e) => {
          onStatusChange(e.target.value);
          analyticsping(`Filter by status: ${e.target.value}`);
        }}
        aria-label="Filter QR codes by status"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <p className="filter-bar__count" aria-live="polite" aria-atomic="true">
        Showing <strong>{filteredCount}</strong> of <strong>{totalCount}</strong>
      </p>
    </div>
  );
}

// ─── EmptyState Component ─────────────────────────────────────────────────────

function EmptyState({ isFiltered }: { isFiltered?: boolean }) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <span className="empty-state__icon" aria-hidden="true">{isFiltered ? '🔎' : '📭'}</span>
      <p className="empty-state__title">
        {isFiltered ? 'No matching tickets' : 'No QR codes generated yet'}
      </p>
      <p className="empty-state__subtitle">
        {isFiltered
          ? 'Try a different status filter or generate more tickets.'
          : <><strong>Fill in the form</strong> and click Generate QR Code to get started.</>
        }
      </p>
    </div>
  );
}

// ─── TicketModal Component ────────────────────────────────────────────────────

function TicketModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h3 id="modal-title" className="modal-title">{ticket.title}</h3>
            <p className="modal-subtitle">Ticket #{ticket.id.slice(-6).toUpperCase()}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <span aria-hidden="true">✖</span>
          </button>
        </header>
        <div className="modal-body">
          <p className="modal-description">{ticket.description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [entries, setEntries] = useState<QREntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  function handleGenerate(entry: QREntry) {
    setEntries((prev) => [entry, ...prev]);
  }

  function handleStatusChange(id: string, status: Ticket['status']) {
    setEntries((prev) =>
      prev.map((e) =>
        e.ticket.id === id
          ? { ...e, ticket: { ...e.ticket, status } }
          : e
      )
    );
  }

  const filteredEntries = useMemo(() =>
    statusFilter === 'all'
      ? entries
      : entries.filter((e) => e.ticket.status === statusFilter),
    [entries, statusFilter]
  );

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <span className="app-header__icon" aria-hidden="true">🔲</span>
        <h1 className="app-header__title">Ticket QR Code Generator Worker</h1>
        <span className="app-header__subtitle">ENG-139055 · Core Infrastructure Overhaul</span>
      </header>

      {/* ── Main ── */}
      <main className="app-main">
        {/* Left: Form */}
        <TicketForm onGenerate={handleGenerate} />

        {/* Right: Filter + QR Grid */}
        <section aria-label="Generated QR Codes">
          <div className="section-header">
            <h2 className="section-title">
              <span aria-hidden="true">📋</span> Generated Codes
              {entries.length > 0 && (
                <span className="count-badge" aria-label={`${entries.length} total entries`}>
                  {entries.length}
                </span>
              )}
            </h2>
          </div>

          {entries.length > 0 && (
            <FilterBar
              activeStatus={statusFilter}
              onStatusChange={setStatusFilter}
              totalCount={entries.length}
              filteredCount={filteredEntries.length}
            />
          )}

          {entries.length === 0 ? (
            <EmptyState />
          ) : filteredEntries.length === 0 ? (
            <EmptyState isFiltered />
          ) : (
            <div className="qr-grid" role="list" aria-label="Generated ticket QR codes">
              {filteredEntries.map((entry) => (
                <div key={entry.ticket.id} role="listitem">
                  <QREntryCard
                    entry={entry}
                    onStatusChange={handleStatusChange}
                    onShowDetails={setSelectedTicket}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <p>Ticket QR Code Generator Worker · ENG-139055 · &copy; {new Date().getFullYear()} Core Infrastructure Team</p>
      </footer>

      {/* Modal Portal */}
      {selectedTicket && (
        <TicketModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}
