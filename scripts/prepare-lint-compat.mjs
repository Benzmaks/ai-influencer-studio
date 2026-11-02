import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const upstreamHash = 'd89e8ca7dda77bd9dc9efed6920b0ed09deb2f478ada54110980daa3080d3f9b';
// Keep the official v11 matching engine. Only restore the callable CommonJS
// export expected by the existing React/import/accessibility ESLint plugins.
const bridge =
  '\n// Studio legacy ESLint CommonJS export compatibility (minimatch 11.0.1).\nmodule.exports = Object.assign(exports.minimatch, exports);\n';

export function prepareMinimatch(entry = require.resolve('minimatch')) {
  const manifest = JSON.parse(readFileSync(resolve(entry, '../../../package.json'), 'utf8'));
  const current = readFileSync(entry, 'utf8');
  const upstream = current.endsWith(bridge) ? current.slice(0, -bridge.length) : current;
  if (
    manifest.version !== '11.0.1' ||
    createHash('sha256').update(upstream).digest('hex') !== upstreamHash
  ) {
    throw new Error(
      'Unexpected minimatch contents. Review the lint compatibility bridge before updating.',
    );
  }
  if (current === upstream) writeFileSync(entry, upstream + bridge);
}

export function prepareImportRule(
  entry = require.resolve('eslint-plugin-import/lib/rules/no-internal-modules.js'),
) {
  const originalHash = 'f36ab9b9b97cc2d8a49f8fe474c4200875db4fa357c5061fe71538b01db696a4';
  const current = readFileSync(entry, 'utf8');
  const original = current
    .replaceAll("new _minimatch2['default'].Minimatch(p)", "_minimatch2['default'].makeRe(p)")
    .replaceAll('return re.match(importPath);', 'return re.test(importPath);');
  if (createHash('sha256').update(original).digest('hex') !== originalHash) {
    throw new Error('Unexpected import lint rule. Review minimatch compatibility before updating.');
  }
  // v11 deliberately removed makeRe. Match through the patched engine instead
  // of reintroducing the legacy regular-expression implementation.
  const patched = original
    .replaceAll("_minimatch2['default'].makeRe(p)", "new _minimatch2['default'].Minimatch(p)")
    .replaceAll('return re.test(importPath);', 'return re.match(importPath);');
  if (current !== patched) writeFileSync(entry, patched);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let lintInstalled = true;
  try {
    require.resolve('eslint/package.json');
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    lintInstalled = false;
  }
  if (lintInstalled) {
    prepareMinimatch();
    prepareImportRule();
    console.log('Verified patched minimatch 11.0.1; legacy lint export compatibility ready.');
  } else {
    console.log('Development lint packages omitted; no lint compatibility changes needed.');
  }
}
