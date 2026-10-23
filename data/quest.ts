export type QuestTask = { id: string; title: string; description: string; category?: string };
export type QuestPhoto = { id: string; photoUrl: string; thumbnailUrl: string; position: number };
export type QuestCompletion = {
  id: string; taskId: string; playerId: string; playerName: string;
  photoUrl: string; thumbnailUrl: string; photos: QuestPhoto[]; completedAt: string; updatedAt: string;
};
const shared: [string,string,string][] = [
 ['tiny-human','Tiny Human, Giant World','Photograph a friend against the coast, redwoods, or Yosemite. Let the scenery fill most of the frame.'],
 ['caught-laughing','Caught Laughing','Capture a genuine laugh during the trip.'],
 ['unexpected-duo','An Unexpected Duo','Photograph two friends who haven’t had many pictures together.'],
 ['between-plans','Between the Plans','Capture a small moment: morning coffee, cooking, a roadside stop, or game night.'],
 ['california-cover','Your California Cover','Take the photo you’d choose as the cover of this trip’s album. People, scenery, or both.'],
];
const personal: Record<string, [string,string,string][]> = {
 sourav: [
 ['photographer-portrait','Behind the Camera','Give the frequent photographer a proper portrait.'],
 ['reflection','Double Take','Capture a friend in a reflection in glass, a mirror, or still water.'],
 ['first-bite','First Bite','Photograph someone reacting to a trip snack. Include their face and the food.'],
 ['band-cover','Band Practice','Turn three friends into an album cover. Pick a pose and leave room for the scenery.']],
 sanjay: [
 ['leading-role','Leading Role','Direct a cinematic portrait of a friend.'],
 ['through-something','Through Something','Frame someone through a doorway, window, or branches.'],
 ['morning','Morning Chapter','Capture the crew starting their day.'],
 ['tourist-energy','Tourist Energy','Direct the most enthusiastically touristy picture possible.']],
 rishi: [
 ['location-scout','Location Scout','Choose a backdrop and photograph a friend in it.'],
 ['color-match','Color Match','Match someone’s outfit to their surroundings.'],
 ['pit-stop','The Pit Stop','Make an ordinary break look memorable.'],
 ['perspective','Perspective Trick','Use distance to make something look tiny or enormous.']],
 ashwin: [
 ['coastal-cover','Coastal Cover','Take a windswept portrait by the water.'],
 ['shadow','Shadow Cast','Make a picture featuring someone’s shadow.'],
 ['helping-hands','Helping Hands','Capture a friend cooking, carrying, setting up, or helping.'],
 ['movie-poster','Movie Poster','Direct a dramatic group pose worthy of a movie poster.']],
 nirosha: [
 ['golden-moment','Golden Moment','Photograph a friend in soft morning or evening light.'],
 ['details','Little Details','Take a close-up that tells a trip story.'],
 ['at-table','At the Table','Capture friends sharing food, with faces in the frame.'],
 ['copy-that','Copy That','Have two friends mirror each other’s poses.']],
 deepa: [
 ['different-pair','A Different Pair','Take a portrait of a duo you haven’t photographed together.'],
 ['one-color','One Color Story','Build a picture around a single strong color.'],
 ['game-face','Game Face','Catch someone concentrating during Hangout.'],
 ['spooky-season','Spooky Season','Direct a Halloween-inspired portrait using costumes, decorations, or shadows.']],
 harshith: [
 ['your-turn','Your Turn','Photograph someone who says they never get good pictures.'],
 ['look-up','Look Up','Use a low angle to photograph a friend with trees or architecture above.'],
 ['wind-down','The Wind-Down','Capture the crew relaxing after a day out.'],
 ['same-pose','Same Pose, New Place','Recreate an earlier trip picture somewhere new.']],
};
const task = ([id,title,description]: [string,string,string], category: string): QuestTask => ({id,title,description,category});
export const sharedQuestIds = shared.map(([id]) => id);
export const personalQuestIds = Object.fromEntries(Object.entries(personal).map(([player, tasks]) => [player, tasks.map(([id]) => id)]));
export const questTasks: QuestTask[] = [...shared.map(t => task(t,'Shared')), ...Object.values(personal).flat().map(t => task(t,'Personal'))];
export function questsForPlayer(playerId: string): QuestTask[] {
 const ids = new Set([...sharedQuestIds, ...(personalQuestIds[playerId] ?? [])]);
 return questTasks.filter(t => ids.has(t.id));
}
export function questTitle(taskId: string) { return questTasks.find(t => t.id === taskId)?.title ?? 'Earlier trip memory'; }
