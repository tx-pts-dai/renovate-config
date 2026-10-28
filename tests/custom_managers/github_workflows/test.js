// Regression tests for the DND-IT/github-workflows custom manager.
//
// Run with: node tests/custom_managers/github_workflows/test.js
// Exits non-zero on the first failed assertion.
//
// The regex and templates under test are read straight out of
// github-workflows-per-workflow-tags.json5 so the tests exercise the real
// config and can't silently drift from it.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const configPath = path.resolve(
  __dirname,
  '../../../github-workflows-per-workflow-tags.json5',
);
const config = fs.readFileSync(configPath, 'utf8');

// Pull the first single-quoted literal off the config line matching `predicate`,
// then undo JSON5's backslash doubling so we get the value Renovate actually uses.
function quotedOn(predicate) {
  const line = config.split('\n').find((l) => predicate(l.trim()));
  assert.ok(line, `no config line matched ${predicate}`);
  const literal = line.match(/'([^']*)'/);
  assert.ok(literal, `no single-quoted value on line: ${line.trim()}`);
  return literal[1].replace(/\\\\/g, '\\');
}

const matchPattern = new RegExp(quotedOn((l) => l.startsWith("'uses:")));
const autoReplaceTpl = quotedOn((l) =>
  l.startsWith('autoReplaceStringTemplate:'),
);
const packageNameRule = quotedOn((l) => l.startsWith("matchPackageNames: ['/"));

// Minimal stand-in for Renovate's Handlebars rendering: `{{#if var}}a{{else}}b{{/if}}`
// blocks and `{{{var}}}` substitutions, which is all the template uses.
function render(template, vars) {
  const resolved = template.replace(
    /\{\{#if (\w+)\}\}(.*?)\{\{else\}\}(.*?)\{\{\/if\}\}/g,
    (_, key, then, otherwise) => (vars[key] ? then : otherwise),
  );
  return resolved.replace(/\{\{\{(\w+)\}\}\}/g, (_, key) => {
    assert.ok(key in vars && vars[key] !== undefined, `template referenced unknown var {{{${key}}}}`);
    return vars[key];
  });
}

// Turn Renovate's `/pattern/flags` string form into a RegExp.
function renovateRegex(value) {
  const parsed = value.match(/^\/(.*)\/([a-z]*)$/);
  assert.ok(parsed, `not a /regex/flags value: ${value}`);
  return new RegExp(parsed[1], parsed[2]);
}

const DIGEST = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'; // 40 hex chars
const NEW_DIGEST = '99887766554433221100ffeeddccbbaa00112233';

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL ${name}`);
    console.error(`       ${err.message}`);
  }
}

console.log('matchStrings pattern:');

check('matches canonical uppercase DND-IT', () => {
  const line = `      uses: DND-IT/github-workflows/.github/workflows/tf-plan.yaml@${DIGEST} # v4.1.2`;
  const m = matchPattern.exec(line);
  assert.ok(m, 'expected a match');
  assert.equal(m.groups.workflow, 'tf-plan');
  assert.equal(m.groups.ext, 'yaml');
  assert.equal(m.groups.currentDigest, DIGEST);
  assert.equal(m.groups.currentValue, 'v4.1.2');
});

check('matches lowercase dnd-it', () => {
  const line = `      uses: dnd-it/github-workflows/.github/workflows/gitops-image-tag.yaml@${DIGEST} # v3`;
  const m = matchPattern.exec(line);
  assert.ok(m, 'expected lowercase org to match');
  assert.equal(m.groups.workflow, 'gitops-image-tag');
  assert.equal(m.groups.currentValue, 'v3');
});

check('matches mixed-case org and preserves .yml extension', () => {
  const line = `      uses: Dnd-It/github-workflows/.github/workflows/docker-build-push-ecr.yml@${DIGEST} # v4`;
  const m = matchPattern.exec(line);
  assert.ok(m, 'expected mixed-case org to match');
  assert.equal(m.groups.ext, 'yml');
  assert.equal(m.groups.workflow, 'docker-build-push-ecr');
});

check('ignores a non-DND-IT action', () => {
  const line = `      uses: actions/checkout@${DIGEST} # v4`;
  assert.equal(matchPattern.exec(line), null);
});

check('matches a plain tag ref (no digest, no comment)', () => {
  const line = '      uses: dnd-it/github-workflows/.github/workflows/gitops-image-tag.yaml@v3';
  const m = matchPattern.exec(line);
  assert.ok(m, 'expected a plain tag ref to match');
  assert.equal(m.groups.workflow, 'gitops-image-tag');
  assert.equal(m.groups.currentDigest, undefined);
  assert.equal(m.groups.currentValue, 'v3');
});

check('matches a plain per-workflow tag ref', () => {
  const line = '      uses: DND-IT/github-workflows/.github/workflows/tf-plan.yaml@tf-plan-v0.1.0';
  const m = matchPattern.exec(line);
  assert.ok(m, 'expected a match');
  assert.equal(m.groups.currentValue, 'tf-plan-v0.1.0');
});

console.log('autoReplaceStringTemplate (casing normalization):');

check('rewrites a lowercase line to canonical DND-IT', () => {
  const line = `      uses: dnd-it/github-workflows/.github/workflows/gitops-image-tag.yaml@${DIGEST} # v3`;
  const m = matchPattern.exec(line);
  const rewritten = render(autoReplaceTpl, {
    workflow: m.groups.workflow,
    ext: m.groups.ext,
    newDigest: NEW_DIGEST,
    newValue: 'gitops-image-tag-v0.1.0',
  });
  assert.equal(
    rewritten,
    `uses: DND-IT/github-workflows/.github/workflows/gitops-image-tag.yaml@${NEW_DIGEST} # gitops-image-tag-v0.1.0`,
  );
  assert.ok(!rewritten.includes('dnd-it'), 'lowercase org should be gone');
});

check('preserves .yml extension when rewriting', () => {
  const line = `      uses: dnd-it/github-workflows/.github/workflows/tf-apply.yml@${DIGEST} # v4`;
  const m = matchPattern.exec(line);
  const rewritten = render(autoReplaceTpl, {
    workflow: m.groups.workflow,
    ext: m.groups.ext,
    newDigest: NEW_DIGEST,
    newValue: 'tf-apply-v0.1.0',
  });
  assert.ok(rewritten.includes('/tf-apply.yml@'), 'expected .yml to survive');
});

check('keeps a plain tag ref unpinned when rewriting', () => {
  const line = '      uses: dnd-it/github-workflows/.github/workflows/tf-plan.yaml@v3';
  const m = matchPattern.exec(line);
  const rewritten = render(autoReplaceTpl, {
    workflow: m.groups.workflow,
    ext: m.groups.ext,
    newDigest: undefined,
    newValue: 'tf-plan-v0.1.0',
  });
  assert.equal(
    rewritten,
    'uses: DND-IT/github-workflows/.github/workflows/tf-plan.yaml@tf-plan-v0.1.0',
  );
});

console.log('github-actions disable rule (matchPackageNames):');

check('disable rule matches both casings but not sub-workflows', () => {
  const re = renovateRegex(packageNameRule);
  assert.ok(re.test('DND-IT/github-workflows'), 'should match uppercase');
  assert.ok(re.test('dnd-it/github-workflows'), 'should match lowercase');
  assert.ok(
    !re.test('DND-IT/github-workflows/tf-plan'),
    'should not match a synthetic sub-workflow name',
  );
});

console.log('migration and lineage rules:');

check('migration targets the floating major tag, not a fixed release', () => {
  const line = config
    .split('\n')
    .find((l) => l.trim().startsWith('replacementVersionTemplate:'));
  assert.ok(line, 'no replacementVersionTemplate line');
  assert.match(line, /-v0",\s*$/);
});

check('lineage rule uses versioning that accepts partial tags like v0', () => {
  assert.equal(quotedOn((l) => l.startsWith('versioning:')), 'docker');
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}
console.log('\nAll tests passed');
