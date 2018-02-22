/* eslint-disable */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
const outputPath = path.join(__dirname, '..', 'dist');
const outputArtifact = path.join(outputPath, 'package.zip');
const handlerPath = path.join(outputPath, 'handler.js');
const assetsPath = path.join(outputPath, 'public');
const viewsPath = path.join(outputPath, 'views');

const output = fs.createWriteStream(outputArtifact);
const archive = archiver('zip', {
  zlib: { level: 9 }, // Sets the compression level.
});

archive.pipe(output);

archive.append(fs.readFileSync(handlerPath), { name: 'handler.js' });
archive.directory(nodeModulesPath, 'node_modules');
archive.directory(assetsPath, 'public');
archive.directory(viewsPath, 'views');

archive.finalize();

