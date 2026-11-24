/* eslint-disable */
const fs = require('node:fs');
const path = require('path');
const archiver = require('archiver');
const { finished } = require('stream/promises');

const outputPath = path.join(__dirname, '..', 'dist');
const outputArtifact = path.join(outputPath, 'package.zip');
const handlerPath = path.join(outputPath, 'handler.js');
const assetsPath = path.join(outputPath, 'public');
const viewsPath = path.join(outputPath, 'views');

async function createPackage() {
  const output = fs.createWriteStream(outputArtifact);
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  archive.on('warning', (err) => output.destroy(err));
  archive.on('error', (err) => output.destroy(err));
  archive.pipe(output);

  archive.file(handlerPath, { name: 'app.js' });
  archive.glob('*.js', { cwd: outputPath, ignore: ['app.js', 'handler.js'] });
  archive.directory(assetsPath, 'public');
  archive.directory(viewsPath, 'views');

  await Promise.all([archive.finalize(), finished(output)]);
}

createPackage().catch((err) => {
  console.error('Failed to create deployment package:', err.message);
  process.exitCode = 1;
});
