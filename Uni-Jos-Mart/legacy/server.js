// Uni-Jos Mart backend: zero dependencies (Node http + JSON file storage)
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,SECRET=process.env.SECRET||'change-this-secret';
const DBF=path.join(__dirname,'data','db.json');fs.mkdirSync(path.dirname(DBF),{recursive:true});
let db={users:[],items:[]};try{db=JSON.parse(fs.readFileSync(DBF))}catch{}
const save=()=>fs.writeFileSync(DBF,JSON.stringify(db));
const uid=()=>crypto.randomBytes(6).toString('hex');
const hash=(p,s=crypto.randomBytes(8).toString('hex'))=>s+':'+crypto.scryptSync(p,s,32).toString('hex');
const mac=b=>crypto.createHmac('sha256',SECRET).update(b).digest('base64url');
const sign=u=>{const b=Buffer.from(JSON.stringify({u,e:Date.now()+6048e5})).toString('base64url');return b+'.'+mac(b)};
const verify=t=>{try{const[b,s]=t.split('.');if(s!==mac(b))return;const p=JSON.parse(Buffer.from(b,'base64url'));return p.e>Date.now()?p.u:undefined}catch{}};
const REQ=['firstName','surname','email','phone','matric','faculty','department','permAddress','state','lga','schoolAddress'];
const own=u=>{const{password,...r}=u;return r};
const pub=u=>u&&({id:u.id,name:u.firstName+' '+u.surname,photo:u.photo,faculty:u.faculty,department:u.department,schoolAddress:u.schoolAddress,phone:u.phone});
const send=(res,c,d)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(d))};
const body=req=>new Promise((ok,no)=>{let b='';req.on('data',c=>{b+=c;if(b.length>4e6){req.destroy();no()}});req.on('end',()=>{try{ok(JSON.parse(b||'{}'))}catch{ok({})}})});
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'};
async function api(req,res,p,q){
 const me=db.users.find(u=>u.id===verify((req.headers.authorization||'').slice(7)));
 const need=()=>{if(!me){send(res,401,{error:'Please log in first.'});return 1}};
 const b=req.method==='GET'||req.method==='DELETE'?{}:await body(req);
 if(p==='/signup'&&req.method==='POST'){
  if(!b.terms)return send(res,400,{error:'You must accept the Terms and Privacy Policy.'});
  if(REQ.some(k=>!String(b[k]||'').trim())||!b.password||b.password.length<6)return send(res,400,{error:'Fill every required field. Password needs 6+ characters.'});
  b.email=b.email.toLowerCase().trim();
  if(db.users.some(u=>u.email===b.email||u.matric.toLowerCase()===b.matric.toLowerCase()))return send(res,409,{error:'Email or matriculation number already registered.'});
  const u={id:uid(),middleName:'',photo:'',...Object.fromEntries([...REQ,'middleName','photo'].map(k=>[k,String(b[k]||'').trim()])),email:b.email,password:hash(b.password),campus:'University of Jos',created:Date.now()};
  db.users.push(u);save();return send(res,200,{token:sign(u.id),user:own(u)})}
 if(p==='/login'&&req.method==='POST'){
  const u=db.users.find(x=>x.email===String(b.email||'').toLowerCase().trim());
  if(!u||hash(b.password||'',u.password.split(':')[0])!==u.password)return send(res,401,{error:'Wrong email or password.'});
  return send(res,200,{token:sign(u.id),user:own(u)})}
 if(p==='/me'){if(need())return;
  if(req.method==='PUT'){for(const k of [...REQ,'middleName','photo'])if(b[k]!==undefined)me[k]=String(b[k]).trim();
   if(REQ.some(k=>!me[k]))return send(res,400,{error:'Required fields cannot be empty.'});save()}
  return send(res,200,own(me))}
 if(p==='/items'&&req.method==='GET'){
  let r=db.items.filter(i=>(!q.cat||i.category===q.cat)&&(!q.status||i.status===q.status)&&(!q.mine||i.sellerId===me?.id)&&(!q.q||(i.title+i.description).toLowerCase().includes(q.q.toLowerCase())));
  return send(res,200,r.sort((a,b)=>b.created-a.created).map(i=>({...i,seller:pub(db.users.find(u=>u.id===i.sellerId))})))}
 if(p==='/items'&&req.method==='POST'){if(need())return;
  if(!b.title||!(+b.price>0)||!b.category||!b.proof)return send(res,400,{error:'Title, price, category and the proof-of-ownership confirmation are required.'});
  const i={id:uid(),sellerId:me.id,title:String(b.title).slice(0,80),description:String(b.description||'').slice(0,800),price:Math.round(+b.price),category:b.category,condition:b.condition||'Used',pickup:String(b.pickup||'').slice(0,100),image:b.image||'',status:'available',created:Date.now()};
  db.items.push(i);save();return send(res,200,i)}
 const m=p.match(/^\/items\/(\w+)(\/status)?$/);
 if(m){const it=db.items.find(i=>i.id===m[1]);if(!it)return send(res,404,{error:'Item not found.'});
  if(!m[2]&&req.method==='GET')return send(res,200,{...it,seller:pub(db.users.find(u=>u.id===it.sellerId))});
  if(need())return;if(it.sellerId!==me.id)return send(res,403,{error:'Only the seller can change this item.'});
  if(m[2]&&req.method==='PUT'){if(!['available','reserved','sold'].includes(b.status))return send(res,400,{error:'Invalid status.'});
   it.status=b.status;it.soldAt=b.status==='sold'?Date.now():null;save();return send(res,200,it)}
  if(req.method==='DELETE'){db.items=db.items.filter(i=>i!==it);save();return send(res,200,{ok:1})}}
 send(res,404,{error:'Not found.'})}
http.createServer(async(req,res)=>{
 try{const u=new URL(req.url,'http://x'),p=decodeURIComponent(u.pathname);
  if(p.startsWith('/api/'))return await api(req,res,p.slice(4),Object.fromEntries(u.searchParams));
  const f=path.join(__dirname,'public',p==='/'?'index.html':p);
  if(!f.startsWith(path.join(__dirname,'public'))||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('Not found')}
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)
 }catch(e){send(res,500,{error:'Server error.'})}
}).listen(PORT,()=>console.log('Uni-Jos Mart running on http://localhost:'+PORT));
