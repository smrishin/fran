export type QuestTask = {
  id: string;
  title: string;
  description: string;
  category?: string;
};

export type QuestCompletion = {
  id: string;
  taskId: string;
  playerId: string;
  playerName: string;
  photoUrl: string;
  completedAt: string;
};

export const questTasks: QuestTask[] = Array.from({ length: 16 }, (_, index) => ({
  id: `quest-slot-${String(index + 1).padStart(2, "0")}`,
  title: `Challenge slot ${String(index + 1).padStart(2, "0")}`,
  description: "Final trip challenge will be added here.",
}));
