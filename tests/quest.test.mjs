import test from 'node:test';
import assert from 'node:assert/strict';
import { questsForPlayer, sharedQuestIds, questTasks } from '../data/quest.ts';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
test('all seven players receive five shared and four personal quests',()=>{
 for(const player of ['sourav','sanjay','rishi','ashwin','nirosha','deepa','harshith']) {
 const tasks=questsForPlayer(player);assert.equal(tasks.length,9);assert.equal(new Set(tasks.map(t=>t.id)).size,9);
 assert.equal(tasks.filter(t=>t.category==='Shared').length,5);
 assert.ok(sharedQuestIds.every(id=>tasks.some(t=>t.id===id)));
 }
 assert.equal(new Set(questTasks.map(t=>t.id)).size,questTasks.length);
});
test('photo slot allocation rejects fourth upload and reuses removed slot atomically',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE quest_completions (id TEXT PRIMARY KEY, task_id TEXT, player_id TEXT)');
 db.exec(readFileSync(new URL('../drizzle/0002_worried_the_fallen.sql',import.meta.url),'utf8'));
 db.exec("INSERT INTO quest_completions VALUES ('c','q','p')");
 const source=readFileSync(new URL('../lib/quest-storage.ts',import.meta.url),'utf8');
 const sql=source.match(/`(INSERT INTO quest_photos \(id,completion_id,position,object_key,thumbnail_key,file_name,content_type,byte_size,created_at\)[\s\S]*?)`/)[1];
 const add=(id)=>db.prepare(sql).run(id,id,null,'a.jpg','image/jpeg',20,'2026-10-23','q','p');
 add('a');add('b');add('c');assert.throws(()=>add('d'),/NOT NULL/);
 db.exec("DELETE FROM quest_photos WHERE id='b'");add('d');
 assert.deepEqual(db.prepare('SELECT position FROM quest_photos ORDER BY position').all().map(x=>x.position),[1,2,3]);
 db.close();
});
