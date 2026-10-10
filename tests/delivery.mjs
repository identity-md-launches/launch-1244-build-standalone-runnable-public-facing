import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, lstat, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Read Git's candidate file list only; never stage, commit or modify Git metadata.
const git = (...args) => execFileSync('git', args, { env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).toString();
const manifestPath = 'artifacts/delivery-manifest.json';
const paths = [...new Set(git('ls-files', '-co', '--exclude-standard', '-z').split('\0').filter(Boolean))]
  .filter(name => name !== manifestPath).sort();
const budgets = { source: 524288, public: 131072, dist: 524288, artifacts: 6291456 };
const sizes = { source: 0, public: 0, dist: 0, artifacts: 0 };
const files = [];
for (const name of paths) {
  assert.ok(!/(^|\/)(node_modules|\.npm|\.cache|\.vite|\.git|\.github)(\/|$)|(^|\/)\.env($|\.)|\.tgz$/.test(name), `Forbidden submission path: ${name}`);
  assert.ok(!name.startsWith('test/scratch/') && !name.startsWith('.imd/'), `Disposable input in submission: ${name}`);
  const info = await lstat(name);
  assert.ok(info.isFile() && !info.isSymbolicLink(), `Non-regular file: ${name}`);
  const body = await readFile(name);
  const bucket = ['public', 'dist', 'artifacts'].find(group => name.startsWith(group + '/')) || 'source';
  sizes[bucket] += body.length;
  files.push({ path: name, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') });
}
for (const required of ['dist/index.html', 'package-lock.json', 'README.md', 'DESIGN.md', 'artifacts/desktop.png', 'artifacts/mobile.png']) {
  assert.ok(paths.includes(required), `Missing or ignored deliverable: ${required}`);
}
const baseBytes = Object.values(sizes).reduce((a, b) => a + b, 0);
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  startingCommit: git('rev-parse', 'HEAD').trim(),
  repositoryUrl: git('remote', '-v').match(/^\S+\s+(\S+)\s+\(fetch\)/m)?.[1] || null,
  deliveryCommit: null,
  publicPreviewUrl: null,
  ipfsUrl: null,
  note: 'Git metadata was read only. No deployment or new commit is asserted. Files exclude this self-describing manifest; totals include it. Raw payload is a conservative size check, not the not-yet-created submission Git bundle.',
  limitBytes: 8388608,
  reservedPackagingBytes: 917504,
  pathBudgetsBytes: budgets,
  bytesByGroup: { ...sizes },
  totalPayloadBytes: baseBytes,
  files,
};
// Resolve the small self-size contribution to the artifact/total counters.
let serialized;
for (let i = 0; i < 8; i++) {
  serialized = JSON.stringify(manifest, null, 2) + '\n';
  const length = Buffer.byteLength(serialized);
  if (manifest.totalPayloadBytes === baseBytes + length) break;
  manifest.totalPayloadBytes = baseBytes + length;
  manifest.bytesByGroup.artifacts = sizes.artifacts + length;
}
await mkdir('artifacts', { recursive: true });
await writeFile(manifestPath, serialized);
for (const bucket of Object.keys(budgets)) assert.ok(manifest.bytesByGroup[bucket] <= budgets[bucket], `${bucket} exceeds its explicit path budget`);
assert.ok(manifest.totalPayloadBytes + manifest.reservedPackagingBytes <= manifest.limitBytes, 'Insufficient submission packaging headroom');
await mkdir('test/scratch', { recursive: true });
await writeFile('test/scratch/delivery-files.list', [...paths, manifestPath].join('\0') + '\0');
execFileSync('tar', ['-czf', 'test/scratch/submission-files.tar.gz', '--null', '--verbatim-files-from', '-T', 'test/scratch/delivery-files.list']);
const archive = await lstat('test/scratch/submission-files.tar.gz');
console.log(JSON.stringify({ files: paths.length + 1, payloadBytes: manifest.totalPayloadBytes, compressedReviewArchiveBytes: archive.size, limitBytes: manifest.limitBytes, bytesByGroup: manifest.bytesByGroup, remainingAfterReservedOverhead: manifest.limitBytes - manifest.totalPayloadBytes - manifest.reservedPackagingBytes }, null, 2));
