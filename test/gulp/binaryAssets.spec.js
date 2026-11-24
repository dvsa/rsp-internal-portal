import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect } from 'chai';

describe('Gulp binary assets', function () {
  this.timeout(15000);

  it('copies images, fonts, miscellaneous files and GOV.UK assets without changing bytes', () => {
    const root = path.resolve(__dirname, '../..');
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'rsp-assets-'));
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0xff, 0xfe, 0x81]);
    const assets = [
      ['img/example.png', 'images/example.png'],
      ['fonts/example.woff', 'fonts/example.woff'],
      ['misc/example.bin', 'misc/example.bin'],
      ['govuk/example.png', 'govuk/example.png'],
    ];

    try {
      fs.symlinkSync(path.join(root, 'gulp'), path.join(workspace, 'gulp'), 'dir');
      assets.forEach(([source]) => {
        const target = path.join(workspace, 'src/public', source);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, bytes);
      });

      execFileSync(process.execPath, [
        path.join(path.dirname(require.resolve('gulp')), 'bin/gulp.js'),
        '--gulpfile', path.join(root, 'gulpfile.cjs'),
        '--cwd', workspace,
        'copy-images', 'copy-fonts', 'copy-misc', 'govuk-elements',
      ], { cwd: workspace, env: { ...process.env, NODE_ENV: 'development' }, stdio: 'pipe' });

      assets.forEach(([, output]) => {
        expect(fs.readFileSync(path.join(workspace, 'build/public', output))).to.deep.equal(bytes);
      });
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
