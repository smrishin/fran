import { questTasks } from "../../../../data/quest";
import { guests } from "../../../../data/trip";
import { ACCESS_COOKIE_NAME, readCookie, verifyAccessToken } from "../../../../lib/access";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const accessToken = readCookie(request.headers.get("cookie"), ACCESS_COOKIE_NAME);
  if (!await verifyAccessToken(accessToken)) return Response.json({ error: "Campfire Code required." }, { status: 401 });

  try {
    const form = await request.formData();
    const taskId = String(form.get("taskId") ?? "");
    const playerId = String(form.get("playerId") ?? "");
    const photo = form.get("photo");
    const task = questTasks.find((item) => item.id === taskId);
    const player = guests.find((guest) => guest.id === playerId);

    if (!task || !player) return Response.json({ error: "Choose a valid player and challenge." }, { status: 400 });
    if (!(photo instanceof File) || !photo.type.startsWith("image/")) return Response.json({ error: "Choose an image to use as proof." }, { status: 400 });
    if (photo.size === 0 || photo.size > MAX_PHOTO_BYTES) return Response.json({ error: "Proof photos must be under 10 MB." }, { status: 413 });

    const { saveQuestProof } = await import("../../../../lib/quest-storage");
    const completion = await saveQuestProof({ taskId, playerId, playerName: player.name, file: photo });
    return Response.json({ completion }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_COMPLETED") {
      return Response.json({ error: "You already completed this challenge." }, { status: 409 });
    }
    return Response.json({ error: "The photo could not be saved. Please try again." }, { status: 503 });
  }
}
