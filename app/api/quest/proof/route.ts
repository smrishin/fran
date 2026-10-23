import { questsForPlayer } from "../../../../data/quest";
import { guests } from "../../../../data/trip";
import { ACCESS_COOKIE_NAME, readCookie, verifyAccessToken } from "../../../../lib/access";
const MAX_PHOTO_BYTES=10*1024*1024;
async function authorized(request:Request) { return verifyAccessToken(readCookie(request.headers.get('cookie'),ACCESS_COOKIE_NAME)); }
function failure(error:unknown) {
 const message=error instanceof Error ? error.message:'';
 if(message==='PHOTO_LIMIT') return Response.json({error:'This challenge already has three photos. Replace or remove one first.'},{status:409});
 if(message==='PHOTO_NOT_FOUND') return Response.json({error:'This photo has changed. Refresh and try again.'},{status:404});
 console.error('Quest photo operation failed',error);return Response.json({error:'The photo could not be saved. Please try again.'},{status:503});
}
export async function POST(request:Request) {
 if(!await authorized(request)) return Response.json({error:'Campfire Code required.'},{status:401});
 try {
 const form=await request.formData();const taskId=String(form.get('taskId')??''),playerId=String(form.get('playerId')??'');
 const player=guests.find(g=>g.id===playerId);if(!player || !questsForPlayer(playerId).some(t=>t.id===taskId)) return Response.json({error:'Choose a challenge assigned to this player.'},{status:400});
 const uploadId=String(form.get('uploadId')??'');
 if(!/^[0-9a-f-]{36}$/i.test(uploadId)) return Response.json({error:'Invalid upload identifier.'},{status:400});
 const photo=form.get('photo'),thumbnail=form.get('thumbnail');
 if(!(photo instanceof File)||!['image/jpeg','image/png','image/webp','image/heic','image/heif','image/avif','image/gif'].includes(photo.type)) return Response.json({error:'Choose a supported photo image.'},{status:400});
 if(!photo.size||photo.size>MAX_PHOTO_BYTES) return Response.json({error:'Photos must be under 10 MB.'},{status:413});
 if(thumbnail && (!(thumbnail instanceof File)||thumbnail.type!=='image/jpeg'||thumbnail.size>1024*1024)) return Response.json({error:'Invalid photo thumbnail.'},{status:400});
 const {saveQuestProof}=await import('../../../../lib/quest-storage');
 const completion=await saveQuestProof({taskId,playerId,playerName:player.name,file:photo,uploadId,thumbnail:thumbnail instanceof File?thumbnail:undefined,replacePhotoId:String(form.get('replacePhotoId')??'')||undefined});
 return Response.json({completion},{status:201});
 }catch(error){return failure(error);}
}
export async function DELETE(request:Request) {
 if(!await authorized(request)) return Response.json({error:'Campfire Code required.'},{status:401});
 try {
 const {taskId,playerId,photoId}=await request.json() as Record<string,string>;
 if(!guests.some(g=>g.id===playerId)||typeof taskId!=='string'||typeof photoId!=='string') return Response.json({error:'Choose a valid player and assigned challenge.'},{status:400});
 const {removeQuestPhoto}=await import('../../../../lib/quest-storage');return Response.json({completion:await removeQuestPhoto(taskId,playerId,photoId)});
 }catch(error){return failure(error);}
}
