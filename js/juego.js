/* Maratón Ambiental RA · Agenda Ambiental UASLP — modo "pasa y juega" (un teléfono). */
const $=s=>document.querySelector(s);
const COLORES=['#E66A2C','#1F6FBF','#F2B31B','#2E7D3E','#7B3FA6','#E0457B'];
const TEMAS={RES:['Residuos y economía circular','#E36C1E'],AGU:['Agua','#1F6FBF'],ENE:['Energía y cambio climático','#F2B31B'],BIO:['Biodiversidad','#2E7D3E'],MOV:['Movilidad','#7B3FA6']};
const META=42, PW=2.1152, PH=2.7373; // tablero en unidades del ancla (ver README)
const Q=new URLSearchParams(location.search);
const S={jug:[],ign:0,turno:0,fase:'espera',t:45,reloj:null,resta:0,usadas:new Set(),modo:'2d',fallosT:{}};
let PREG=[],CAS={};
Promise.all([fetch('data/preguntas.json').then(r=>r.json()),fetch('data/tablero.json').then(r=>r.json())]).then(([p,t])=>{PREG=p;CAS=t.casillas;});
setTimeout(()=>{$('#splash').classList.add('oculto');$('#intro').classList.remove('oculto')},1200);

/* ---------- Registro con selfie (solo en memoria) ---------- */
let selfie=null;
$('#bRegistro').onclick=async()=>{$('#intro').classList.add('oculto');$('#registro').classList.remove('oculto');
 try{selfie=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:480,height:480},audio:false});$('#vSelfie').srcObject=selfie;}catch(e){toast('Sin cámara frontal: se usará un avatar.');}};
function avatar(n,c){const cv=document.createElement('canvas');cv.width=cv.height=240;const g=cv.getContext('2d');g.fillStyle=c;g.fillRect(0,0,240,240);g.fillStyle='#fff';g.font='bold 120px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(n[0].toUpperCase(),120,128);return cv.toDataURL('image/jpeg',.8);}
$('#bFoto').onclick=()=>{const n=$('#iNombre').value.trim();if(!n)return toast('Escribe un nombre');if(S.jug.length>=6)return toast('Máximo 6 jugadores (E1–E6)');
 const c=COLORES[S.jug.length];let foto;const v=$('#vSelfie');
 if(selfie&&v.videoWidth){const cv=$('#cSelfie'),g=cv.getContext('2d'),s=Math.min(v.videoWidth,v.videoHeight);g.save();g.translate(240,0);g.scale(-1,1);g.drawImage(v,(v.videoWidth-s)/2,(v.videoHeight-s)/2,s,s,0,0,240,240);g.restore();foto=cv.toDataURL('image/jpeg',.8);}
 else foto=avatar(n,c);
 S.jug.push({id:'E'+(S.jug.length+1),nombre:n,foto,c,km:0,ausente:false,llego:false});$('#iNombre').value='';pintarLista('#lista',false);};
function pintarLista(sel,editable){$(sel).innerHTML=S.jug.map((j,i)=>`<div class="jug${j.ausente?' aus':''}" style="--c:${j.c}"><img src="${j.foto}"><b>${j.id} ${esc(j.nombre)}</b><small>${j.km} km</small>${editable?`<button class="sec" onclick="alternarAusente(${i})">${j.ausente?'Regresar':'Ausente'}</button>`:''}</div>`).join('');}
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
window.alternarAusente=i=>{S.jug[i].ausente=!S.jug[i].ausente;S.fallosT[i]=0;pintarLista('#listaJug',true);if(S.jug.every(j=>j.ausente||j.llego))fin();};
function cerrarSelfie(){if(selfie){selfie.getTracks().forEach(t=>t.stop());selfie=null;}}
function listo(){if(S.jug.length<1){toast('Agrega al menos un jugador');return false;}S.t=+$('#sTiempo').value;cerrarSelfie();$('#registro').classList.add('oculto');$('#hud').classList.remove('oculto');crearFichas();return true;}
$('#bSinCam').onclick=()=>{if(!listo())return;S.modo='2d';$('#vista2d').classList.remove('oculto');iniciarTurno();};
$('#bAR').onclick=async()=>{if(!listo())return;S.modo='ar';const sc=$('#escena');sc.classList.remove('oculto');$('#bModo').classList.remove('oculto');
 try{await sc.systemControl.start();}catch(e){toast('No se pudo iniciar la cámara; se juega sin cámara.');S.modo='2d';sc.classList.add('oculto');$('#vista2d').classList.remove('oculto');}
 iniciarTurno();};
$('#bJug').onclick=()=>{pintarLista('#listaJug',true);$('#panelJug').classList.remove('oculto');};$('#bCerrarJug').onclick=()=>$('#panelJug').classList.add('oculto');

/* ---------- Superficie: Pared / Mesa / Auto (mismo criterio que ar-ciclo-agua-uaslp) ---------- */
const MODOS=['auto','pared','mesa'];let modo=localStorage.getItem('modoCartel')||'auto',beta=null,modoAuto='pared';
addEventListener('deviceorientation',e=>{if(e.beta!=null)beta=e.beta;});
function modoEfectivo(){return modo==='auto'?modoAuto:modo;}
function aplicarModo(){const m=modoEfectivo();
 // El tablero siempre queda pegado al plano del cartel; en Mesa las fichas se levantan (de pie) hacia el jugador.
 document.querySelectorAll('#fichas .ficha').forEach(f=>{f.object3D.rotation.x=m==='mesa'?Math.PI/2:0;f.object3D.position.z=m==='mesa'?0.07:0;});
 $('#bModo').textContent='Modo: '+(modo==='auto'?'Auto ('+(m==='mesa'?'Mesa':'Pared')+')':(m==='mesa'?'Mesa':'Pared'));}
$('#bModo').onclick=()=>{modo=MODOS[(MODOS.indexOf(modo)+1)%3];localStorage.setItem('modoCartel',modo);aplicarModo();};
document.querySelector('#target').addEventListener('targetFound',()=>{if(beta!=null)modoAuto=Math.abs(beta)>50?'pared':'mesa';aplicarModo();});

/* ---------- Fichas (RA y 2D) ---------- */
function uvCas(km,k){const c=km===0?CAS['0']:CAS[String(Math.min(km,META))];const ox=((k%3)-1)*0.022,oy=(Math.floor(k/3)-.5)*0.022*(km===0?3:1);
 return {u:1-c.v+ox,v:c.u+oy};} // tablero horizontal girado 90° horario
function crearFichas(){const raiz=$('#fichas'),t2=$('#tab2d');
 [...S.jug.map((j,i)=>({i,foto:j.foto,c:j.c})),{i:'ign'}].forEach(o=>{
  const e=document.createElement('a-entity');e.classList.add('ficha');e.id='f3d-'+o.i;
  e.innerHTML=o.i==='ign'?`<a-circle radius="0.075" color="#000"></a-circle><a-ring radius-inner="0.075" radius-outer="0.09" color="#fff" position="0 0 0.001"></a-ring>`
   :`<a-circle radius="0.075" material="shader:flat;src:${o.foto}"></a-circle><a-ring radius-inner="0.075" radius-outer="0.095" color="${o.c}" position="0 0 0.001"></a-ring>`;
  raiz.appendChild(e);
  const d=document.createElement('div');d.className='f2d'+(o.i==='ign'?' ign':'');d.id='f2d-'+o.i;if(o.i!=='ign'){d.style.backgroundImage=`url(${o.foto})`;d.style.setProperty('--c',o.c);}t2.appendChild(d);});
 moverFichas();aplicarModo();}
function moverFichas(){const L=[...S.jug.map((j,i)=>[i,j.km,i]),['ign',S.ign,6]];
 L.forEach(([id,km,k])=>{const p=uvCas(km,k);const e=document.getElementById('f3d-'+id);if(e)e.setAttribute('position',`${(p.u-.5)*PW} ${(.5-p.v)*PH} 0`);
  const d=document.getElementById('f2d-'+id);if(d){d.style.left=p.u*100+'%';d.style.top=p.v*100+'%';}});
 $('#ignKm').textContent=S.ign;}

/* ---------- Turnos, dado, reloj ---------- */
function activos(){return S.jug.filter(j=>!j.ausente&&!j.llego);}
function iniciarTurno(){if(!activos().length)return fin();let n=0;
 while((S.jug[S.turno].ausente||S.jug[S.turno].llego)&&n<7){S.turno=(S.turno+1)%S.jug.length;n++;}
 const j=S.jug[S.turno];$('#tFoto').src=j.foto;$('#tNombre').textContent=`${j.id} · ${j.nombre}`;$('#tKm').textContent=`km ${j.km}`;
 $('#turno').style.borderColor=j.c;S.fase='dado';$('#bDado').disabled=false;arrancarReloj();toast(`Turno de ${j.nombre}: tira el dado`);}
function arrancarReloj(){clearInterval(S.reloj);S.resta=S.t;pintarReloj();S.reloj=setInterval(()=>{S.resta--;pintarReloj();if(S.resta<=0){clearInterval(S.reloj);tiempoAgotado();}},1000);}
function pintarReloj(){$('#reloj').textContent=S.resta;$('#reloj').classList.toggle('urge',S.resta<=10);$('#pReloj').textContent=`Tiempo: ${S.resta} s`;}
function tiempoAgotado(){const i=S.turno;S.fallosT[i]=(S.fallosT[i]||0)+1;$('#pregunta').classList.add('oculto');
 if(S.pend!=null){S.jug[i].km=S.pend.antes;S.pend=null;}
 // 2 tiempos agotados seguidos = jugador desconectado: se marca ausente y se salta hasta que regrese (botón 👥)
 if(S.fallosT[i]>=2){S.jug[i].ausente=true;toast(`${S.jug[i].nombre} no responde: se salta su turno (👥 para regresar)`);} else toast(`Se acabó el tiempo de ${S.jug[i].nombre}: pierde el turno y La Ignorancia avanza 1 km`);
 S.ign++;moverFichas();siguiente();}
$('#bSaltar').onclick=()=>{if(S.fase!=='dado')return;clearInterval(S.reloj);toast(`Se salta el turno de ${S.jug[S.turno].nombre}`);siguiente();};
const CARAS='⚀⚁⚂⚃⚄⚅';
$('#bDado').onclick=()=>{if(S.fase!=='dado')return;S.fase='rodando';$('#bDado').disabled=true;const d=$('#dado');d.classList.remove('oculto');
 let k=0;const r=1+Math.floor(Math.random()*6);const it=setInterval(()=>{d.textContent=CARAS[Math.floor(Math.random()*6)];if(++k>12){clearInterval(it);d.textContent=CARAS[r-1];
  setTimeout(()=>{d.classList.add('oculto');avanzar(r);},700);}},70);};
function avanzar(r){const j=S.jug[S.turno];S.pend={antes:j.km};j.km=Math.min(META,j.km+r);moverFichas();toast(`🎲 ${r}: ${j.nombre} avanza a km ${j.km}`);setTimeout(()=>preguntar(CAS[String(j.km)].tema),900);}
function preguntar(tema){S.fase='pregunta';let pool=PREG.map((p,i)=>i).filter(i=>PREG[i].tema===tema&&!S.usadas.has(i));
 if(!pool.length){PREG.forEach((p,i)=>{if(p.tema===tema)S.usadas.delete(i)});pool=PREG.map((p,i)=>i).filter(i=>PREG[i].tema===tema);}
 const qi=pool[Math.floor(Math.random()*pool.length)];S.usadas.add(qi);const q=PREG[qi];
 const orden=[0,1,2].sort(()=>Math.random()-.5);
 $('#pTema').textContent=TEMAS[tema][0];$('#pTema').style.background=TEMAS[tema][1];$('#pTexto').textContent=q.p;
 $('#pOps').innerHTML='';orden.forEach((o,k)=>{const b=document.createElement('button');b.textContent='ABC'[k]+') '+q.op[o];b.onclick=()=>responder(o===q.ok,b,orden.indexOf(q.ok));$('#pOps').appendChild(b);});
 $('#pregunta').classList.remove('oculto');}
function responder(bien,b,kOk){if(S.fase!=='pregunta')return;S.fase='resultado';clearInterval(S.reloj);const bs=$('#pOps').children;bs[kOk].classList.add('bien');if(!bien)b.classList.add('mal');
 const i=S.turno,j=S.jug[i];S.fallosT[i]=0;
 setTimeout(()=>{$('#pregunta').classList.add('oculto');
  if(bien){S.pend=null;toast(`¡Correcto! ${j.nombre} se queda en km ${j.km}`);if(j.km>=META){j.llego=true;j.lugar=S.jug.filter(x=>x.llego).length;}}
  else{j.km=S.pend.antes;S.pend=null;S.ign++;toast(`Incorrecto: ${j.nombre} regresa a km ${j.km}; La Ignorancia avanza 1 km`);}
  moverFichas();if(S.jug.some(x=>x.llego)||S.ign>=META)return setTimeout(fin,1200);siguiente();},1400);}
function siguiente(){S.fase='espera';if(S.ign>=META)return setTimeout(fin,1000);S.turno=(S.turno+1)%S.jug.length;setTimeout(iniciarTurno,1600);}

/* ---------- Final: ranking, confeti y aplausos ---------- */
function fin(){clearInterval(S.reloj);S.fase='fin';
 const R=[...S.jug].sort((a,b)=>(a.lugar||99)-(b.lugar||99)||b.km-a.km);
 $('#fMsg').textContent=S.ign>=META&&!S.jug.some(j=>j.llego)?'La Ignorancia llegó primero a la meta… ¡a estudiar y revancha!':`¡${R[0].nombre} gana el Maratón Ambiental!`;
 $('#ranking').innerHTML=R.map(j=>`<li><img src="${j.foto}" style="border-color:${j.c}"><span><b>${j.id} ${esc(j.nombre)}</b> · km ${j.km}</span></li>`).join('')+`<li>⚫ La Ignorancia · km ${S.ign}</li>`;
 $('#final').classList.remove('oculto');$('#hud').classList.add('oculto');if(S.jug.some(j=>j.llego)){confeti();aplausos();}
 try{$('#escena').systemControl.stop();}catch(e){}}
function confeti(){const c=$('#confeti'),g=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
 const P=Array.from({length:180},()=>({x:Math.random()*c.width,y:-Math.random()*c.height,v:2+Math.random()*4,r:Math.random()*6.28,c:COLORES[Math.floor(Math.random()*6)]}));let t=0;
 (function f(){g.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.y+=p.v;p.x+=Math.sin(p.r+=.05)*1.5;if(p.y>c.height&&t<400)p.y=-10;g.fillStyle=p.c;g.fillRect(p.x,p.y,8,12);});if(++t<600)requestAnimationFrame(f);})();}
function aplausos(){try{const A=new (window.AudioContext||window.webkitAudioContext)(),n=A.sampleRate*4,buf=A.createBuffer(1,n,A.sampleRate),d=buf.getChannelData(0);
 for(let k=0;k<900;k++){const s=Math.floor(Math.random()*(n-3000)),amp=Math.random()*.6*(1-s/n);for(let i=0;i<1500;i++)d[s+i]+=(Math.random()*2-1)*amp*Math.exp(-i/180);}
 const src=A.createBufferSource(),f=A.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;f.Q.value=.6;src.buffer=buf;src.connect(f);f.connect(A.destination);src.start();}catch(e){}}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.remove('oculto');clearTimeout(tt);tt=setTimeout(()=>t.classList.add('oculto'),2600);}
window.__S=S; // para pruebas
