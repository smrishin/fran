"use client";

import { useState, type FormEvent } from "react";

export function AccessGate() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const unlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/access/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "That Campfire Code was not recognized.");
        return;
      }
      window.location.reload();
    } catch {
      setMessage("Access could not be verified. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="access-screen">
      <div className="access-sun" aria-hidden="true" />
      <section className="access-card">
        <div className="access-brand">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span><b>FOG &amp; FIRE</b><small>CALIFORNIA · ’26</small></span>
        </div>
        <p className="eyebrow">San Francisco · Santa Cruz · Lake Tahoe · Sunnyvale</p>
        <h1>Welcome to<br/><em>Fog &amp; Fire.</em></h1>
        <p className="access-intro">Enter the group’s Campfire Code to open the trip dashboard.</p>
        <form onSubmit={unlock}>
          <label htmlFor="campfire-code">Campfire Code</label>
          <div className="access-input-row">
            <input
              id="campfire-code"
              name="campfire-code"
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="current-password"
              required
              aria-describedby={message ? "access-message" : "access-note"}
            />
            <button type="submit" disabled={submitting}>{submitting ? "Opening…" : "Enter →"}</button>
          </div>
          {message ? <p className="access-message" id="access-message" role="alert">{message}</p> : null}
        </form>
        <p className="access-note" id="access-note">One successful code unlocks this device for seven days.</p>
      </section>
      <footer className="access-footer"><span>OCT 24 — NOV 01</span><span>CALIFORNIA · 2026</span></footer>
    </main>
  );
}
