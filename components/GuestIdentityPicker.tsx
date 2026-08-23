"use client";

import { guests, type Guest } from "../data/trip";

export function GuestIdentityPicker({ eyebrow, title, accent, description, ariaLabel, onChoose, className = "", disabled = false, error = "" }: {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  ariaLabel: string;
  onChoose: (guest: Guest) => void;
  className?: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <section className={`quest-picker identity-picker ${className} section-shell`.trim()}>
      <div className="quest-picker-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}<br/><em>{accent}</em></h1>
        <p>{description}</p>
      </div>
      <div className="quest-player-grid" aria-label={ariaLabel}>
        {guests.map((guest, index) => (
          <button key={guest.id} type="button" disabled={disabled} onClick={() => onChoose(guest)}>
            <span className={`guest-avatar avatar-${index + 1}`}>{guest.initials}</span>
            <b>{guest.name}</b>
            <small>{guest.homeBase}</small>
            <i aria-hidden="true">→</i>
          </button>
        ))}
        {error && <p className="identity-picker-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
