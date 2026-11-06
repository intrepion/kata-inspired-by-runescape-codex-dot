import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>readFile(new URL('../public/'+path,import.meta.url));
test('Arcade has two real gameplay captures with complete, matching local provenance',async()=>{
 const manifest=JSON.parse(await read('arcade/manifest.json'));
 assert.equal(manifest.schemaVersion,3);
 assert.equal(manifest.gameId,'kata-inspired-by-runescape-codex-dot');
 assert.equal(manifest.playUrl,'https://intrepion.github.io/kata-inspired-by-runescape-codex-dot/');
 assert.ok(manifest.screenshots.length>=2,'Do not publish an empty gameplay gallery');
 const seen=new Set();
 for(const image of manifest.screenshots){
  assert.match(image.path,/^arcade\/screenshots\/[a-z0-9-]+\.jpg$/);
  assert.ok(!seen.has(image.path));seen.add(image.path);assert.ok(image.alt.trim());
  const bytes=await read(image.path);assert.equal(bytes.subarray(0,2).toString('hex'),'ffd8');assert.equal(digest(bytes),image.sha256);
  const p=image.provenance;assert.equal(p.kind,'local_gameplay_capture');assert.match(p.captureCommit,/^[a-f0-9]{40}$/);
  assert.match(p.sourcePath,/^arcade\/capture-evidence\/[a-z0-9-]+\.png$/);
  const original=await read(p.sourcePath);assert.equal(original.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(digest(original),p.sourceSha256);
  assert.match(p.captureRecordPath,/^arcade\/capture-evidence\/[a-z0-9-]+\.json$/);
  const raw=await read(p.captureRecordPath);assert.equal(digest(raw),p.captureRecordSha256);
  const record=JSON.parse(raw);assert.equal(record.sourceCommit,p.captureCommit);assert.deepEqual(record.inputs,p.inputHashes);assert.equal(record.capturedAt,p.capturedAt);assert.ok(!Number.isNaN(Date.parse(p.capturedAt)));
  assert.ok(Object.keys(p.inputHashes).includes('index.html'));
  for(const [path,hash] of Object.entries(p.inputHashes)){assert.ok(!path.includes('..')&&!path.startsWith('/'));assert.match(hash,/^[a-f0-9]{64}$/);}
  assert.match(record.baseUrl,/^http:\/\/127\.0\.0\.1:\d+\/$/);assert.equal(record.tool.name,'Playwright');assert.equal(record.tool.version,'1.63.0');assert.ok(record.browser.version);assert.ok(record.steps.length>=4);assert.equal(record.deployedBuild,null);assert.equal(p.workflowRunId,undefined);
 }
});
