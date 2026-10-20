import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {CHAINS} from './chains.mjs';
import {poll,COIN,HANDLERS} from './keeper.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const pub=path.join(root,'public');const port=Number(process.env.PORT||3000);
const dataDir=path.join(root,'data');fs.mkdirSync(dataDir,{recursive:true});
const dbFile=path.join(dataDir,'state.json');let db={policies:[],auctions:[],bids:[],transactions:[]};
try{db={...db,...JSON.parse(fs.readFileSync(dbFile,'utf8'))}}catch{}
const save=()=>{const tmp=dbFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2));fs.renameSync(tmp,dbFile)};
const send=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
const addr=s=>typeof s==='string'&&/^0x[a-fA-F0-9]{40}$/.test(s);
const hex=s=>typeof s==='string'&&/^0x[a-fA-F0-9]{64}$/.test(s);
const limited=(s,n=120)=>typeof s==='string'&&s.length>0&&s.length<=n;
const nonceMap=new Map();const sessionMap=new Map();
const readBody=async req=>{let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>16384)throw Error('Request too large');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString()||'{}')};
const authorized=req=>{const bearer=(req.headers.authorization||'').match(/^Bearer ([a-f0-9]{64})$/);const session=bearer&&sessionMap.get(bearer[1]);return session&&session.expires>Date.now()?session.address:null};
const envTokens=(()=>{try{return JSON.parse(process.env.TOKENS_JSON||'{}')}catch{return {}}})();const defChain=Number(process.env.CHAIN_ID||11155111);
const keyed=Object.keys(envTokens).length>0&&Object.keys(envTokens).every(k=>/^\d+$/.test(k));
const config={chainId:defChain,chains:CHAINS.map(c=>({...c,aavePool:(c.id===defChain&&process.env.AAVE_POOL)||c.aavePool,tokens:keyed?(envTokens[c.id]||{}):(c.id===defChain?envTokens:{})})),swapEnabled:!!process.env.ZEROX_API_KEY,tokenFactory:process.env.TOKEN_FACTORY||''};
const NEXT=['waiting','ready'];let lastTick=0;
const handler=async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const pathname=url.pathname;
if(pathname==='/api/health')return send(res,200,{ok:true,service:'ZEROTH',database:'JSON local',chainId:config.chainId});
if(pathname==='/api/config')return send(res,200,config);
if(pathname==='/api/auth/nonce'&&req.method==='POST'){const b=await readBody(req);if(!addr(b.address))return send(res,400,{error:'Invalid wallet'});const nonce=crypto.randomBytes(16).toString('hex');const message=`ZEROTH sign-in\nAddress: ${b.address.toLowerCase()}\nNonce: ${nonce}\nThis signature authenticates your session and does not authorize a transaction.`;nonceMap.set(b.address.toLowerCase(),{message,expires:Date.now()+300000});return send(res,200,{message})}
if(pathname==='/api/auth/verify'&&req.method==='POST'){const b=await readBody(req);const record=nonceMap.get(String(b.address||'').toLowerCase());if(!record||record.expires<Date.now())return send(res,401,{error:'Nonce expired'});nonceMap.delete(b.address.toLowerCase());if(!/^0x[0-9a-fA-F]{130}$/.test(b.signature||''))return send(res,400,{error:'Invalid signature'});const {verifyMessage}=await import('ethers');if(verifyMessage(record.message,b.signature).toLowerCase()!==b.address.toLowerCase())return send(res,401,{error:'Signature mismatch'});const token=crypto.randomBytes(32).toString('hex');sessionMap.set(token,{address:b.address.toLowerCase(),expires:Date.now()+86400000});return send(res,200,{token,address:b.address.toLowerCase()})}
if(pathname==='/api/portfolio'&&req.method==='GET'){return send(res,200,{message:'Read on-chain balances through the connected wallet; no synthetic holdings are returned.',positions:[]})}
if(pathname==='/api/markets'&&req.method==='GET'){return send(res,200,{source:'No market indexer configured',markets:[]})}
if(pathname==='/api/swap/quote'&&req.method==='GET'){
 if(!process.env.ZEROX_API_KEY)return send(res,503,{error:'Swap service not configured'});
 const p=url.searchParams;const chainId=Number(p.get('chainId'));const ch=config.chains.find(c=>c.id===chainId);if(!ch||!ch.swap)return send(res,400,{error:'Swaps are not available on this chain'});
 if(!addr(p.get('sellToken'))||!addr(p.get('buyToken'))||!addr(p.get('taker'))||!/^\d{1,78}$/.test(p.get('sellAmount')||''))return send(res,400,{error:'Invalid swap parameters'});
 const q=new URLSearchParams({chainId:String(chainId),sellToken:p.get('sellToken'),buyToken:p.get('buyToken'),taker:p.get('taker'),sellAmount:p.get('sellAmount')});
 const upstream=await fetch('https://api.0x.org/swap/allowance-holder/quote?'+q,{headers:{'0x-api-key':process.env.ZEROX_API_KEY,'0x-version':'v2'},signal:AbortSignal.timeout(12000)});const json=await upstream.json();return send(res,upstream.ok?200:502,upstream.ok?json:{error:json.reason||json.message||'Quote provider unavailable'});
}
const symOk=x=>/^[A-Za-z0-9]{2,12}$/.test(x||'');
if(pathname==='/api/policies'&&req.method==='GET'){const user=authorized(req);if(!user)return send(res,401,{error:'Sign in with wallet'});return send(res,200,{policies:db.policies.filter(x=>x.owner===user),keeper:{lastTick,intervalSec:30}})}
if(pathname==='/api/policies'&&req.method==='POST'){const user=authorized(req);if(!user)return send(res,401,{error:'Sign in with wallet'});const b=await readBody(req);const ch=config.chains.find(c=>c.id===Number(b.chainId));const now=Date.now();
 const strike=Number(b.strike),parts=Number(b.parts||1),intervalMin=Number(b.intervalMin||0),hours=Number(b.validHours||48),start=Number(b.startTime||now);
 if(!HANDLERS.includes(b.handler)||!ch||!ch.cow||!symOk(b.sellToken)||!symOk(b.buyToken)||!/^\d{1,18}(\.\d{1,18})?$/.test(String(b.sellAmount))||!(Number(b.sellAmount)>0)||!(hours>=1&&hours<=720))return send(res,400,{error:'Invalid policy'});
 if(['stop-loss','take-profit'].includes(b.handler)&&!(strike>0&&Number.isFinite(strike)&&COIN[b.sellToken.toUpperCase()]))return send(res,400,{error:'Trigger price needs a supported sell asset (ETH, WBTC, SOL, LINK, AAVE, stETH)'});
 if(b.handler==='twap'&&!(Number.isInteger(parts)&&parts>=2&&parts<=24&&intervalMin>=5&&intervalMin<=1440))return send(res,400,{error:'TWAP needs 2-24 parts and a 5-1440 minute interval'});
 if(!Number.isFinite(start))return send(res,400,{error:'Invalid start time'});
 const p={id:crypto.randomUUID(),owner:user,handler:b.handler,chainId:ch.id,sellToken:b.sellToken.toUpperCase(),buyToken:b.buyToken.toUpperCase(),sellAmount:String(b.sellAmount),strike:strike>0?strike:null,startTime:start,parts:b.handler==='twap'?parts:1,intervalMin,partsDone:0,nextAt:start,validUntil:now+hours*3600000,status:'waiting',poll:null,orders:[],createdAt:new Date().toISOString(),mode:'keeper watches; you sign each discrete order; settled by CoW Protocol'};
 db.policies.push(p);save();return send(res,201,p)}
if(/^\/api\/policies\/[^/]+\/executed$/.test(pathname)&&req.method==='POST'){const user=authorized(req);if(!user)return send(res,401,{error:'Sign in with wallet'});const p=db.policies.find(x=>x.id===pathname.split('/')[3]&&x.owner===user);if(!p)return send(res,404,{error:'Not found'});const b=await readBody(req);if(p.status!=='ready'||!/^0x[a-fA-F0-9]{112}$/.test(b.orderUid||''))return send(res,400,{error:'Policy is not ready or order id invalid'});
 p.orders.push({uid:b.orderUid,at:new Date().toISOString()});p.partsDone++;if(p.handler==='twap'&&p.partsDone<p.parts){p.nextAt=Date.now()+p.intervalMin*60000;p.status='waiting'}else p.status='completed';p.poll=poll(p,null);save();return send(res,200,p)}
if(pathname.startsWith('/api/policies/')&&req.method==='DELETE'){const user=authorized(req);if(!user)return send(res,401,{error:'Sign in with wallet'});const p=db.policies.find(x=>x.id===pathname.split('/')[3]&&x.owner===user);if(!p)return send(res,404,{error:'Not found'});p.status='cancelled';p.poll=poll(p,null);save();return send(res,200,{ok:true})}
if(pathname==='/api/auctions'&&req.method==='GET')return send(res,200,{auctions:db.auctions.map(a=>({...a,bids:db.bids.filter(b=>b.auctionId===a.id).length}))});
if(pathname==='/api/auctions'&&req.method==='POST'){const user=authorized(req);if(!user)return send(res,401,{error:'Sign in with wallet'});const b=await readBody(req);if(!addr(b.asset)||!/^\d{1,78}$/.test(String(b.amount||''))||BigInt(b.amount)<=0n||!(Number(b.maxApr)>=0&&Number(b.maxApr)<=100))return send(res,400,{error:'Invalid auction'});const a={id:crypto.randomUUID(),owner:user,asset:b.asset,amount:String(b.amount),maxApr:Number(b.maxApr),createdAt:new Date().toISOString(),mode:'off-chain indicative auction; no funds escrowed'};db.auctions.push(a);save();return send(res,201,a)}
if(/^\/api\/auctions\/[^/]+\/bids$/.test(pathname)&&req.method==='POST'){const user=authorized(req);if(!user)return send(res,401,{error:'Sign in with wallet'});const id=pathname.split('/')[3];const a=db.auctions.find(x=>x.id===id);if(!a)return send(res,404,{error:'Auction not found'});const b=await readBody(req);if(!(Number(b.apr)>=0&&Number(b.apr)<=a.maxApr))return send(res,400,{error:'APR outside permitted range'});const bid={id:crypto.randomUUID(),auctionId:id,owner:user,apr:Number(b.apr),createdAt:new Date().toISOString(),mode:'indicative only'};db.bids.push(bid);save();return send(res,201,bid)}
if(pathname==='/api/transactions'&&req.method==='GET'){const user=authorized(req);if(!user)return send(res,401,{error:'Sign in with wallet'});return send(res,200,{transactions:db.transactions.filter(x=>x.owner===user)})}
if(pathname==='/api/transactions'&&req.method==='POST'){const user=authorized(req);if(!user)return send(res,401,{error:'Sign in with wallet'});const b=await readBody(req);if(!hex(b.hash)||!limited(b.kind,40))return send(res,400,{error:'Invalid transaction'});const t={owner:user,hash:b.hash,kind:b.kind,createdAt:new Date().toISOString(),verification:'submitted by wallet; verify on explorer'};if(!db.transactions.some(x=>x.owner===user&&x.hash===t.hash))db.transactions.push(t);save();return send(res,201,t)}
const cache=new Map();const cg=async(p,ttl=60000)=>{const h=cache.get(p);if(h&&h.t>Date.now())return h.d;const r=await fetch('https://api.coingecko.com/api/v3'+p,{headers:{accept:'application/json',...(process.env.COINGECKO_API_KEY?{'x-cg-demo-api-key':process.env.COINGECKO_API_KEY}:{})},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Price provider returned '+r.status);const d=await r.json();cache.set(p,{d,t:Date.now()+ttl});return d};
if(pathname==='/api/prices'){try{return send(res,200,await cg('/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,chainlink,aave,usd-coin,dai,lido-staked-ether&sparkline=true&price_change_percentage=24h,7d'))}catch(e){return send(res,502,{error:e.message||'Price provider unavailable'})}}
if(pathname==='/api/chart'){const id=url.searchParams.get('id'),days=url.searchParams.get('days');if(!/^[a-z0-9-]{1,40}$/.test(id||'')||!['1','7','30','90','365'].includes(days))return send(res,400,{error:'Invalid chart request'});try{return send(res,200,await cg(`/coins/${id}/market_chart?vs_currency=usd&days=${days}`,120000))}catch(e){return send(res,502,{error:e.message||'Price provider unavailable'})}}
if(pathname.startsWith('/api/'))return send(res,404,{error:'Unknown API route'});
let file=pathname==='/'?'/landing.html':pathname==='/app'?'/index.html':pathname;const absolute=path.resolve(pub,'.'+file);if(!absolute.startsWith(pub+path.sep))return send(res,403,{error:'Forbidden'});const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml'};const stat=fs.statSync(absolute);if(!stat.isFile())throw Error('Not file');res.writeHead(200,{'Content-Type':types[path.extname(absolute)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Security-Policy':"frame-ancestors 'none'"});fs.createReadStream(absolute).pipe(res)
}catch(e){send(res,e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'Not found':e.message||'Internal error'})}};

const tick=async()=>{try{const act=db.policies.filter(p=>NEXT.includes(p.status));lastTick=Date.now();if(!act.length)return;const ids=[...new Set(act.map(p=>COIN[p.sellToken]).filter(v=>typeof v==='string'))];let px={};if(ids.length)try{px=await cg('/simple/price?ids='+ids.join(',')+'&vs_currencies=usd',25000)}catch{}
 let dirty=false;for(const p of act){const c=COIN[p.sellToken],price=c===1?1:(px[c]?.usd??null),r=poll(p,price),st=r.code==='READY'?'ready':r.code==='EXPIRED'?'expired':'waiting';if(p.status!==st||p.poll?.reason!==r.reason){p.status=st;p.poll={...r,at:r.at,checked:lastTick};dirty=true}}if(dirty)save()}catch(e){console.error('keeper:',e.message)}};
setInterval(tick,30000).unref();tick();
http.createServer(handler).listen(port,()=>console.log(`ZEROTH http://localhost:${port}/  (landing page)  ·  app: http://localhost:${port}/app`));
