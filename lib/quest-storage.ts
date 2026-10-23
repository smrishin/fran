import { env } from "cloudflare:workers";
import type { QuestCompletion, QuestPhoto } from "../data/quest";
import { deleteObject, getObject, putObject } from "./object-storage";

type CompletionRow = { id: string; task_id: string; player_id: string; player_name: string; object_key: string; file_name: string; content_type: string; byte_size: number; completed_at: string };
type PhotoRow = { id: string; completion_id: string; position: number; object_key: string; thumbnail_key: string | null; file_name: string; content_type: string; byte_size: number; created_at: string };
function db() { const DB = (env as unknown as {DB: D1Database}).DB; if (!DB) throw new Error("Quest storage unavailable"); return DB; }
function publicPhoto(row: PhotoRow): QuestPhoto { return { id: row.id, position: row.position, photoUrl: `/api/quest/photos/${encodeURIComponent(row.id)}`, thumbnailUrl: `/api/quest/photos/${encodeURIComponent(row.id)}?thumbnail=1` }; }
function legacyPhoto(r: CompletionRow): PhotoRow { return {id:r.id, completion_id:r.id, position:1, object_key:r.object_key, thumbnail_key:null, file_name:r.file_name, content_type:r.content_type, byte_size:r.byte_size, created_at:r.completed_at}; }
async function completion(row: CompletionRow): Promise<QuestCompletion> {
 const rows = (await db().prepare('SELECT * FROM quest_photos WHERE completion_id = ? ORDER BY position').bind(row.id).all<PhotoRow>()).results;
 const photos = (rows.length ? rows : [legacyPhoto(row)]).map(publicPhoto);
 return {id:row.id, taskId:row.task_id, playerId:row.player_id, playerName:row.player_name, photoUrl:photos[0].photoUrl, thumbnailUrl:photos[0].thumbnailUrl, photos, completedAt:row.completed_at, updatedAt:rows.reduce((latest: string,p: PhotoRow)=>p.created_at>latest?p.created_at:latest,row.completed_at)};
}
export async function listQuestCompletions() { const rows = await db().prepare('SELECT * FROM quest_completions ORDER BY completed_at DESC, id DESC').all<CompletionRow>(); return Promise.all(rows.results.map(completion)); }
export async function getQuestPhoto(id:string, thumbnail=false) {
 const DB=db(); const photo=await DB.prepare('SELECT * FROM quest_photos WHERE id = ?').bind(id).first<PhotoRow>();
 const legacy=photo ? null : await DB.prepare('SELECT * FROM quest_completions WHERE id = ?').bind(id).first<CompletionRow>();
 const row=photo ?? (legacy ? legacyPhoto(legacy):null); if(!row) return null;
 const object=await getObject(thumbnail && row.thumbnail_key ? row.thumbnail_key : row.object_key); return object ? {object,row}:null;
}
async function find(taskId:string, playerId:string) { return db().prepare('SELECT * FROM quest_completions WHERE task_id = ? AND player_id = ?').bind(taskId,playerId).first<CompletionRow>(); }
// Existing one-photo records are materialized without changing their image or timestamp.
async function materialize(row:CompletionRow) {
 await db().prepare(`INSERT OR IGNORE INTO quest_photos (id,completion_id,position,object_key,file_name,content_type,byte_size,created_at)
 SELECT ?,?,1,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM quest_photos WHERE completion_id = ?)`)
 .bind(row.id,row.id,row.object_key,row.file_name,row.content_type,row.byte_size,row.completed_at,row.id).run();
}
async function cleanup(keys:(string|null)[]) { await Promise.all(keys.filter((k):k is string=>Boolean(k)).map(k=>deleteObject(k).catch((e: unknown)=>console.error('Quest object cleanup failed',k,e)))); }
export async function saveQuestProof(input:{taskId:string;playerId:string;playerName:string;file:File;uploadId:string;thumbnail?:File;replacePhotoId?:string}) {
 const DB=db(); const existing=await find(input.taskId,input.playerId); if(existing) await materialize(existing);
 if(existing) { const prior=await DB.prepare('SELECT id FROM quest_photos WHERE id=? AND completion_id=?').bind(input.uploadId,existing.id).first(); if(prior) return completion(existing); }
 const id=input.uploadId, completionId=existing?.id ?? crypto.randomUUID(), now=new Date().toISOString();
 const objectPrefix=`quest/${input.taskId}/${input.playerId}/${crypto.randomUUID()}`;
 const objectKey=`${objectPrefix}/original`, thumbnailKey=input.thumbnail ? `${objectPrefix}/thumbnail`:null;
 const old=input.replacePhotoId ? await DB.prepare('SELECT * FROM quest_photos WHERE id = ? AND completion_id = ?').bind(input.replacePhotoId,completionId).first<PhotoRow>():null;
 if(input.replacePhotoId && !old) throw new Error('PHOTO_NOT_FOUND');
 try {
 await putObject(objectKey,input.file.stream(),{httpMetadata:{contentType:input.file.type}});
 if(thumbnailKey && input.thumbnail) await putObject(thumbnailKey,input.thumbnail.stream(),{httpMetadata:{contentType:input.thumbnail.type}});
 const statements=[];
 statements.push(DB.prepare(`INSERT OR IGNORE INTO quest_completions (id,task_id,player_id,player_name,object_key,file_name,content_type,byte_size,completed_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(completionId,input.taskId,input.playerId,input.playerName,objectKey,input.file.name,input.file.type,input.file.size,now));
 if(old) {
 statements.push(DB.prepare(`UPDATE quest_photos SET id=?,object_key=?,thumbnail_key=?,file_name=?,content_type=?,byte_size=?,created_at=? WHERE id=? AND completion_id=?`).bind(id,objectKey,thumbnailKey,input.file.name,input.file.type,input.file.size,now,old.id,completionId));
 } else {
 statements.push(DB.prepare(`INSERT INTO quest_photos (id,completion_id,position,object_key,thumbnail_key,file_name,content_type,byte_size,created_at)
 SELECT ?, c.id, (SELECT MIN(slot) FROM (SELECT 1 AS slot UNION ALL SELECT 2 UNION ALL SELECT 3) WHERE slot NOT IN (SELECT position FROM quest_photos WHERE completion_id=c.id)), ?,?,?,?,?,?
 FROM quest_completions c WHERE task_id=? AND player_id=?`).bind(id,objectKey,thumbnailKey,input.file.name,input.file.type,input.file.size,now,input.taskId,input.playerId));
 }
 const results=await DB.batch(statements);
 if(old && results[1].meta.changes!==1) throw new Error('PHOTO_NOT_FOUND');
 } catch(error) { await cleanup([objectKey,thumbnailKey]); if(String(error).includes('NOT NULL constraint failed: quest_photos.position')) throw new Error('PHOTO_LIMIT'); throw error; }
 if(old) await cleanup([old.object_key,old.thumbnail_key]);
 const saved=await find(input.taskId,input.playerId); if(!saved) throw new Error('PHOTO_NOT_FOUND'); return completion(saved);
}
export async function removeQuestPhoto(taskId:string,playerId:string,photoId:string) {
 const DB=db();const row=await find(taskId,playerId);if(!row) throw new Error('PHOTO_NOT_FOUND'); await materialize(row);
 const photo=await DB.prepare('SELECT * FROM quest_photos WHERE id=? AND completion_id=?').bind(photoId,row.id).first<PhotoRow>(); if(!photo) throw new Error('PHOTO_NOT_FOUND');
 await DB.batch([DB.prepare('DELETE FROM quest_photos WHERE id=? AND completion_id=?').bind(photoId,row.id), DB.prepare('DELETE FROM quest_completions WHERE id=? AND NOT EXISTS (SELECT 1 FROM quest_photos WHERE completion_id=?)').bind(row.id,row.id)]);
 await cleanup([photo.object_key,photo.thumbnail_key]);const remaining=await find(taskId,playerId); return remaining ? completion(remaining):null;
}
