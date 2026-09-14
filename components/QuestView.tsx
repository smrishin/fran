"use client";
/* eslint-disable @next/next/no-img-element -- Proof previews and protected R2 images are dynamic user uploads. */

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import { questTasks, type QuestCompletion, type QuestTask } from "../data/quest";
import { guests, type Guest } from "../data/trip";
import { GuestIdentityPicker } from "./GuestIdentityPicker";

const PLAYER_STORAGE_KEY = "fog-fire-quest-player";

function formatMemoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMemoryStamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "CALIFORNIA";
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date).toUpperCase();
  return `${month} ’${String(date.getFullYear()).slice(-2)}`;
}

function useModalDismiss(onClose: () => void) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);
}

function ProofComposer({ task, player, onClose, onSaved }: {
  task: QuestTask;
  player: Guest;
  onClose: () => void;
  onSaved: (completion: QuestCompletion) => void;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const libraryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  useModalDismiss(onClose);

  useEffect(() => {
    return () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = selected ? URL.createObjectURL(selected) : null;
    setPhoto(selected);
    setPreview(previewUrl.current);
    setStatus("idle");
    setMessage("");
  };

  const clearPhoto = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPhoto(null);
    setPreview(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!photo) {
      setStatus("error");
      setMessage("Choose or take a photo first.");
      return;
    }

    setStatus("uploading");
    setMessage("");
    const form = new FormData();
    form.set("taskId", task.id);
    form.set("playerId", player.id);
    form.set("photo", photo);

    try {
      const response = await fetch("/api/quest/proof", { method: "POST", body: form });
      const result = await response.json() as { completion?: QuestCompletion; error?: string };
      if (!response.ok || !result.completion) throw new Error(result.error ?? "Upload failed.");
      setStatus("success");
      setMessage("Proof saved. Challenge complete!");
      onSaved(result.completion);
      closeTimer.current = window.setTimeout(onClose, 3_000);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "The photo could not be saved. Try again.");
    }
  };

  return createPortal(
    <div className="quest-modal" role="dialog" aria-modal="true" aria-labelledby="quest-proof-title">
      <button className="quest-modal-dismiss" type="button" aria-label="Close challenge" onClick={onClose} />
      <form className="quest-proof-card" onSubmit={submit}>
        <header>
          <div><small>QUEST PROOF</small><h2 id="quest-proof-title">{task.title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close">×</button>
        </header>
        <p>{task.description}</p>
        {preview ? (
          <div className="quest-photo-preview"><img src={preview} alt="Selected challenge proof preview" /><button type="button" onClick={clearPhoto}>Choose another</button></div>
        ) : (
          <div className="quest-photo-empty"><span>✦</span><b>Add the moment</b><small>A photo is required before this challenge counts.</small></div>
        )}
        <input ref={libraryInput} className="visually-hidden" type="file" accept="image/*" onChange={choosePhoto} />
        <input ref={cameraInput} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={choosePhoto} />
        {!preview && <div className="quest-photo-actions"><button type="button" onClick={() => cameraInput.current?.click()}>Take photo</button><button type="button" onClick={() => libraryInput.current?.click()}>Photo library</button></div>}
        {message && <p className={`quest-upload-message ${status}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
        <button className="quest-submit" type="submit" disabled={!photo || status === "uploading" || status === "success"}>
          {status === "uploading" ? "Saving proof…" : status === "success" ? "Challenge complete ✓" : "Submit proof →"}
        </button>
      </form>
    </div>,
    document.body,
  );
}

function MemoryLightbox({ completion, position, total, onClose, onPrevious, onNext }: {
  completion: QuestCompletion;
  position: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const touchStart = useRef<number | null>(null);
  const taskTitle = questTasks.find((task) => task.id === completion.taskId)?.title ?? "Quest memory";

  useModalDismiss(onClose);

  useEffect(() => {
    const navigateWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") onPrevious();
      if (event.key === "ArrowRight") onNext();
    };

    window.addEventListener("keydown", navigateWithKeyboard);
    return () => window.removeEventListener("keydown", navigateWithKeyboard);
  }, [onNext, onPrevious]);

  const beginSwipe = (event: TouchEvent<HTMLDivElement>) => {
    touchStart.current = event.changedTouches[0]?.clientX ?? null;
  };

  const finishSwipe = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStart.current === null) return;
    const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(distance) < 54) return;
    if (distance > 0) onPrevious();
    else onNext();
  };

  const savePhoto = async () => {
    setSaveStatus("saving");
    setSaveMessage("");

    try {
      const response = await fetch(completion.photoUrl);
      if (!response.ok) throw new Error("Photo could not be prepared.");
      const blob = await response.blob();
      const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const safeName = `${completion.playerName}-${taskTitle}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const file = new File([blob], `fog-fire-${safeName}.${extension}`, { type: blob.type || "image/jpeg" });
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      if (isIOS && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Fog & Fire Quest memory" });
        setSaveStatus("saved");
        setSaveMessage("Done — check Photos if you chose Save Image.");
        return;
      }

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
      setSaveStatus("saved");
      setSaveMessage("Photo downloaded.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setSaveStatus("idle");
        return;
      }
      setSaveStatus("error");
      setSaveMessage(error instanceof Error ? error.message : "Photo could not be saved.");
    }
  };

  return createPortal(
    <div className="quest-lightbox" role="dialog" aria-modal="true" aria-label={`Quest memory: ${taskTitle} by ${completion.playerName}`}>
      <div className="quest-lightbox-backdrop" aria-hidden="true"><img src={completion.photoUrl} alt="" /></div>
      <button className="quest-lightbox-dismiss" type="button" aria-label="Close memory" onClick={onClose} />
      <article className="quest-lightbox-frame">
        <button className="quest-lightbox-close" type="button" aria-label="Close photo" onClick={onClose}>×</button>
        <div className="quest-lightbox-photo" onTouchStart={beginSwipe} onTouchEnd={finishSwipe}>
          <button className="quest-lightbox-photo-dismiss" type="button" aria-label="Close memory" onClick={onClose} />
          <img src={completion.photoUrl} alt={`${completion.playerName}'s Quest memory`} />
          {total > 1 && <div className="quest-lightbox-side-nav" aria-label="Memory navigation">
            <button type="button" aria-label="Previous memory" onClick={onPrevious}>←</button>
            <button type="button" aria-label="Next memory" onClick={onNext}>→</button>
          </div>}
          {total > 1 && <span className="quest-lightbox-swipe-hint" aria-hidden="true">← swipe to browse →</span>}
        </div>
        <footer className={`quest-lightbox-details ${detailsOpen ? "expanded" : "collapsed"}`}>
          <button className="quest-lightbox-details-toggle" type="button" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((open) => !open)}>
            <span aria-hidden="true" /><b>Memory details</b><i aria-hidden="true">{detailsOpen ? "−" : "+"}</i>
          </button>
          <div className="quest-lightbox-details-content">
            <div className="quest-lightbox-copy">
              <small>QUEST MEMORY · {completion.playerName}</small>
              <h2 id="quest-memory-title">{taskTitle}</h2>
              <time dateTime={completion.completedAt}>{formatMemoryDate(completion.completedAt)}</time>
            </div>
            <div className="quest-lightbox-position" aria-live="polite"><span>{String(position).padStart(2, "0")}</span><i>/</i>{String(total).padStart(2, "0")}</div>
            <div className="quest-lightbox-actions">
              <button type="button" onClick={savePhoto} disabled={saveStatus === "saving"}>
                {saveStatus === "saving" ? "Preparing photo…" : "Save photo ↓"}
              </button>
              {saveStatus === "idle" && <small>On iPhone, choose “Save Image” in the share sheet.</small>}
              {saveMessage && <span className={saveStatus} role={saveStatus === "error" ? "alert" : "status"}>{saveMessage}</span>}
            </div>
          </div>
        </footer>
      </article>
    </div>,
    document.body,
  );
}

function GlowReel({ completions, onOpen }: { completions: QuestCompletion[]; onOpen: (completion: QuestCompletion) => void }) {
  const PAGE_SIZE = 10;
  const tasks = useMemo(() => new Map(questTasks.map((task) => [task.id, task])), []);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMore = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const target = loadMore.current;
    if (!target || visibleCount >= completions.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleCount((count) => Math.min(count + PAGE_SIZE, completions.length));
      }
    }, { rootMargin: "420px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [completions.length, visibleCount]);

  if (!completions.length) {
    return <div className="quest-gallery-empty"><span>✦</span><h3>The Glow Reel starts with the first adventure.</h3><p>Completed challenges will collect here as a shared trip scrapbook.</p></div>;
  }

  const visibleCompletions = completions.slice(0, visibleCount);
  const gallerySize = completions.length === 1 ? "gallery-one" : completions.length === 2 ? "gallery-two" : completions.length < 5 ? "gallery-few" : "gallery-many";

  return (
    <section className={`quest-scrapbook ${gallerySize}`}>
      <header className="quest-reel-heading">
        <div><small>TRIP SCRAPBOOK · CALIFORNIA ’26</small><h2>Moments from the road.</h2></div>
        <p><b>{Math.min(visibleCount, completions.length)}</b> of {completions.length} memories on the table</p>
      </header>
      <div className="quest-reel-canvas">
        <span className="quest-fog-mark" aria-hidden="true">fog<br/>↝↝</span>
        <span className="quest-fire-mark" aria-hidden="true">✦</span>
        <div className="quest-gallery">
          {visibleCompletions.map((completion, index) => (
            <button className={`quest-memory tilt-${index % 6} memory-size-${index % 5}`} type="button" key={completion.id} onClick={() => onOpen(completion)}>
              <span className="quest-memory-tape" aria-hidden="true" />
              <div className="quest-memory-photo">
                <img src={completion.photoUrl} alt={`${completion.playerName}'s memory from ${tasks.get(completion.taskId)?.title ?? "a Quest challenge"}`} loading={index < 4 ? "eager" : "lazy"} />
                <span className="quest-memory-stamp" aria-hidden="true">CALIFORNIA<br/>{formatMemoryStamp(completion.completedAt)}</span>
                <div className="quest-memory-caption">
                  <small>{completion.playerName}</small>
                  <h3>{tasks.get(completion.taskId)?.title ?? completion.taskId}</h3>
                  <time dateTime={completion.completedAt}>{formatMemoryDate(completion.completedAt)}</time>
                </div>
              </div>
              <span className="quest-memory-note" aria-hidden="true">{index % 3 === 0 ? "good times" : index % 3 === 1 ? "worth the detour" : "fog & fire"}</span>
            </button>
          ))}
        </div>
        {visibleCount < completions.length && (
          <button ref={loadMore} className="quest-load-more" type="button" onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, completions.length))}>
            <span>More memories ahead</span><i>keep scrolling ↓</i>
          </button>
        )}
      </div>
    </section>
  );
}

export function QuestView() {
  const [player, setPlayer] = useState<Guest | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [completions, setCompletions] = useState<QuestCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<"board" | "gallery">("board");
  const [activeTask, setActiveTask] = useState<QuestTask | null>(null);
  const [lightbox, setLightbox] = useState<QuestCompletion | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(PLAYER_STORAGE_KEY);
    queueMicrotask(() => {
      setPlayer(guests.find((guest) => guest.id === stored) ?? null);
      setPlayerReady(true);
    });

    fetch("/api/quest", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { completions?: QuestCompletion[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Quest could not load.");
        setCompletions(result.completions ?? []);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Quest could not load."))
      .finally(() => setLoading(false));
  }, []);

  const choosePlayer = (guest: Guest) => {
    localStorage.setItem(PLAYER_STORAGE_KEY, guest.id);
    setPlayer(guest);
  };

  const switchPlayer = () => {
    localStorage.removeItem(PLAYER_STORAGE_KEY);
    setPlayer(null);
    setMode("board");
  };

  const playerCompletions = useMemo(
    () => new Map(completions.filter((completion) => completion.playerId === player?.id).map((completion) => [completion.taskId, completion])),
    [completions, player?.id],
  );

  const saved = (completion: QuestCompletion) => {
    setCompletions((current) => [completion, ...current.filter((item) => item.id !== completion.id)]);
  };

  const lightboxIndex = lightbox ? completions.findIndex((completion) => completion.id === lightbox.id) : -1;
  const showPreviousMemory = () => {
    if (lightboxIndex < 0 || completions.length < 2) return;
    setLightbox(completions[(lightboxIndex - 1 + completions.length) % completions.length]);
  };
  const showNextMemory = () => {
    if (lightboxIndex < 0 || completions.length < 2) return;
    setLightbox(completions[(lightboxIndex + 1) % completions.length]);
  };

  if (!playerReady) return <div className="quest-loading section-shell">Preparing Quest…</div>;
  if (!player) return <GuestIdentityPicker eyebrow="FIRST THINGS FIRST" title="Who’s" accent="playing?" description="Choose your name once. Quest will remember you on this device—no account or password needed." ariaLabel="Choose your Quest player" onChoose={choosePlayer} />;

  return (
    <div className="quest-page inner-page page-enter">
      <header className="quest-hero section-shell">
        <div><p className="eyebrow">FOG & FIRE · FRIENDLY COMPETITION</p><h1>Quest.</h1><p>Sixteen moments waiting to become stories.</p></div>
        <div className="quest-player-summary">
          <span>{player.initials}</span>
          <div><small>PLAYING AS</small><b>{player.name}</b><button type="button" onClick={switchPlayer}>Switch player</button></div>
        </div>
      </header>

      <section className="quest-progress-shell section-shell">
        <div className="quest-progress-copy"><small>YOUR PROGRESS</small><strong>{playerCompletions.size} <i>/</i> {questTasks.length}</strong><span>challenges completed</span></div>
        <div className="quest-progress-track" aria-label={`${playerCompletions.size} of ${questTasks.length} challenges completed`}><i style={{ width: `${(playerCompletions.size / questTasks.length) * 100}%` }} /></div>
        <div className="quest-tabs" role="tablist" aria-label="Quest views"><button className={mode === "board" ? "active" : ""} type="button" onClick={() => setMode("board")}>Quest Log</button><button className={mode === "gallery" ? "active" : ""} type="button" onClick={() => setMode("gallery")}>Glow Reel <span>{completions.length}</span></button></div>
      </section>

      <section className="quest-content section-shell">
        {loadError && <div className="quest-load-error" role="alert">{loadError} <button type="button" onClick={() => window.location.reload()}>Try again</button></div>}
        {mode === "board" ? (
          <div className="quest-board">
            {questTasks.map((task, index) => {
              const completion = playerCompletions.get(task.id);
              return (
                <button className={`quest-task ${completion ? "complete" : ""}`} type="button" key={task.id} disabled={loading} onClick={() => completion ? setLightbox(completion) : setActiveTask(task)}>
                  <span className="quest-task-number">{String(index + 1).padStart(2, "0")}</span>
                  <small>{completion ? "COMPLETED · PHOTO SAVED" : task.category ?? "CHALLENGE PLACEHOLDER"}</small>
                  <h2>{task.title}</h2><p>{task.description}</p>
                  <i>{completion ? "View memory ↗" : "Add proof →"}</i>
                </button>
              );
            })}
          </div>
        ) : <GlowReel completions={completions} onOpen={setLightbox} />}
      </section>

      {activeTask && <ProofComposer task={activeTask} player={player} onClose={() => setActiveTask(null)} onSaved={saved} />}
      {lightbox && <MemoryLightbox key={lightbox.id} completion={lightbox} position={lightboxIndex + 1} total={completions.length} onClose={() => setLightbox(null)} onPrevious={showPreviousMemory} onNext={showNextMemory} />}
    </div>
  );
}
