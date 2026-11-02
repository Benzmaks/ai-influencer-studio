import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';
import { prepareImportRule, prepareMinimatch } from '../../scripts/prepare-lint-compat.mjs';

const require = createRequire(import.meta.url);

describe('patched dependency compatibility and security', () => {
  it('merges cyclic configuration without exhausting the stack', () => {
    const { deepmerge } = require('deepmerge-ts');
    const first: { value: number; self?: unknown } = { value: 1 };
    const second: { value: number; self?: unknown } = { value: 2 };
    first.self = first;
    second.self = second;
    const merged = deepmerge(first, second);
    expect(merged.value).toBe(2);
    expect(merged.self).toBe(merged);
    expect(deepmerge({ nested: { keep: true } }, { nested: { added: 42 } })).toEqual({
      nested: { keep: true, added: 42 },
    });
  });

  it('preserves CommonJS and named glob APIs, globstars, braces and dotfile rules', () => {
    const glob = require('minimatch');
    expect(typeof glob).toBe('function');
    expect(glob.minimatch).toBe(glob);
    expect(glob('components/editor.tsx', '**/*.{ts,tsx}')).toBe(true);
    expect(glob('.env', '*')).toBe(false);
    expect(glob('.env', '*', { dot: true })).toBe(true);
    expect(new glob.Minimatch('**/node_modules/**').match('app/node_modules/file.js')).toBe(true);
    expect(glob.match(['a.ts', 'b.js'], '*.ts')).toEqual(['a.ts']);
  });

  it('reapplies compatibility safely and rejects unexpected dependency contents', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'studio-lint-compat-'));
    try {
      mkdirSync(join(temporary, 'dist/commonjs'), { recursive: true });
      writeFileSync(join(temporary, 'package.json'), JSON.stringify({ version: '11.0.1' }));
      const entry = join(temporary, 'dist/commonjs/index.js');
      const installed = readFileSync(require.resolve('minimatch'), 'utf8');
      // Exercise a fresh official file, then the already-patched file.
      writeFileSync(entry, installed.slice(0, installed.indexOf('\n// Studio legacy ESLint')));
      prepareMinimatch(entry);
      expect(readFileSync(entry, 'utf8')).toBe(installed);
      prepareMinimatch(entry);
      expect(readFileSync(entry, 'utf8')).toBe(installed);
      writeFileSync(entry, installed + '\n// unexpected change');
      expect(() => prepareMinimatch(entry)).toThrow('Unexpected minimatch');
      const rule = join(temporary, 'rule.js');
      const installedRule = readFileSync(
        require.resolve('eslint-plugin-import/lib/rules/no-internal-modules.js'),
        'utf8',
      );
      writeFileSync(
        rule,
        installedRule
          .replaceAll("new _minimatch2['default'].Minimatch(p)", "_minimatch2['default'].makeRe(p)")
          .replaceAll('return re.match(importPath);', 'return re.test(importPath);'),
      );
      prepareImportRule(rule);
      prepareImportRule(rule);
      expect(readFileSync(rule, 'utf8')).toBe(installedRule);
      writeFileSync(rule, installedRule + '\n// unexpected change');
      expect(() => prepareImportRule(rule)).toThrow('Unexpected import lint rule');
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it('keeps React, accessibility and import rules working with patched glob matching', async () => {
    const eslint = new ESLint({
      overrideConfig: {
        rules: {
          'react/forbid-component-props': [
            'error',
            { forbid: [{ propNamePattern: 'danger*', disallowedForPatterns: ['Widget*'] }] },
          ],
          'jsx-a11y/control-has-associated-label': [
            'error',
            { controlComponents: ['WidgetInput'] },
          ],
          'import/no-internal-modules': ['error', { forbid: ['forbidden/**'] }],
        },
      },
    });
    const [result] = await eslint.lintText(
      'import item from "forbidden/internal"; export default function Probe() { return <WidgetInput dangerous="yes" />; }',
      { filePath: 'components/security-lint-probe.tsx' },
    );
    const rules = result.messages.map((message) => message.ruleId);
    expect(rules).toContain('react/forbid-component-props');
    expect(rules).toContain('jsx-a11y/control-has-associated-label');
    expect(rules).toContain('import/no-internal-modules');
    const [allowed] = await eslint.lintText(
      'import item from "allowed/internal"; export default function Probe() { return <WidgetInput aria-label="Name" />; }',
      { filePath: 'components/security-lint-probe.tsx' },
    );
    expect(allowed.messages.map((message) => message.ruleId)).not.toContain(
      'import/no-internal-modules',
    );
    expect(allowed.messages.map((message) => message.ruleId)).not.toContain(
      'jsx-a11y/control-has-associated-label',
    );
  });
});
