import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
import { chromium } from 'playwright';
export async function launch(viewport={width:1440,height:1000}){
 const root=resolve('dist');
 const server=createServer(async(req,res)=>{try{let path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(path!==root&&!path.startsWith(root+sep))throw Error('Path');if(path===root)path=resolve(root,'index.html');const bytes=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const baseUrl=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch();
 const context=await browser.newContext({viewport,deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 return{server,baseUrl,browser,context,page,errors,close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
