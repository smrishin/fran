"use client";
/* eslint-disable @next/next/no-img-element -- Proof previews and protected R2 images are dynamic user uploads. */

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import { questTasks, questsForPlayer, type QuestCompletion, type QuestTask } from "../data/quest";
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

function useModalDismiss(onClose: () => void, enabled = true) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && enabled) onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, enabled]);
}

async function thumbnailFor(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 480 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  } catch { return null; }
  finally { URL.revokeObjectURL(url); }
}

type PendingPhoto = { id: number; uploadId: string; file: File; status: "waiting" | "uploading" | "error" | "saved"; message?: string; replaceId?: string };

function ProofComposer({ task, player, completion, onClose, onSaved }: {
  task: QuestTask;
  player: Guest;
  completion?: QuestCompletion;
  onClose: () => void;
  onSaved: (completion: QuestCompletion | null, taskId: string) => void;
}) {
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [removePhotoId, setRemovePhotoId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const libraryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const replaceId = useRef<string | undefined>(undefined);
  const nextId = useRef(0);
  const photos = completion?.photos ?? [];
  useModalDismiss(onClose, !busy);

  const upload = async (items: PendingPhoto[]) => {
    setBusy(true);
    setMessage("");
    for (const item of items) {
      setPending((current) => current.map((photo) => photo.id === item.id ? { ...photo, status: "uploading", message: undefined } : photo));
      try {
        if (item.file.size > 10 * 1024 * 1024) throw new Error("Choose a photo under 10 MB.");
        const form = new FormData();
        form.set("taskId", task.id);
        form.set("uploadId", item.uploadId);
        form.set("playerId", player.id);
        form.set("photo", item.file);
        if (item.replaceId) form.set("replacePhotoId", item.replaceId);
        const thumbnail = await thumbnailFor(item.file);
        if (thumbnail) form.set("thumbnail", thumbnail, "thumbnail.jpg");
        const response = await fetch("/api/quest/proof", { method: "POST", body: form });
        const result = await response.json() as { completion?: QuestCompletion; error?: string };
        if (!response.ok || !result.completion) throw new Error(result.error ?? "Upload failed.");
        onSaved(result.completion, task.id);
        setPending((current) => current.map((photo) => photo.id === item.id ? { ...photo, status: "saved" } : photo));
      } catch (error) {
        setPending((current) => current.map((photo) => photo.id === item.id ? { ...photo, status: "error", message: error instanceof Error ? error.message : "Upload failed." } : photo));
      }
    }
    setBusy(false);
  };

  const choosePhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const replacement = replaceId.current;
    replaceId.current = undefined;
    const available = replacement ? 1 : Math.max(0, 3 - photos.length);
    const items: PendingPhoto[] = files.slice(0, available).map((file) => ({ id: nextId.current++, uploadId: crypto.randomUUID(), file, status: "waiting", replaceId: replacement }));
    setPending((current) => [...current.filter((item) => item.status !== "saved"), ...items]);
    if (items.length) void upload(items);
    if (files.length > available) setMessage(`Only ${available} ${available === 1 ? "photo fits" : "photos fit"} in the remaining slots. The first ${available} selected will upload.`);
  };

  const remove = async (photoId: string) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/quest/proof", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: task.id, playerId: player.id, photoId }) });
      const result = await response.json() as { completion: QuestCompletion | null; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not remove photo.");
      onSaved(result.completion, task.id);
      setRemovePhotoId(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove photo."); }
    finally { setBusy(false); }
  };

  return createPortal(
    <div className="quest-modal" role="dialog" aria-modal="true" aria-labelledby="quest-proof-title" aria-busy={busy}>
      <button className="quest-modal-dismiss" type="button" aria-label="Close challenge" disabled={busy} onClick={onClose} />
      <div className="quest-proof-card">
        <header><div><small>{task.category ?? "QUEST"} · {photos.length}/3 PHOTOS</small><h2 id="quest-proof-title">{task.title}</h2></div><button type="button" disabled={busy} onClick={onClose} aria-label="Close">×</button></header>
        <p>{task.description}</p>
        <div className="quest-photo-slots">
          {photos.map((photo, index) => <div className="quest-photo-slot" key={photo.id}>
            <img src={photo.thumbnailUrl || photo.photoUrl} alt={`Challenge moment ${index + 1}`} />
            <div><button type="button" disabled={busy} onClick={() => { replaceId.current = photo.id; libraryInput.current?.click(); }}>Replace</button><button type="button" disabled={busy} onClick={() => { setRemovePhotoId(photo.id); setMessage(""); }}>Remove</button></div>
          </div>)}
          {Array.from({ length: Math.max(0, 3 - photos.length) }, (_, index) => <div className="quest-photo-slot empty" key={`empty-${index}`}><span>＋</span><small>Photo {photos.length + index + 1}</small></div>)}
        </div>
        {removePhotoId && <div className="quest-delete-confirm quest-remove-confirm" role="group" aria-label="Confirm photo removal">
          <p>Remove this photo permanently?{photos.length === 1 ? " This challenge will return to incomplete." : " Your other photos will stay."}</p>
          <button type="button" disabled={busy} onClick={() => void remove(removePhotoId)}>{busy ? "Removing…" : "Yes, remove photo"}</button>
          <button type="button" disabled={busy} onClick={() => setRemovePhotoId(null)}>Cancel</button>
        </div>}
        <p>{photos.length ? "Challenge complete! Add up to three favorites, or swap in a better shot." : "One photo completes this challenge. Add up to three favorites."}</p>
        <input ref={libraryInput} className="visually-hidden" type="file" accept="image/*" multiple disabled={busy} onChange={choosePhotos} />
        <input ref={cameraInput} className="visually-hidden" type="file" accept="image/*" capture="environment" disabled={busy} onChange={choosePhotos} />
        {photos.length < 3 && <div className="quest-photo-actions"><button type="button" disabled={busy} onClick={() => cameraInput.current?.click()}>Take photo</button><button type="button" disabled={busy} onClick={() => { replaceId.current = undefined; libraryInput.current?.click(); }}>Photo library</button></div>}
        <div aria-live="polite">{pending.map((item) => <div className={`quest-upload-item ${item.status}`} key={item.id}><span>{item.file.name}: {item.status === "uploading" ? "Uploading…" : item.status === "saved" ? "Saved ✓" : item.message ?? "Waiting…"}</span>{item.status === "error" && <button type="button" disabled={busy} onClick={() => void upload([item])}>Retry</button>}</div>)}</div>
        {message && <p className="quest-upload-message error" role="alert">{message}</p>}
        <button className="quest-submit" type="button" disabled={busy} onClick={onClose}>{busy ? "Saving photos…" : "Done →"}</button>
      </div>
    </div>, document.body,
  );
}

function MemoryLightbox({ completion, position, total, playerId, onDeleted, onClose, onPrevious, onNext }: {
  playerId: string;
  onDeleted: (completion: QuestCompletion | null, taskId: string) => void;
  completion: QuestCompletion;
  position: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const photos = completion.photos?.length ? completion.photos : [{ id: completion.id, photoUrl: completion.photoUrl, thumbnailUrl: completion.thumbnailUrl }];
  const selectedPhoto = photos[Math.min(photoIndex, photos.length - 1)];
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const touchStart = useRef<number | null>(null);
  const taskTitle = questTasks.find((task) => task.id === completion.taskId)?.title ?? "Quest memory";

  const dismiss = () => { if (!deleting) onClose(); };
  useModalDismiss(dismiss, !deleting);

  useEffect(() => {
    const navigateWithKeyboard = (event: KeyboardEvent) => {
      if (deleting) return;
      if (event.key === "ArrowLeft") onPrevious();
      if (event.key === "ArrowRight") onNext();
    };

    window.addEventListener("keydown", navigateWithKeyboard);
    return () => window.removeEventListener("keydown", navigateWithKeyboard);
  }, [onNext, onPrevious, deleting]);

  const beginSwipe = (event: TouchEvent<HTMLDivElement>) => {
    touchStart.current = event.changedTouches[0]?.clientX ?? null;
  };

  const finishSwipe = (event: TouchEvent<HTMLDivElement>) => {
    if (deleting || touchStart.current === null) return;
    const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(distance) < 54) return;
    if (distance > 0) onPrevious();
    else onNext();
  };

  const deletePhoto = async () => {
    if (completion.playerId !== playerId || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/quest/proof", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: completion.taskId, playerId, photoId: selectedPhoto.id }),
      });
      const result = await response.json() as { completion: QuestCompletion | null; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not delete photo.");
      onDeleted(result.completion, completion.taskId);
      setPhotoIndex(0);
      setConfirmDelete(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete photo.");
    } finally { setDeleting(false); }
  };

  const savePhoto = async () => {
    setSaveStatus("saving");
    setSaveMessage("");

    try {
      const response = await fetch(selectedPhoto.photoUrl);
      if (!response.ok) throw new Error("Photo could not be prepared.");
      const blob = await response.blob();
      const extensions: Record<string, string> = {
        "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
        "image/heic": "heic", "image/heif": "heif", "image/avif": "avif", "image/gif": "gif",
        "image/heic-sequence": "heics", "image/heif-sequence": "heifs",
      };
      const extension = extensions[blob.type.split(";")[0].toLowerCase()] ?? "jpg";
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
      <div className="quest-lightbox-backdrop" aria-hidden="true"><img src={selectedPhoto.photoUrl} alt="" /></div>
      <button className="quest-lightbox-dismiss" type="button" aria-label="Close memory" onClick={dismiss} />
      <article className="quest-lightbox-frame">
        <button className="quest-lightbox-close" type="button" aria-label="Close photo" onClick={dismiss}>×</button>
        <div className="quest-lightbox-photo" onTouchStart={beginSwipe} onTouchEnd={finishSwipe}>
          <button className="quest-lightbox-photo-dismiss" type="button" aria-label="Close memory" onClick={dismiss} />
          <img src={selectedPhoto.photoUrl} alt={`${completion.playerName}'s Quest memory`} />
          {total > 1 && <div className="quest-lightbox-side-nav" aria-label="Memory navigation">
            <button type="button" aria-label="Previous memory" disabled={deleting} onClick={onPrevious}>←</button>
            <button type="button" aria-label="Next memory" disabled={deleting} onClick={onNext}>→</button>
          </div>}
          {total > 1 && <span className="quest-lightbox-swipe-hint" aria-hidden="true">← swipe to browse →</span>}
        </div>
        <footer className={`quest-lightbox-details ${detailsOpen ? "expanded" : "collapsed"}`}>
          <button className="quest-lightbox-details-toggle" type="button" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((open) => !open)}>
            <span aria-hidden="true" /><b>Memory details</b><i aria-hidden="true">{detailsOpen ? "−" : "+"}</i>
          </button>
          <div className="quest-lightbox-thumbnails">{photos.map((photo, index) => <button type="button" key={photo.id} disabled={deleting} className={index === photoIndex ? "active" : ""} aria-label={`View photo ${index + 1}`} aria-pressed={index === photoIndex} onClick={() => { setConfirmDelete(false); setDeleteError(""); setPhotoIndex(index); setSaveStatus("idle"); setSaveMessage(""); }}><img src={photo.thumbnailUrl || photo.photoUrl} alt="" /></button>)}</div>
          <div className="quest-lightbox-details-content">
            <div className="quest-lightbox-copy">
              <small>QUEST MEMORY · {completion.playerName}</small>
              <h2 id="quest-memory-title">{taskTitle}</h2>
              <time dateTime={completion.completedAt}>{formatMemoryDate(completion.completedAt)}</time>
            </div>
            <div className="quest-lightbox-position" aria-live="polite"><span>{String(position).padStart(2, "0")}</span><i>/</i>{String(total).padStart(2, "0")}</div>
            <div className="quest-lightbox-actions">
              <button type="button" onClick={savePhoto} disabled={deleting || saveStatus === "saving"}>
                {saveStatus === "saving" ? "Preparing photo…" : "Save photo ↓"}
              </button>
              {completion.playerId === playerId && (
                confirmDelete ? <div className="quest-delete-confirm" role="group" aria-label="Confirm photo deletion">
                  <p>Delete this photo permanently?{photos.length === 1 ? " This challenge will return to incomplete." : " Your other photos will stay."}</p>
                  <button type="button" disabled={deleting} onClick={() => void deletePhoto()}>{deleting ? "Deleting…" : "Yes, delete photo"}</button>
                  <button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div> : <button type="button" onClick={() => setConfirmDelete(true)}>Delete photo</button>
              )}
              {deleteError && <span role="alert">{deleteError}</span>}
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
                <img src={completion.thumbnailUrl || completion.photoUrl} alt={`${completion.playerName}'s memory from ${tasks.get(completion.taskId)?.title ?? "a Quest challenge"}`} loading={index < 4 ? "eager" : "lazy"} />
                {completion.photos?.length > 1 && <span className="quest-memory-count">+{completion.photos.length - 1} photos</span>}
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

  const playerTasks = questsForPlayer(player?.id ?? "");
  const completedCount = playerTasks.filter((task) => playerCompletions.has(task.id)).length;
  const saved = (completion: QuestCompletion | null, taskId: string) => {
    setCompletions((current) => {
      const remaining = current.filter((item) => !(item.playerId === player?.id && item.taskId === taskId));
      return completion ? [completion, ...remaining] : remaining;
    });
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
        <div><p className="eyebrow">FOG & FIRE · FRIENDLY COMPETITION</p><h1>Quest.</h1><p>Nine little adventures. Your own way to capture them.</p></div>
        <div className="quest-player-summary">
          <span>{player.initials}</span>
          <div><small>PLAYING AS</small><b>{player.name}</b><button type="button" onClick={switchPlayer}>Switch player</button></div>
        </div>
      </header>

      <section className="quest-progress-shell section-shell">
        <div className="quest-progress-copy"><small>YOUR PROGRESS</small><strong>{completedCount} <i>/</i> {playerTasks.length}</strong><span>challenges completed</span></div>
        <div className="quest-progress-track" aria-label={`${completedCount} of ${playerTasks.length} challenges completed`}><i style={{ width: `${(completedCount / playerTasks.length) * 100}%` }} /></div>
        <div className="quest-tabs" role="tablist" aria-label="Quest views"><button className={mode === "board" ? "active" : ""} type="button" onClick={() => setMode("board")}>Quest Log</button><button className={mode === "gallery" ? "active" : ""} type="button" onClick={() => setMode("gallery")}>Glow Reel <span>{completions.length}</span></button></div>
      </section>

      <section className="quest-content section-shell">
        {loadError && <div className="quest-load-error" role="alert">{loadError} <button type="button" onClick={() => window.location.reload()}>Try again</button></div>}
        {mode === "board" ? (
          <div className="quest-board">
            {playerTasks.map((task, index) => {
              const completion = playerCompletions.get(task.id);
              return (
                <button className={`quest-task ${completion ? "complete" : ""}`} type="button" key={task.id} disabled={loading} onClick={() => setActiveTask(task)}>
                  <span className="quest-task-number">{String(index + 1).padStart(2, "0")}</span>
                  <small>{task.category ?? "CHALLENGE"}{completion ? " · COMPLETE ✓" : ""}</small>
                  {completion && <img className="quest-task-thumbnail" src={completion.thumbnailUrl || completion.photoUrl} alt="Your challenge cover" loading="lazy" />}
                  <h2>{task.title}</h2><p>{task.description}</p>
                  <i>{completion ? `Manage photos · ${completion.photos?.length || 1}/3 →` : "Add photos →"}</i>
                </button>
              );
            })}
          </div>
        ) : <GlowReel completions={completions} onOpen={setLightbox} />}
      </section>

      {activeTask && <ProofComposer task={activeTask} player={player} completion={playerCompletions.get(activeTask.id)} onClose={() => setActiveTask(null)} onSaved={saved} />}
      {lightbox && <MemoryLightbox key={lightbox.id} completion={lightbox} playerId={player.id} onDeleted={(completion, taskId) => { saved(completion, taskId); setLightbox(completion); }} position={lightboxIndex + 1} total={completions.length} onClose={() => setLightbox(null)} onPrevious={showPreviousMemory} onNext={showNextMemory} />}
    </div>
  );
}
