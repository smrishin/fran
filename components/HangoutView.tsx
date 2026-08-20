"use client";

import { useEffect, useState } from "react";
import { hangoutGames } from "../data/hangout";
import { guests, type Guest } from "../data/trip";
import { CrossedWiresGame } from "./CrossedWiresGame";
import { GuestIdentityPicker } from "./GuestIdentityPicker";

const HANGOUT_PLAYER_STORAGE_KEY = "fog-fire-hangout-player";

export function HangoutView() {
  const [player, setPlayer] = useState<Guest | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [identityBusy, setIdentityBusy] = useState(false);
  const [identityError, setIdentityError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(HANGOUT_PLAYER_STORAGE_KEY);
    queueMicrotask(async () => {
      const storedPlayer = guests.find((guest) => guest.id === stored) ?? null;
      if (storedPlayer) {
        try {
          const response = await fetch("/api/hangout/identity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId: storedPlayer.id }),
          });
          if (response.ok) setPlayer(storedPlayer);
        } catch {
          // The picker remains available if identity recovery is offline.
        }
      }
      setPlayerReady(true);
    });
  }, []);

  const choosePlayer = async (guest: Guest) => {
    setIdentityBusy(true);
    setIdentityError("");
    try {
      const response = await fetch("/api/hangout/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: guest.id }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Your seat could not be saved.");
      localStorage.setItem(HANGOUT_PLAYER_STORAGE_KEY, guest.id);
      setPlayer(guest);
    } catch (error) {
      setIdentityError(error instanceof Error ? error.message : "Your seat could not be saved.");
    } finally {
      setIdentityBusy(false);
    }
  };

  const switchPlayer = () => {
    void fetch("/api/hangout/identity", { method: "DELETE" });
    localStorage.removeItem(HANGOUT_PLAYER_STORAGE_KEY);
    setPlayer(null);
  };

  if (!playerReady) return <div className="quest-loading section-shell">Setting the table…</div>;
  if (!player) {
    return (
      <GuestIdentityPicker
        className="hangout-picker"
        eyebrow="PULL UP A SEAT"
        title="Who’s"
        accent="hanging out?"
        description="Choose your name once. Hangout will remember your seat on this device when game night starts."
        ariaLabel="Choose your Hangout player"
        disabled={identityBusy}
        error={identityError}
        onChoose={choosePlayer}
      />
    );
  }

  if (selectedGameId === "crossed-wires") {
    return <CrossedWiresGame player={player} onBack={() => setSelectedGameId(null)} />;
  }

  return (
    <div className="hangout-page inner-page page-enter">
      <header className="hangout-hero section-shell">
        <div>
          <p className="eyebrow">FACE-TO-FACE · PHONES DOWN</p>
          <h1>Hangout.</h1>
          <p>Quick setup here. The real game happens around the table.</p>
        </div>
        <div className="quest-player-summary">
          <span>{player.initials}</span>
          <div><small>YOUR SEAT</small><b>{player.name}</b><button type="button" onClick={switchPlayer}>Switch player</button></div>
        </div>
      </header>

      <section className="hangout-shelf section-shell">
        <header>
          <div><small>GAME SHELF</small><h2>Pick a game,<br/><em>gather the room.</em></h2></div>
          <span>{hangoutGames.length} AVAILABLE</span>
        </header>
        {hangoutGames.length ? (
          <div className="hangout-game-grid">
            {hangoutGames.map((game, index) => (
              <button type="button" key={game.id} onClick={() => setSelectedGameId(game.id)}>
                <small>GAME {String(index + 1).padStart(2, "0")}</small>
                <h3>{game.title}</h3>
                <b>{game.tagline}</b>
                <p>{game.description}</p>
                <i>Open game →</i>
              </button>
            ))}
          </div>
        ) : (
          <div className="hangout-empty">
            <span aria-hidden="true">✦</span>
            <div><small>YOUR SEAT IS SAVED</small><h3>Game night is warming up.</h3><p>The first game and its setup instructions will land here next.</p></div>
            <i>COMING SOON</i>
          </div>
        )}
      </section>
    </div>
  );
}
