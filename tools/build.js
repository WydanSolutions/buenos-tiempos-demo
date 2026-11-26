/* Empaqueta la demo en un único archivo HTML autocontenido (funciona sin internet).
   Uso:  node tools/build.js   →  dist/Buenos-Tiempos-Demo.html */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let html = read('index.html');
const safe = (js) => js.replace(/<\/script/gi, '<\/script');
// CSS
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => '<style>\n' + read(href) + '\n</style>');
// Librerías (en el <head>)
html = html.replace(/<!--VENDOR-->[\s\S]*?<!--\/VENDOR-->/, (block) => block.replace(/<script src="([^"]+)"( defer)?><\/script>/g, (_, src) => '<script>\n' + safe(read(src)) + '\n</script>'));
// Código de la app
html = html.replace(/<!--APP-->[\s\S]*?<!--\/APP-->/, (block) => '<script>\n' + block.match(/src="([^"]+)"/g).map((s) => '/* ' + s.slice(5, -1) + ' */\n' + safe(read(s.slice(5, -1)))).join('\n;\n') + '\n</script>');
html = html.replace('<!--VENDOR-->', '').replace('<!--/VENDOR-->', '');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'Buenos-Tiempos-Demo.html');
fs.writeFileSync(out, html);
console.log('OK →', path.relative(root, out), (fs.statSync(out).size / 1024 / 1024).toFixed(2) + ' MB');
