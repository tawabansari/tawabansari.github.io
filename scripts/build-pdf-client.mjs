import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const site = process.argv[2] || '_site';
await mkdir(path.join(site,'assets/js'),{recursive:true});
await build({entryPoints:{'pdf-browser':'services/pdf/browser-entry.mjs','pdf-browser.worker':'services/pdf/browser-worker.mjs'},
  bundle:true,format:'esm',platform:'browser',target:['es2022'],outdir:path.join(site,'assets/js'),outExtension:{'.js':'.mjs'},
  minify:true,legalComments:'linked',define:{'process.env.NODE_ENV':'"production"'}});
const {pages} = JSON.parse(await readFile(path.join(site,'assets/data/library.json'),'utf8'));
await writeFile(path.join(site,'assets/data/pdf-catalog.json'),JSON.stringify({pages:pages.filter(p=>['Articles','Terminology','Roots','Quran'].includes(p.kind))
  .map(({url,title,lang,kind,anchors})=>({url,title,lang,kind,anchors}))}));
console.log('Built lazy browser PDF fallback and published-content catalog.');
