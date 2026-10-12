import http from 'node:http';
import {readFile} from 'node:fs/promises';
const pages = new Map([['/', 'rig-to-show.html'], ['/index.html', 'index.html'], ['/magicq-test.html', 'magicq-test.html'], ['/storm-group-builder.html', 'storm-group-builder.html'], ['/storm-groups.html', 'storm-groups.html'], ['/storm-show-builder.html', 'storm-show-builder.html'], ['/storm-effects-builder.html', 'storm-effects-builder.html'], ['/storm-combined-builder.html', 'storm-combined-builder.html'], ['/storm-editable-builder.html', 'storm-editable-builder.html'], ['/upgrade-builder.html', 'upgrade-builder.html'], ['/rig-to-show.html', 'rig-to-show.html']]);
http.createServer(async (req,res)=>{
  if(!pages.has(req.url)){res.writeHead(404);res.end('Not found');return;}
  try{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(new URL('./public/' + pages.get(req.url), import.meta.url)));}
  catch{res.writeHead(500);res.end('Could not load planner');}
}).listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log('Show planner listening on port '+(process.env.PORT || 3000)));
