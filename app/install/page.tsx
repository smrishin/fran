/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";

const title = "Put Fog & Fire in Your Pocket";
const description = "Quick steps for adding the Fog & Fire trip app to an iPhone or Android home screen.";

export const metadata: Metadata = {
  title: `${title} — Fog & Fire`,
  description,
  openGraph: { title, description, images: [] },
  twitter: { title, description, images: [] },
};

const guides = [
  {
    device: "iPhone",
    browser: "Safari",
    label: "Recommended",
    steps: [
      "Open the Fog & Fire link in Safari.",
      "Tap the Share button — the square with an arrow pointing up.",
      "Scroll down and tap Add to Home Screen.",
      "Turn on Open as Web App if it appears, then tap Add.",
    ],
  },
  {
    device: "iPhone",
    browser: "Chrome",
    label: "Also works",
    steps: [
      "Open the Fog & Fire link in Chrome.",
      "Tap the Share button beside the address bar.",
      "Find and tap Add to Home Screen.",
      "Confirm the name, then tap Add.",
    ],
  },
  {
    device: "Android",
    browser: "Chrome",
    label: "Recommended",
    steps: [
      "Open the Fog & Fire link in Chrome.",
      "Tap the three-dot menu beside the address bar.",
      "Tap Add to home screen, then Install.",
      "Follow the prompt and look for the app icon on your home screen.",
    ],
  },
];

export default function InstallGuidePage() {
  return (
    <main className="install-guide">
      <header className="install-guide-header">
        <a className="install-brand" href="/" aria-label="Return to Fog and Fire">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <span><b>FOG &amp; FIRE</b><small>California · ’26</small></span>
        </a>
        <a className="install-back" href="/">← Back to the trip</a>
      </header>

      <section className="install-guide-intro">
        <p className="eyebrow">No app store. No fuss.</p>
        <h1>Put Fog &amp; Fire<br/><em>in your pocket.</em></h1>
        <p>Add the trip to your home screen so it opens like an app and is always one tap away.</p>
      </section>

      <section className="install-options" aria-label="Installation instructions">
        {guides.map((guide) => (
          <article className="install-option" key={`${guide.device}-${guide.browser}`}>
            <header>
              <div>
                <small>{guide.device}</small>
                <h2>{guide.browser}</h2>
              </div>
              <span>{guide.label}</span>
            </header>
            <ol>
              {guide.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </article>
        ))}
      </section>

      <aside className="install-finish">
        <span aria-hidden="true">✓</span>
        <p><b>That’s it.</b> Tap the Fog &amp; Fire icon whenever the adventure calls.</p>
      </aside>
    </main>
  );
}
