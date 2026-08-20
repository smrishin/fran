"use client";

import { useCallback, useEffect, useState } from "react";
import type { HangoutLobbyState } from "../data/hangout";
import type { Guest } from "../data/trip";

type HangoutAction = "create" | "join" | "leave" | "start" | "next" | "reveal" | "end";

function initialsFor(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Something went sideways. Try again.");
  return body;
}

export function CrossedWiresGame({ player, onBack }: { player: Guest; onBack: () => void }) {
  const [gameState, setGameState] = useState<HangoutLobbyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<HangoutAction | null>(null);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [questionRoundId, setQuestionRoundId] = useState("");
  const [questionVisible, setQuestionVisible] = useState(false);
  const roundId = gameState?.lobby?.currentRound?.id ?? "";
  const isQuestionVisible = questionVisible && questionRoundId === roundId;

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/hangout", { cache: "no-store" });
      setGameState(await responseJson<HangoutLobbyState>(response));
      setError("");
    } catch (refreshError) {
      if (!quiet) setError(refreshError instanceof Error ? refreshError.message : "Hangout is temporarily unavailable.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refresh());
    const interval = window.setInterval(() => void refresh(true), 2500);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const act = async (action: HangoutAction) => {
    setBusyAction(action);
    setError("");
    try {
      const response = await fetch("/api/hangout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setGameState(await responseJson<HangoutLobbyState>(response));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Something went sideways. Try again.");
      await refresh(true);
    } finally {
      setBusyAction(null);
    }
  };

  const showQuestion = async () => {
    if (question && questionRoundId === roundId) {
      setQuestionVisible(true);
      return;
    }
    setError("");
    try {
      const response = await fetch("/api/hangout/question", { cache: "no-store" });
      const result = await responseJson<{ roundId: string; question: string }>(response);
      if (result.roundId !== roundId) {
        await refresh();
        return;
      }
      setQuestion(result.question);
      setQuestionRoundId(result.roundId);
      setQuestionVisible(true);
    } catch (questionError) {
      setError(questionError instanceof Error ? questionError.message : "Your question is temporarily unavailable.");
    }
  };

  const confirmReveal = () => {
    if (window.confirm("Reveal the questions? Make sure everyone has made their guess first.")) void act("reveal");
  };

  const confirmEnd = () => {
    if (window.confirm("End this game for everyone?")) void act("end");
  };

  const lobby = gameState?.lobby;
  const viewer = gameState?.viewer;
  const round = lobby?.currentRound;
  const memberCount = lobby?.members.length ?? 0;

  return (
    <div className="crossed-wires-page page-enter">
      <header className="cw-topbar section-shell">
        <button type="button" onClick={onBack}>← All games</button>
        <div><span>{player.initials}</span><small>PLAYING AS</small><b>{player.name}</b></div>
      </header>

      <main className="cw-stage section-shell">
        <header className="cw-title">
          <p className="eyebrow">HANGOUT · GAME 01</p>
          <h1>Crossed<br/><em>Wires.</em></h1>
          <p>One room. Two questions. Find the answer that came from somewhere else.</p>
        </header>

        {loading && !gameState ? (
          <section className="cw-card cw-loading" aria-live="polite">Checking the room…</section>
        ) : !lobby ? (
          <section className="cw-card cw-start-card">
            <small>NO LOBBY YET</small>
            <h2>Pull everyone into the same room.</h2>
            <p>You’ll host the first round. Friends can join from their own phones once the lobby opens.</p>
            <ol>
              <li><b>1</b><span>Everyone joins as themselves.</span></li>
              <li><b>2</b><span>Each player privately checks one question.</span></li>
              <li><b>3</b><span>Phones go down. Talk, listen, and spot the crossed wire.</span></li>
            </ol>
            <button className="cw-primary" type="button" disabled={busyAction !== null} onClick={() => void act("create")}>{busyAction === "create" ? "Opening room…" : "Start game night →"}</button>
          </section>
        ) : (
          <div className="cw-room-grid">
            <section className="cw-card cw-lobby-card">
              <header><div><small>THE ROOM</small><h2>{memberCount} of 7 joined</h2></div><span className={`cw-status cw-status-${lobby.status}`}>{lobby.status === "active" ? "ROUND LIVE" : lobby.status === "revealed" ? "REVEALED" : "LOBBY OPEN"}</span></header>
              <div className="cw-members">
                {lobby.members.map((member) => (
                  <div key={member.playerId} className={member.playerId === player.id ? "is-you" : ""}>
                    <span>{initialsFor(member.playerName)}</span>
                    <b>{member.playerName}{member.playerId === player.id ? " · You" : ""}</b>
                    {member.isHost && <small>HOST</small>}
                  </div>
                ))}
              </div>

              {!viewer?.isMember && (
                <div className="cw-join-panel">
                  <div><h3>{lobby.status === "active" ? "A round is underway." : "Game night is starting."}</h3><p>{lobby.status === "active" ? "You can join as soon as the questions are revealed." : "There’s a seat with your name on it."}</p></div>
                  <button className="cw-primary" type="button" disabled={!viewer?.canJoin || busyAction !== null} onClick={() => void act("join")}>{busyAction === "join" ? "Joining…" : lobby.status === "active" ? "Round in progress" : "Join game →"}</button>
                </div>
              )}

              {viewer?.isMember && viewer.canLeave && (
                <button className="cw-text-button" type="button" disabled={busyAction !== null} onClick={() => void act("leave")}>Leave lobby</button>
              )}
            </section>

            {viewer?.isMember && lobby.status === "waiting" && (
              <section className="cw-card cw-round-card">
                <small>ROUND SETUP</small>
                <h2>{memberCount < 3 ? "Waiting for the crew." : "The room is ready."}</h2>
                <p>{memberCount < 3 ? `${3 - memberCount} more ${3 - memberCount === 1 ? "player" : "players"} needed. Crossed Wires works with 3–7 people.` : viewer.isHost ? "Start when everyone has joined and can see their own phone." : "The host will start when everyone is settled."}</p>
                {viewer.isHost ? <button className="cw-primary" type="button" disabled={memberCount < 3 || busyAction !== null} onClick={() => void act("start")}>{busyAction === "start" ? "Wiring the round…" : "Start round →"}</button> : <div className="cw-waiting"><i/><span>WAITING FOR HOST</span></div>}
              </section>
            )}

            {viewer?.isMember && lobby.status === "active" && round && (
              <section className={`cw-card cw-question-card ${isQuestionVisible ? "is-visible" : "is-hidden"}`}>
                {!isQuestionVisible ? (
                  <>
                    <small>PRIVATE · KEEP THIS SCREEN CLOSE</small>
                    <div className="cw-question-seal" aria-hidden="true">?</div>
                    <h2>Your question is ready.</h2>
                    <p>Make sure only you can see the screen, then reveal your prompt.</p>
                    <button className="cw-primary" type="button" onClick={() => void showQuestion()}>Show my question</button>
                  </>
                ) : (
                  <>
                    <small>YOUR PRIVATE QUESTION</small>
                    <blockquote>{question}</blockquote>
                    <p>Remember it, hide it, and put your phone down. Answer naturally when it’s your turn.</p>
                    <button className="cw-secondary" type="button" onClick={() => setQuestionVisible(false)}>Hide my question</button>
                  </>
                )}
                <div className="cw-live-note"><i/><span>Round live · talk face-to-face</span></div>
                {viewer.isHost ? (
                  <div className="cw-host-controls"><small>HOST CONTROL</small><p>Reveal only after everyone has answered and made their guess.</p><button type="button" disabled={busyAction !== null} onClick={confirmReveal}>{busyAction === "reveal" ? "Revealing…" : "Reveal round"}</button></div>
                ) : <p className="cw-host-wait">The host will reveal when the room is ready.</p>}
              </section>
            )}

            {lobby.status === "revealed" && round?.reveal && (
              <section className="cw-card cw-reveal-card">
                <small>ROUND REVEALED</small>
                <h2>The different question went to <em>{round.reveal.differentPlayerName}.</em></h2>
                <div className="cw-reveal-questions">
                  <div><small>MAIN QUESTION</small><p>{round.reveal.mainQuestion}</p></div>
                  <div><small>THE DIFFERENT QUESTION</small><p>{round.reveal.differentQuestion}</p></div>
                </div>
                {viewer?.isMember && viewer.isHost ? (
                  <div className="cw-round-actions">
                    <button className="cw-primary" type="button" disabled={busyAction !== null} onClick={() => void act("next")}>{busyAction === "next" ? "Wiring the next one…" : "Next round →"}</button>
                    <button className="cw-secondary" type="button" disabled={busyAction !== null} onClick={confirmEnd}>End game</button>
                  </div>
                ) : <p className="cw-host-wait">The host can start another round when everyone is ready.</p>}
              </section>
            )}

            {viewer?.isMember && viewer.isHost && lobby.status !== "revealed" && (
              <button className="cw-end-link" type="button" disabled={busyAction !== null} onClick={confirmEnd}>End game for everyone</button>
            )}
          </div>
        )}

        {error && <p className="cw-error" role="alert">{error}</p>}
      </main>
    </div>
  );
}
