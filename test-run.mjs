import fs from 'fs';
import path from 'path';
// read index.html
const indexHtml = fs.readFileSync('dist/index.html', 'utf-8');
console.log(indexHtml);
