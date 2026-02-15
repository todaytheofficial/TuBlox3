(function(){
'use strict';
const TC=window.TubloxCharacter,io=window.io;
const L=0.15,SR=50,AD=400,DTM=0.05,CL=80;
const pn=new URLSearchParams(location.search).get('place')||'platformer';
const tok=(document.cookie.match(/(?:^|; )token=([^;]*)/)||[])[1];
if(!tok){location.href='/auth';return;}
const cv=document.getElementById('game-canvas'),c=cv.getContext('2d',{alpha:false});
const $=id=>document.getElementById(id);
let rdy=0,me=null,mid=null,pd=null,rp={},cam={x:0,y:0},K={};
let chOn=0,escOn=0,lSend=0,fc=0,fps=60,fpsT=0,an=0;
let dth={on:0,t:0,dur:1.5};
let wC=[],col=new Set(),fx={};
let flOn=1,shOn=1;
let wM=[],drs={},drA={},lvs={},kcs={};
let iCd=0,iMs=[];
let nR=0,nT='',cN=[],cNi=-1,nH=0;
let wAv=[];let avIC=0;
let dA=0,dD=null,dS={cl:0,ti:0,tt:null,tp:0,sc:0,cm:new Set(),ld:null};
let wV=[],vStates={},myVeh=null;
let H={on:0,bat:100,mb:100,dr:0.8,rg:0.3,fl:0,ft:0,br:0,sx:0,sy:0,sc:new Set(),sr:null,st:0,ch:null,pt:[],ms:[],ey:[],hb:0,nr:0};
const mob=/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||'ontouchstart'in window||navigator.maxTouchPoints>0;
let joy={on:0,sx:0,sy:0,dx:0,dy:0},mJ=0,mA=0;
let dkC=null,dkX=null;
let cL=0,cR=0,cT=0,cB=0;

// ==================== VEHICLE DEFS ====================
const VD={
  car:{n:'Car',w:120,h:50,ms:10,ac:.5,bf:.8,m:2,jf:0,s:1},
  truck:{n:'Truck',w:150,h:60,ms:7,ac:.3,bf:.6,m:5,jf:0,s:2},
  sports:{n:'Sports',w:130,h:42,ms:18,ac:1,bf:1.2,m:1.5,jf:0,s:1},
  buggy:{n:'Buggy',w:110,h:55,ms:12,ac:.7,bf:.5,m:1,jf:8,s:1},
  bus:{n:'Bus',w:180,h:65,ms:8,ac:.3,bf:.5,m:6,jf:0,s:4},
  monster:{n:'Monster',w:140,h:70,ms:9,ac:.4,bf:.7,m:4,jf:10,s:1}
};

// ==================== ITEM VISUALS (compact) ====================
const IV={
  sword:{n:'Sword',c:'#CCC',tg:0,dW(c,x,y,t){c.save();c.translate(x,y+Math.sin(t*3)*3);c.rotate(-.524);c.fillStyle='#8B6914';c.fillRect(-2,-4,4,8);c.fillStyle='#CCAA00';c.fillRect(-6,4,12,3);c.fillStyle='#CCC';c.fillRect(-1.5,7,3,18);c.fillStyle='#EEE';c.fillRect(-1.5,7,1,18);c.fillStyle='#DDD';c.beginPath();c.moveTo(-1.5,25);c.lineTo(1.5,25);c.lineTo(0,28);c.fill();c.restore();},dH(c,x,y,s){c.save();c.translate(x+s/2,y+s/2);c.rotate(-.785);const r=s/52;c.fillStyle='#8B6914';c.fillRect(-2*r,-3*r,4*r,6*r);c.fillStyle='#CCAA00';c.fillRect(-4*r,3*r,8*r,2*r);c.fillStyle='#CCC';c.fillRect(-r,5*r,3*r,16*r);c.fillStyle='#EEE';c.fillRect(-r,5*r,r,16*r);c.restore();}},
  flashlight:{n:'Flashlight',c:'#FFE066',tg:1,dW(c,x,y,t){c.save();c.translate(x,y+Math.sin(t*2.5)*2);c.fillStyle='#555';c.fillRect(-4,-8,8,16);c.fillStyle='#FFE066';c.fillRect(-5,-10,10,3);c.fillStyle='rgba(255,224,102,0.15)';c.beginPath();c.moveTo(-5,-10);c.lineTo(-15,-30);c.lineTo(15,-30);c.lineTo(5,-10);c.fill();c.restore();},dH(c,x,y,s){c.save();c.translate(x+s/2,y+s/2);const r=s/52;c.fillStyle='#555';c.fillRect(-4*r,-6*r,8*r,14*r);c.fillStyle='#FFE066';c.fillRect(-5*r,-8*r,10*r,3*r);c.restore();},dE(c,p,t){if(H.on)return;const it=p.inventory?.[p.activeSlot];if(!it||it.id!=='flashlight')return;const on=p._me?flOn:(p.iSt?.flashlightOn!==false);if(!on)return;const rad=it.radius||200,br=it.brightness||1,px=p.x+p.width/2,py=p.y+p.height/2,dir=p.direction||1,ag=dir===1?0:Math.PI;c.save();const g=c.createRadialGradient(px,py,10,px+dir*rad*.6,py,rad);g.addColorStop(0,`rgba(255,240,180,${.25*br})`);g.addColorStop(.5,`rgba(255,240,180,${.1*br})`);g.addColorStop(1,'rgba(255,240,180,0)');c.fillStyle=g;c.beginPath();c.moveTo(px,py);c.arc(px,py,rad,ag-.785,ag+.785);c.closePath();c.fill();c.restore();}},
  shield:{n:'Shield',c:'#4488CC',tg:1,dW(c,x,y,t){c.save();c.translate(x,y+Math.sin(t*2)*2);c.fillStyle='#4488CC';c.beginPath();c.moveTo(0,-12);c.lineTo(10,-6);c.lineTo(10,4);c.lineTo(0,12);c.lineTo(-10,4);c.lineTo(-10,-6);c.closePath();c.fill();c.strokeStyle='#66AAEE';c.lineWidth=1.5;c.stroke();c.fillStyle='#66AAEE';c.beginPath();c.arc(0,0,4,0,6.283);c.fill();c.restore();},dH(c,x,y,s){c.save();c.translate(x+s/2,y+s/2);const r=s/52;c.fillStyle='#4488CC';c.beginPath();c.moveTo(0,-10*r);c.lineTo(8*r,-5*r);c.lineTo(8*r,3*r);c.lineTo(0,10*r);c.lineTo(-8*r,3*r);c.lineTo(-8*r,-5*r);c.closePath();c.fill();c.strokeStyle='#66AAEE';c.lineWidth=r;c.stroke();c.restore();},dE(c,p,t){const it=p.inventory?.[p.activeSlot];if(!it||it.id!=='shield')return;const on=p._me?shOn:(p.iSt?.shieldActive!==false);if(!on)return;const px=p.x+p.width/2,py=p.y+p.height/2,a=.3+Math.sin(t*3)*.1;c.save();c.strokeStyle=`rgba(68,136,204,${a})`;c.lineWidth=2;c.beginPath();c.arc(px,py,28,0,6.283);c.stroke();c.fillStyle=`rgba(68,136,204,${a*.15})`;c.fill();c.restore();}},
  speed_boost:{n:'Speed Boost',c:'#FFD700',tg:0,dW(c,x,y,t){c.save();c.translate(x,y+Math.sin(t*4)*2);c.fillStyle='#FFD700';c.beginPath();c.moveTo(2,-12);c.lineTo(-4,0);c.lineTo(0,0);c.lineTo(-2,12);c.lineTo(6,0);c.lineTo(2,0);c.closePath();c.fill();c.restore();},dH(c,x,y,s){c.save();c.translate(x+s/2,y+s/2);const r=s/52;c.fillStyle='#FFD700';c.beginPath();c.moveTo(2*r,-10*r);c.lineTo(-4*r,0);c.lineTo(0,0);c.lineTo(-2*r,10*r);c.lineTo(6*r,0);c.lineTo(2*r,0);c.closePath();c.fill();c.restore();},onC(p,it){fx.spd={m:it.multiplier||1.5,end:Date.now()+(it.duration||5e3)};sM(`Speed x${it.multiplier||1.5}!`);},dE(c,p,t){if(!fx.spd||Date.now()>fx.spd.end){delete fx.spd;return;}const px=p.x+p.width/2,py=p.y+p.height;for(let i=0;i<3;i++){const o=(t*200+i*40)%60;c.fillStyle=`rgba(255,215,0,${(1-o/60)*.4})`;c.fillRect(px-p.direction*(o+10),py-10-i*8,12,2);}}},
  jump_boost:{n:'Jump Boost',c:'#44CC44',tg:0,dW(c,x,y,t){c.save();c.translate(x,y+Math.sin(t*3)*3);c.fillStyle='#44CC44';c.fillRect(-6,4,12,4);c.fillStyle='#66EE66';c.beginPath();c.moveTo(0,-14);c.lineTo(5,-8);c.lineTo(-5,-8);c.closePath();c.fill();c.restore();},dH(c,x,y,s){c.save();c.translate(x+s/2,y+s/2);const r=s/52;c.fillStyle='#44CC44';c.fillRect(-5*r,2*r,10*r,3*r);c.fillStyle='#66EE66';c.beginPath();c.moveTo(0,-8*r);c.lineTo(5*r,-2*r);c.lineTo(-5*r,-2*r);c.closePath();c.fill();c.restore();},onC(p,it){fx.jmp={m:it.multiplier||1.5,end:Date.now()+(it.duration||5e3)};sM(`Jump x${it.multiplier||1.5}!`);},dE(c,p,t){if(!fx.jmp||Date.now()>fx.jmp.end){delete fx.jmp;return;}const px=p.x+p.width/2,py=p.y+p.height;for(let i=0;i<4;i++){const a2=t*5+i*1.571,r=8+Math.sin(t*8+i)*4;c.fillStyle=`rgba(68,204,68,${.3+Math.sin(t*4+i)*.15})`;c.fillRect(px+Math.cos(a2)*r-1.5,py+Math.sin(t*6+i)*3-1.5,3,3);}}},
  coin:{n:'Coin',c:'#FFD700',tg:0,dW(c,x,y,t){c.save();c.translate(x,y+Math.sin(t*3)*2);const s=Math.abs(Math.cos(t*2))||.1;c.scale(s,1);c.fillStyle='#FFD700';c.beginPath();c.arc(0,0,8,0,6.283);c.fill();c.strokeStyle='#DAA520';c.lineWidth=1.5;c.stroke();c.fillStyle='#DAA520';c.font='bold 8px Inter';c.textAlign='center';c.textBaseline='middle';c.fillText('$',0,0);c.restore();},dH(c,x,y,s){c.save();c.translate(x+s/2,y+s/2);const r=s/52;c.fillStyle='#FFD700';c.beginPath();c.arc(0,0,7*r,0,6.283);c.fill();c.strokeStyle='#DAA520';c.lineWidth=r;c.stroke();c.restore();},onC(p,it){sM(`+${it.value||1} coin!`);}},
  heart:{n:'Heart',c:'#EF4444',tg:0,dW(c,x,y,t){c.save();c.translate(x,y+Math.sin(t*2)*2);const p=1+Math.sin(t*4)*.1;c.scale(p,p);c.fillStyle='#EF4444';c.beginPath();c.moveTo(0,4);c.bezierCurveTo(-8,-2,-10,-8,-5,-10);c.bezierCurveTo(-2,-12,0,-9,0,-7);c.bezierCurveTo(0,-9,2,-12,5,-10);c.bezierCurveTo(10,-8,8,-2,0,4);c.fill();c.restore();},dH(c,x,y,s){c.save();c.translate(x+s/2,y+s/2);const r=s/52;c.fillStyle='#EF4444';c.beginPath();c.moveTo(0,4*r);c.bezierCurveTo(-7*r,-2*r,-9*r,-7*r,-4*r,-9*r);c.bezierCurveTo(-r,-10*r,0,-8*r,0,-6*r);c.bezierCurveTo(0,-8*r,r,-10*r,4*r,-9*r);c.bezierCurveTo(9*r,-7*r,7*r,-2*r,0,4*r);c.fill();c.restore();},onC(p,it){const h=it.healAmount||25;if(p.hp!==undefined){p.hp=Math.min(p.maxHp||100,p.hp+h);sM(`+${h} HP!`);}}},
  key:{n:'Key',c:'#DAA520',tg:0,dW(c,x,y,t){c.save();c.translate(x,y+Math.sin(t*2)*2);c.rotate(Math.sin(t*1.5)*.2);c.strokeStyle='#DAA520';c.lineWidth=2;c.beginPath();c.arc(0,-6,5,0,6.283);c.stroke();c.fillStyle='rgba(218,165,32,0.3)';c.fill();c.fillStyle='#DAA520';c.fillRect(-1,-1,2,14);c.fillRect(1,9,4,2);c.fillRect(1,5,3,2);c.restore();},dH(c,x,y,s){c.save();c.translate(x+s/2,y+s/2);const r=s/52;c.strokeStyle='#DAA520';c.lineWidth=1.5*r;c.beginPath();c.arc(0,-5*r,4*r,0,6.283);c.stroke();c.fillStyle='#DAA520';c.fillRect(-r,0,2*r,12*r);c.fillRect(r,8*r,3*r,2*r);c.restore();},onC(){sM('Key collected!');}},
  battery:{n:'Battery',c:'#44EE44',tg:0,dW(c,x,y,t){c.save();c.translate(x,y+Math.sin(t*3)*2);c.fillStyle='#333';c.fillRect(-4,-7,8,14);c.fillStyle='#555';c.fillRect(-2,-9,4,3);c.fillStyle='#44EE44';c.fillRect(-2,-4,4,8);const ch=8*(.5+Math.sin(t*2)*.3);c.fillStyle='#66FF66';c.fillRect(-2,-4+(8-ch),4,ch);c.restore();},dH(c,x,y,s){c.save();c.translate(x+s/2,y+s/2);const r=s/52;c.fillStyle='#333';c.fillRect(-3*r,-6*r,6*r,12*r);c.fillStyle='#555';c.fillRect(-2*r,-8*r,4*r,3*r);c.fillStyle='#44EE44';c.fillRect(-2*r,-3*r,4*r,7*r);c.restore();},onC(p,it){const r=it.recharge||25;H.bat=Math.min(H.mb,H.bat+r);sM(`+${r}% battery`);}},
  note:{n:'Note',c:'#CCBB88',tg:0,dW(c,x,y,t){c.save();c.translate(x,y+Math.sin(t*1.5)*1.5);c.fillStyle='#CCBB88';c.fillRect(-6,-8,12,16);c.fillStyle='#AA9966';c.fillRect(-4,-5,8,1);c.fillRect(-4,-2,6,1);c.fillRect(-4,1,7,1);c.fillRect(-4,4,5,1);c.restore();},dH(c,x,y,s){c.save();c.translate(x+s/2,y+s/2);const r=s/52;c.fillStyle='#CCBB88';c.fillRect(-5*r,-7*r,10*r,14*r);c.fillStyle='#AA9966';c.fillRect(-3*r,-4*r,6*r,r);c.fillRect(-3*r,-r,5*r,r);c.fillRect(-3*r,2*r,6*r,r);c.restore();},onC(p,it){cN.push({text:it.text||'An old note...',id:'n_'+Date.now()+'_'+cN.length});cNi=cN.length-1;shN(cNi);if(mob)uNB();}}
};
const UNK={n:'???',c:'#666',tg:0,dW(c,x,y,t){c.save();c.translate(x,y+Math.sin(t*2)*2);c.fillStyle='#444';c.fillRect(-7,-7,14,14);c.fillStyle='#999';c.font='bold 10px Inter';c.textAlign='center';c.textBaseline='middle';c.fillText('?',0,0);c.restore();},dH(c,x,y,s){c.save();c.translate(x+s/2,y+s/2);const r=s/52;c.fillStyle='#444';c.fillRect(-6*r,-6*r,12*r,12*r);c.fillStyle='#999';c.font=`bold ${8*r}px Inter`;c.textAlign='center';c.textBaseline='middle';c.fillText('?',0,0);c.restore();}};
function gv(id){return IV[id]||UNK;}

// ==================== UTILS ====================
function inV(x,y,w,h){return x+w>cL&&x<cR&&y+h>cT&&y<cB;}
function uCull(){cL=cam.x-CL;cR=cam.x+cv.width+CL;cT=cam.y-CL;cB=cam.y+cv.height+CL;}
function ov(x1,y1,w1,h1,x2,y2,w2,h2){return x1<x2+w2&&x1+w1>x2&&y1<y2+h2&&y1+h1>y2;}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
const KC={red:'#EF4444',blue:'#3B82F6',green:'#22C55E',yellow:'#EAB308'};
function kcC(p){return KC[p?.keycardColor||'red']||KC.red;}

// ==================== VEHICLE RENDERER ====================
function drawVehicle(ctx,v,t){
  const tp=v.type||'car',def=VD[tp]||VD.car;
  const w=v.w||def.w,h=v.h||def.h,dir=v.direction||1;
  const bc=v.bodyColor||'#3b82f6',ac2=v.accentColor||'#1e3a5f';
  const wc=v.wheelColor||'#222',winC=v.windowColor||'#87ceeb';
  const winO=v.windowOpacity||.6;
  const wRot=v.wheelRotation||0;
  if(!inV(v.x-10,v.y-10,w+20,h+20))return;

  ctx.save();
  ctx.translate(v.x+w/2,v.y+h/2);
  if(dir===-1)ctx.scale(-1,1);
  const hw=w/2,hh=h/2;

  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.2)';
  ctx.beginPath();ctx.ellipse(0,hh+4,hw*.8,4,0,0,6.283);ctx.fill();

  if(tp==='truck'){
    // Cargo
    ctx.fillStyle=ac2;ctx.fillRect(-hw,-hh,w*.55,h*.7);
    ctx.fillStyle='rgba(255,255,255,0.05)';ctx.fillRect(-hw,-hh,w*.55,3);
    // Cab
    ctx.fillStyle=bc;ctx.fillRect(w*.05,-hh,w*.45,h*.75);
    ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(w*.05,-hh,w*.45,3);
    // Window
    ctx.fillStyle=winC;ctx.globalAlpha=winO;
    ctx.fillRect(w*.15,-hh+5,w*.25,h*.35);
    ctx.globalAlpha=1;
  } else if(tp==='bus'){
    // Body
    ctx.fillStyle=bc;
    ctx.beginPath();ctx.moveTo(-hw+8,-hh);ctx.lineTo(hw-5,-hh);ctx.lineTo(hw,-hh+10);ctx.lineTo(hw,hh-12);ctx.lineTo(-hw,hh-12);ctx.lineTo(-hw,-hh+5);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fillRect(-hw,-hh,w,3);
    // Windows
    ctx.fillStyle=winC;ctx.globalAlpha=winO;
    const wn=5,ww=w/(wn+1)*.6;
    for(let i=0;i<wn;i++)ctx.fillRect(-hw+12+i*(ww+8),-hh+8,ww,h*.3);
    ctx.globalAlpha=1;
    // Stripe
    ctx.fillStyle=ac2;ctx.fillRect(-hw,hh*.1,w,4);
  } else if(tp==='sports'){
    // Low sleek body
    ctx.fillStyle=bc;
    ctx.beginPath();ctx.moveTo(-hw,-hh*.3);ctx.lineTo(-hw*.3,-hh);ctx.lineTo(hw*.5,-hh);ctx.lineTo(hw,-hh*.4);ctx.lineTo(hw,hh-12);ctx.lineTo(-hw,hh-12);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(-hw,-hh*.3,w*.3,2);
    // Window
    ctx.fillStyle=winC;ctx.globalAlpha=winO;
    ctx.beginPath();ctx.moveTo(-hw*.2,-hh+3);ctx.lineTo(hw*.3,-hh+3);ctx.lineTo(hw*.4,-hh*.3);ctx.lineTo(-hw*.15,-hh*.3);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;
    // Spoiler
    ctx.fillStyle=ac2;ctx.fillRect(-hw-3,-hh*.5,8,3);
  } else if(tp==='buggy'){
    // Open frame
    ctx.strokeStyle=bc;ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(-hw+10,-hh+10);ctx.lineTo(hw-10,-hh+10);ctx.lineTo(hw-5,hh-15);ctx.lineTo(-hw+5,hh-15);ctx.closePath();ctx.stroke();
    // Roll cage
    ctx.strokeStyle=ac2;ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-hw*.3,-hh);ctx.lineTo(-hw*.3,-hh+10);ctx.moveTo(hw*.3,-hh);ctx.lineTo(hw*.3,-hh+10);ctx.moveTo(-hw*.3,-hh);ctx.lineTo(hw*.3,-hh);ctx.stroke();
    // Seat
    ctx.fillStyle='#333';ctx.fillRect(-8,-hh+12,16,h*.3);
  } else if(tp==='monster'){
    // Raised body
    ctx.fillStyle=bc;
    ctx.beginPath();ctx.moveTo(-hw+5,-hh);ctx.lineTo(hw-5,-hh);ctx.lineTo(hw,hh-25);ctx.lineTo(-hw,hh-25);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fillRect(-hw+5,-hh,w-10,3);
    // Window
    ctx.fillStyle=winC;ctx.globalAlpha=winO;
    ctx.fillRect(-hw*.2,-hh+6,w*.4,h*.25);
    ctx.globalAlpha=1;
    // Suspension bars
    ctx.strokeStyle='#555';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-hw*.5,hh-25);ctx.lineTo(-hw*.5,hh-10);ctx.moveTo(hw*.5,hh-25);ctx.lineTo(hw*.5,hh-10);ctx.stroke();
  } else {
    // Default car
    ctx.fillStyle=bc;
    ctx.beginPath();ctx.moveTo(-hw+5,-hh*.4);ctx.quadraticCurveTo(-hw*.2,-hh,hw*.2,-hh);ctx.lineTo(hw-5,-hh*.4);ctx.lineTo(hw,hh-12);ctx.lineTo(-hw,hh-12);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(-hw*.2,-hh,w*.4,2);
    // Window
    ctx.fillStyle=winC;ctx.globalAlpha=winO;
    ctx.beginPath();ctx.moveTo(-hw*.15,-hh+3);ctx.lineTo(hw*.15,-hh+3);ctx.lineTo(hw*.25,-hh*.4);ctx.lineTo(-hw*.25,-hh*.4);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;
    // Bumpers
    ctx.fillStyle=ac2;
    ctx.fillRect(-hw,hh-15,w,3);ctx.fillRect(-hw,-hh*.4,w,2);
  }

  // Headlights
  if(v.headlightsOn){
    ctx.fillStyle='rgba(255,255,170,0.8)';
    ctx.beginPath();ctx.arc(hw-3,-hh*.1,4,0,6.283);ctx.fill();
    ctx.beginPath();ctx.arc(hw-3,hh*.2,4,0,6.283);ctx.fill();
    // Light beam
    ctx.fillStyle='rgba(255,255,170,0.05)';
    ctx.beginPath();ctx.moveTo(hw,0);ctx.lineTo(hw+(v.lightRange||200),-(v.lightRange||200)*.3);ctx.lineTo(hw+(v.lightRange||200),(v.lightRange||200)*.3);ctx.closePath();ctx.fill();
  }

  // Taillights
  ctx.fillStyle='rgba(255,0,0,0.6)';
  ctx.beginPath();ctx.arc(-hw+3,-hh*.1,3,0,6.283);ctx.fill();
  ctx.beginPath();ctx.arc(-hw+3,hh*.2,3,0,6.283);ctx.fill();

  // Wheels
  const wR=tp==='monster'?h*.3:tp==='buggy'?h*.28:h*.22;
  const wy=hh-wR*.3;
  const wx1=-hw*.6,wx2=hw*.6;
  [[wx1,wy],[wx2,wy]].forEach(([wx,wy2])=>{
    ctx.save();ctx.translate(wx,wy2);ctx.rotate(wRot);
    ctx.fillStyle=wc;ctx.beginPath();ctx.arc(0,0,wR,0,6.283);ctx.fill();
    ctx.fillStyle='#444';ctx.beginPath();ctx.arc(0,0,wR*.6,0,6.283);ctx.fill();
    // Spokes
    ctx.strokeStyle='#555';ctx.lineWidth=1;
    for(let a=0;a<6.283;a+=1.047){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*wR*.5,Math.sin(a)*wR*.5);ctx.stroke();}
    ctx.fillStyle='#666';ctx.beginPath();ctx.arc(0,0,wR*.2,0,6.283);ctx.fill();
    ctx.restore();
  });

  ctx.restore();

  // Enter prompt
  if(me&&!me.inVehicle&&v.drivable!==false){
    const px=me.x+me.width/2,py=me.y+me.height/2;
    const vx=v.x+w/2,vy=v.y+h/2;
    const d=Math.sqrt((px-vx)**2+(py-vy)**2);
    const er=v.enterRadius||60;
    if(d<er+30){
      ctx.save();
      ctx.fillStyle=`rgba(255,255,255,${.3+Math.sin(t*3)*.15})`;
      ctx.font='bold 11px Inter';ctx.textAlign='center';
      ctx.fillText(`[${v.enterKey||'E'}] Drive`,v.x+w/2,v.y-12);
      ctx.restore();
    }
  }

  // Driver name
  if(v._driverName){
    ctx.save();ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='9px Inter';ctx.textAlign='center';
    ctx.fillText(v._driverName,v.x+w/2,v.y-3);ctx.restore();
  }
}

// ==================== VEHICLE PHYSICS ====================
function updateVehicle(v,dt){
  if(!v||!v._driving)return;
  let ax=0;
  if(K.KeyD||K.ArrowRight||(mob&&joy.on&&joy.dx>.15))ax=1;
  if(K.KeyA||K.ArrowLeft||(mob&&joy.on&&joy.dx<-.15))ax=-1;
  const brk=K.KeyS||K.ArrowDown||(mob&&joy.on&&joy.dy>.3);
  const acc=v.acceleration||.5,ms=v.maxSpeed||10,fr=v.friction||.05,bf=v.brakeForce||.8;

  if(ax!==0){
    v.vx=(v.vx||0)+ax*acc;
    v.direction=ax;
  }
  if(brk)v.vx=(v.vx||0)*(1-bf*dt*10);
  v.vx=(v.vx||0)*(1-fr);
  if(Math.abs(v.vx)<.1)v.vx=0;
  v.vx=Math.max(-ms,Math.min(ms,v.vx));

  // Gravity for vehicle
  v.vy=(v.vy||0)+((pd?.gravity||.6)/(v.mass||2));
  if(v.vy>12)v.vy=12;

  // Jump
  const wantJump=K.KeyW||K.ArrowUp||K.Space||mJ;
  if(wantJump&&v.onGround&&v.jumpForce){v.vy=-(v.jumpForce);v.onGround=false;}

  v.x+=v.vx;vResolve(v,'x');
  v.y+=v.vy;v.onGround=false;vResolve(v,'y');

  v.wheelRotation=(v.wheelRotation||0)+v.vx*.15;

  // Sync player pos
  if(me&&me.inVehicle===v.id){
    me.x=v.x+v.w/2-me.width/2;
    me.y=v.y-me.height;
  }

  // Send to server
  const now=Date.now();
  if(now-lSend>SR){
    socket.emit('vehicle-update',{vehicleId:v.id,x:v.x,y:v.y,vx:v.vx,vy:v.vy,direction:v.direction,wheelRotation:v.wheelRotation});
    lSend=now;
  }
}

function vResolve(v,axis){
  const w=v.w||120,h=v.h||50;
  const allP=[...(pd?.platforms||[]),...(pd?.blocks||[]),...getDB()];
  for(let i=0;i<allP.length;i++){
    const p=allP[i];
    if(!ov(v.x,v.y,w,h,p.x,p.y,p.w,p.h))continue;
    if(axis==='x'){if(v.vx>0)v.x=p.x-w;else if(v.vx<0)v.x=p.x+p.w;v.vx=0;}
    else{if(v.vy>0){v.y=p.y-h;v.vy=0;v.onGround=true;}else if(v.vy<0){v.y=p.y+p.h;v.vy=0;}}
  }
}

function enterVehicle(v){
  if(!me||me.inVehicle||!v||v.drivable===false)return;
  const px=me.x+me.width/2,py=me.y+me.height/2;
  const vx2=v.x+(v.w||120)/2,vy2=v.y+(v.h||50)/2;
  if(Math.sqrt((px-vx2)**2+(py-vy2)**2)>(v.enterRadius||60)+30)return;
  me.inVehicle=v.id;me.isDriver=true;v._driving=true;v._driverName=me.username;
  myVeh=v;
  socket.emit('enter-vehicle',{vehicleId:v.id,x:v.x,y:v.y,direction:v.direction,maxSeats:v.seats||1});
  sM(`Driving ${VD[v.type]?.n||'Vehicle'}`);
  uMB();
}

function exitVehicle(){
  if(!me||!me.inVehicle||!myVeh)return;
  const v=myVeh;
  v._driving=false;v._driverName=null;
  me.x=v.x+(v.w||120)/2+30;me.y=v.y-me.height-5;me.vx=0;me.vy=0;
  socket.emit('exit-vehicle',{vehicleId:v.id});
  me.inVehicle=null;me.isDriver=false;myVeh=null;
  sM('Exited vehicle');uMB();
}

function findNearVehicle(){
  if(!me||me.inVehicle)return null;
  const px=me.x+me.width/2,py=me.y+me.height/2;
  let best=null,bd=Infinity;
  for(let i=0;i<wV.length;i++){
    const v=wV[i];if(v.drivable===false)continue;
    const vx=v.x+(v.w||120)/2,vy=v.y+(v.h||50)/2;
    const d=Math.sqrt((px-vx)**2+(py-vy)**2);
    const er=(v.enterRadius||60)+30;
    if(d<er&&d<bd){best=v;bd=d;}
  }
  return best;
}

function vehicleHorn(){if(!myVeh||!myVeh.horn)return;socket.emit('vehicle-horn',{vehicleId:myVeh.id});sM('BEEP!');}
function vehicleHL(){if(!myVeh||!myVeh.headlights)return;myVeh.headlightsOn=!myVeh.headlightsOn;socket.emit('vehicle-headlights',{vehicleId:myVeh.id,on:myVeh.headlightsOn});sM(myVeh.headlightsOn?'Headlights ON':'Headlights OFF');}

// ==================== NOTE SYSTEM ====================
function shN(i){if(typeof i==='string')i=cN.findIndex(n=>n.text===i);if(i<0||i>=cN.length)return;nR=1;cNi=i;nT=cN[i].text;const o=$('note-overlay'),te=$('note-text'),hi=$('note-hint');te.textContent=nT;hi.textContent=cN.length>1?`Note ${i+1}/${cN.length} • ${mob?'Swipe ◀▶':'← → switch'} • ${mob?'Tap X':'N/Esc close'}`:(mob?'Tap X to close':'N or Esc to close');o.style.display='flex';}
function hN(){nR=0;nT='';nH=0;$('note-overlay').style.display='none';}
function nxN(){if(!nR||cN.length<=1)return;cNi=(cNi+1)%cN.length;shN(cNi);}
function pvN(){if(!nR||cN.length<=1)return;cNi=(cNi-1+cN.length)%cN.length;shN(cNi);}
function uNB(){if(!mob)return;const b=$('mobile-btn-note');if(!b)return;b.style.display=cN.length>0?'flex':'none';b.textContent=cN.length>1?'📜'+cN.length:cN.length===1?'📜':'';}

// ==================== DIALOGUE SYSTEM ====================
function stD(av){if(dA||!av?.dialogue)return;const d=av.dialogue;if(!d.lines?.length)return;const did=av.id||(av.npcName+'_'+av.x+'_'+av.y);if(d.oneTime&&dS.cm.has(did))return;if(d.hasCondition&&!chDC(d)){if(d.conditionFailText)iM(d.conditionFailText);return;}dA=1;dD={avatar:av,dialogue:d,dialogueId:did};dS.cl=0;dS.ti=0;dS.tp=0;dS.sc=0;dS.ld=did;if(dS.tt){clearInterval(dS.tt);dS.tt=null;}const ce=$('dialogue-choices');if(ce){ce.style.display='none';ce.innerHTML='';}$('dialogue-overlay').style.display='flex';shDL(0);}
function chDC(d){const ct=d.conditionType,cp=d.conditionParams||{};if(ct==='has_item'&&cp.itemType)return me?.inventory?.some(i=>i&&i.id===cp.itemType);if(ct==='no_item'&&cp.itemType)return!me?.inventory?.some(i=>i&&i.id===cp.itemType);if(ct==='has_note')return cN.length>0;if(ct==='note_count'&&cp.count)return cN.length>=cp.count;return true;}
function shDL(i){if(!dD)return;const d=dD.dialogue;if(i<0)i=0;if(i>=d.lines.length){if(d.hasChoices&&d.choices?.length&&!dS.sc){const ca=d.choiceAfterLine?(d.choiceAfterLine-1):(d.lines.length-1);if(i>ca){shDCh();return;}}enD();return;}dS.cl=i;dS.sc=0;const ln=d.lines[i],ne=$('dialogue-name'),te=$('dialogue-text'),ce=$('dialogue-choices'),ct=$('dialogue-counter'),co=$('dialogue-continue');if(!ne||!te)return;if(ce){ce.style.display='none';ce.innerHTML='';}const sn=gSN(ln,d),sc=gSC(ln,d),em={neutral:'',happy:'😊',sad:'😢',angry:'😠',surprised:'😮',thinking:'🤔'}[ln.emotion||'neutral']||'';ne.innerHTML=`<span class="d-name-dot" style="background:${sc}"></span><span style="color:${sc}">${esc(sn)}</span>${em?`<span class="d-name-emotion">${em}</span>`:''}`;if(ct)ct.textContent=`${i+1}/${d.lines.length}`;if(co){co.textContent=mob?'Tap ▸':'E / Click ▸';co.style.display='inline';}if(dS.tt){clearInterval(dS.tt);dS.tt=null;}const tx=ln.text||'...',sp=ln.speed||d.typingSpeed||30,ef=ln.effect||'normal';dS.ti=0;dS.tp=1;te.className='dialogue-text';te.innerHTML='<span class="d-cursor"></span>';dS.tt=setInterval(()=>{if(!dA||!dD){clearInterval(dS.tt);dS.tt=null;return;}if(dS.ti<=tx.length){let dt2=tx.substring(0,dS.ti);if(ef==='wave'){dt2=dt2.split('').map((ch2,j)=>`<span style="animation-delay:${j*.05}s">${ch2===' '?'&nbsp;':esc(ch2)}</span>`).join('');te.className='dialogue-text d-text-wave';}else if(ef==='shake')te.className='dialogue-text d-text-shake';else if(ef==='glitch')te.className='dialogue-text d-text-glitch';else te.className='dialogue-text';te.innerHTML=(ef==='wave'?dt2:esc(dt2))+'<span class="d-cursor"></span>';dS.ti++;}else{clearInterval(dS.tt);dS.tt=null;dS.tp=0;if(ef==='wave')te.innerHTML=tx.split('').map((ch2,j)=>`<span style="animation-delay:${j*.05}s">${ch2===' '?'&nbsp;':esc(ch2)}</span>`).join('');else te.textContent=tx;if(d.hasChoices&&d.choices?.length){const ca=d.choiceAfterLine?(d.choiceAfterLine-1):(d.lines.length-1);if(i===ca)setTimeout(()=>{if(dA)shDCh();},200);}}},sp);}
function shDCh(){if(!dD)return;const d=dD.dialogue,ce=$('dialogue-choices'),co=$('dialogue-continue');if(!ce)return;dS.sc=1;ce.style.display='flex';ce.innerHTML='';if(co)co.textContent='';if(d.choicePrompt){const pe=document.createElement('div');pe.style.cssText='font-size:11px;color:#555;margin-bottom:2px;font-style:italic';pe.textContent=d.choicePrompt;ce.appendChild(pe);}d.choices.forEach((ch2,i)=>{const b=document.createElement('button');b.className='dialogue-choice-btn';b.innerHTML=`<span class="d-choice-key">${i+1}</span>${esc(ch2.text||'Choice '+(i+1))}`;b.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();hdCh(ch2,i);});b.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});ce.appendChild(b);});}
function hdCh(ch2){if(!dD)return;const ce=$('dialogue-choices');if(ce){ce.style.display='none';ce.innerHTML='';}dS.sc=0;if(ch2.action==='give_item'&&ch2.itemId&&me?.inventory){const es=me.inventory.findIndex(s=>s==null);if(es!==-1){const v=gv(ch2.itemId);me.inventory[es]={id:ch2.itemId,name:v.n};socket.emit('collect-item',{item:me.inventory[es]});uMB();uMS();}}if(ch2.action==='jump'&&ch2.jumpTo)shDL(Math.max(0,(ch2.jumpTo||1)-1));else if(ch2.action==='end')enD();else shDL(dS.cl+1);}
function adD(){if(!dA||!dD)return;if(dS.sc)return;if(dS.tp){if(dS.tt){clearInterval(dS.tt);dS.tt=null;}dS.tp=0;const d=dD.dialogue,ln=d.lines[dS.cl];if(!ln){enD();return;}const tx=ln.text||'...',te=$('dialogue-text'),ef=ln.effect||'normal';if(!te)return;if(ef==='wave'){te.innerHTML=tx.split('').map((ch2,j)=>`<span style="animation-delay:${j*.05}s">${ch2===' '?'&nbsp;':esc(ch2)}</span>`).join('');te.className='dialogue-text d-text-wave';}else if(ef==='shake'){te.textContent=tx;te.className='dialogue-text d-text-shake';}else if(ef==='glitch'){te.textContent=tx;te.className='dialogue-text d-text-glitch';}else{te.textContent=tx;te.className='dialogue-text';}if(d.hasChoices&&d.choices?.length){const ca=d.choiceAfterLine?(d.choiceAfterLine-1):(d.lines.length-1);if(dS.cl===ca)setTimeout(()=>{if(dA)shDCh();},100);}}else shDL(dS.cl+1);}
function enD(){if(dS.tt){clearInterval(dS.tt);dS.tt=null;}if(dD){const d=dD.dialogue,did=dD.dialogueId;if(d.oneTime&&did)dS.cm.add(did);if(d.endAction&&d.endAction!=='none')exDA(d);}dA=0;dD=null;dS.cl=0;dS.ti=0;dS.tp=0;dS.sc=0;dS.ld=null;['dialogue-overlay'].forEach(id=>{const e=$(id);if(e)e.style.display='none';});const ce=$('dialogue-choices');if(ce){ce.style.display='none';ce.innerHTML='';}const te=$('dialogue-text');if(te){te.textContent='';te.className='dialogue-text';}const ne=$('dialogue-name');if(ne)ne.innerHTML='';}
function exDA(d){const p=d.endActionParams||{};if(d.endAction==='give_item'&&p.itemType&&me?.inventory){const es=me.inventory.findIndex(s=>s==null);if(es!==-1){const v=gv(p.itemType);me.inventory[es]={id:p.itemType,name:v.n};socket.emit('collect-item',{item:me.inventory[es]});uMB();uMS();}}else if(d.endAction==='open_door'&&p.doorId)opD(p.doorId);else if(d.endAction==='teleport'&&p.x!==undefined&&me){me.x=p.x||0;me.y=p.y||0;me.vx=0;me.vy=0;}else if(d.endAction==='play_anim'&&p.anim&&dD?.avatar)dD.avatar.defaultAnim=p.anim;}
function gSN(ln,d){const s=ln.speaker||'npc';if(s==='npc')return d.npcName||dD?.avatar?.npcName||'NPC';if(s==='player')return me?.username||'You';if(s==='narrator')return'Narrator';return s;}
function gSC(ln,d){const s=ln.speaker||'npc';if(s==='npc')return d.nameColor||'#fff';if(s==='player')return'#aaa';return'#888';}
const dO=$('dialogue-overlay');
if(dO){const hd=e=>{if(e.target.closest('.dialogue-choice-btn')||dS.sc)return;adD();};dO.addEventListener('click',hd);dO.addEventListener('touchend',e=>{if(e.target.closest('.dialogue-choice-btn')||dS.sc)return;e.preventDefault();adD();},{passive:false});}

// ==================== AVATAR HELPERS ====================
function apE(t,tp){switch(tp){case'easeIn':return t*t;case'easeOut':return t*(2-t);case'easeInOut':return t<.5?2*t*t:-1+(4-2*t)*t;case'bounce':if(t<1/2.75)return 7.5625*t*t;if(t<2/2.75)return 7.5625*(t-=1.5/2.75)*t+.75;if(t<2.5/2.75)return 7.5625*(t-=2.25/2.75)*t+.9375;return 7.5625*(t-=2.625/2.75)*t+.984375;default:return t;}}
function dGA(ct,av,t){const w=av.w||22,h=av.h||34;let dir=av.direction||1,at=av.defaultAnim||'idle',sp=av.animSpeed||1;let dx2=av.x,dy2=av.y,ps=at,ao=0;if(at==='custom'&&av.keyframes?.length){const tot=av.keyframes.reduce((m,k)=>Math.max(m,k.time+(k.duration||.5)),1),lt=av.loop!==false?(t*sp)%tot:Math.min(t*sp,tot);let ak=av.keyframes[0];for(let i=av.keyframes.length-1;i>=0;i--)if(lt>=av.keyframes[i].time){ak=av.keyframes[i];break;}if(ak){ps=ak.pose||'idle';const pg=Math.min(1,(lt-ak.time)/(ak.duration||.5)),ea=apE(pg,ak.easing||'linear');dx2=av.x+(ak.dx||0)*ea;dy2=av.y+(ak.dy||0)*ea;if(ak.dir)dir=ak.dir;}}if(ps==='idle')ao=Math.sin(t*sp*3)*1.5;if(ps==='dance')ao=Math.sin(t*sp*6)*3;if(ps==='wave')ao=Math.sin(t*sp*4);if(ps==='jump')ao=-Math.abs(Math.sin(t*sp*3))*8;ct.save();ct.translate(dx2,dy2+ao);if(av.usePlayerAvatar&&me&&TC){TC.draw(ct,-w/2,-h/2,w,h,dir,ps==='run'?'run':ps==='jump'?'jump':'idle',ps==='run'?Math.floor(t*sp*8)%4:0,me.avatar,null,false,t,{equipped:me.equipped||{}});ct.restore();return;}const bc=av.bodyColor||'#fff',hc=av.headColor||'#fff',ec=av.eyeColor||'#000';const bw=w*.55,bh=h*.45,hw2=w*.5,hh2=w*.5;ct.fillStyle='rgba(0,0,0,0.15)';ct.beginPath();ct.ellipse(0,h/2,w*.35,2,0,0,Math.PI*2);ct.fill();const lw=bw*.35,lh=h*.25;ct.fillStyle=bc;if(ps==='sit')ct.fillRect(-bw/2,h*.2,bw,lh*.6);else{let ll=-lw-1,rl=1;if(ps==='run'){ll+=Math.sin(t*sp*8)*3;rl-=Math.sin(t*sp*8)*3;}ct.fillRect(ll,h*.25,lw,lh);ct.fillRect(rl,h*.25,lw,lh);}ct.fillStyle=bc;ct.fillRect(-bw/2,-h*.15,bw,bh);ct.fillStyle=hc;ct.fillRect(-hw2/2,-h*.5,hw2,hh2);const ey=-h*.35,ez=Math.max(1.5,w*.08);ct.fillStyle=ec;if(dir===1){ct.fillRect(1,ey,ez,ez);ct.fillRect(hw2/2-ez-1,ey,ez,ez);}else{ct.fillRect(-hw2/2+1,ey,ez,ez);ct.fillRect(-1-ez,ey,ez,ez);}const aw=3,ah=bh*.7;let la=0,ra=0;if(ps==='run'){la=Math.sin(t*sp*8)*.5;ra=-la;}if(ps==='wave')ra=-Math.sin(t*sp*6)*.8-.5;if(ps==='dance'){la=Math.sin(t*sp*6)*.7;ra=Math.sin(t*sp*6+Math.PI)*.7;}ct.fillStyle=bc;ct.save();ct.translate(-bw/2-aw,-h*.12);ct.rotate(la);ct.fillRect(-aw/2,0,aw,ah);ct.restore();ct.save();ct.translate(bw/2,-h*.12);ct.rotate(ra);ct.fillRect(-aw/2,0,aw,ah);ct.restore();const nn=av.dialogue?.npcName||av.npcName||'';if(!av.usePlayerAvatar&&nn){ct.fillStyle=av.dialogue?.nameColor||'#fff';ct.font='10px Inter';ct.textAlign='center';ct.fillText(nn,0,-h/2-8);}if(av.interactive&&!dA){const tk=av.dialogue?.triggerKey||'E',pa=.4+Math.sin(t*3)*.2;ct.fillStyle=`rgba(255,255,255,${pa*.3})`;ct.beginPath();ct.arc(0,-h/2-20,8,0,Math.PI*2);ct.fill();ct.fillStyle=`rgba(255,255,255,${pa+.2})`;ct.font='bold 9px Inter';ct.textAlign='center';ct.textBaseline='middle';ct.fillText(tk,0,-h/2-20);}ct.restore();}
function fNIA(){if(!me||!wAv.length)return null;const px=me.x+me.width/2,py=me.y+me.height/2;let b=null,bd=1e9;for(const av of wAv){if(!av.interactive)continue;const tr=av.dialogue?.triggerRadius||80,d=Math.sqrt((px-av.x)**2+(py-av.y)**2);if(d<tr&&d<bd){b=av;bd=d;}}return b;}

// ==================== DOOR/MODEL ====================
function dDF(ct,x,y,w,h){ct.fillStyle='#1a1a1a';ct.fillRect(x-3,y-3,w+6,h+6);ct.fillStyle='#222';ct.fillRect(x,y,w,h);}
function dDP(ct,x,y,w,h,cl,dt2,pr,t){ct.fillStyle=cl;ct.fillRect(x,y,w,h);ct.fillStyle='rgba(255,255,255,0.08)';ct.fillRect(x,y,w,2);ct.fillStyle='rgba(0,0,0,0.15)';ct.fillRect(x,y+h-3,w,3);if(dt2==='key'){const hx=x+w-12;ct.fillStyle='#B8860B';ct.beginPath();ct.arc(hx,y+h*.45,4,0,6.283);ct.fill();ct.fillStyle='#DAA520';ct.beginPath();ct.arc(hx,y+h*.55,3,0,6.283);ct.fill();ct.fillStyle='#111';ct.beginPath();ct.arc(hx,y+h*.55,1.5,0,6.283);ct.fill();}else if(dt2==='simple'){const hx=x+w-10,hy=y+h*.5;ct.fillStyle='#999';ct.beginPath();ct.arc(hx,hy,3.5,0,6.283);ct.fill();ct.fillStyle='#bbb';ct.fillRect(hx-6,hy-1,6,2);}else if(dt2==='keycard'){const cc=kcC(pr);ct.fillStyle=cc;ct.fillRect(x,y,3,h);ct.fillRect(x+w-3,y,3,h);const cx2=x+w-18,cy2=y+h/2-14;ct.fillStyle='#1a1a1a';ct.fillRect(cx2,cy2,14,28);ct.fillStyle=cc;ct.fillRect(cx2+2,cy2+6,10,3);ct.fillStyle=Math.sin(t*3)>0?cc:'#222';ct.beginPath();ct.arc(cx2+7,cy2+20,2.5,0,6.283);ct.fill();}else{ct.strokeStyle='#777';ct.lineWidth=2;ct.beginPath();ct.arc(x+w/2,y+h/2,9,0,6.283);ct.stroke();for(let a=0;a<6.283;a+=1.047){ct.beginPath();ct.moveTo(x+w/2+Math.cos(a+t)*9,y+h/2+Math.sin(a+t)*9);ct.lineTo(x+w/2+Math.cos(a+t)*13,y+h/2+Math.sin(a+t)*13);ct.stroke();}ct.fillStyle='#555';ct.beginPath();ct.arc(x+w/2,y+h/2,3,0,6.283);ct.fill();}}
function dDr(ct,m,t){const mw=m.w||40,mh=m.h||80;if(!inV(m.x-5,m.y-15,mw+10,mh+20))return;const a=drA[m.id],rw=a?a.p:0,p=rw<.5?2*rw*rw:1-Math.pow(-2*rw+2,2)/2;const dir=m.properties?.direction||'right',cl=m.properties?.color||(m.type==='door_key'?'#8B4513':m.type==='door_simple'?'#666':'#555');let dt2='key';if(m.type==='door_simple')dt2='simple';else if(m.type==='door_keycard')dt2='keycard';else if(m.type==='door_lever')dt2='lever';dDF(ct,m.x,m.y,mw,mh);if(p>.01){ct.fillStyle=`rgba(0,0,0,${.4+p*.4})`;ct.fillRect(m.x,m.y,mw,mh);}if(p<.98){ct.save();ct.beginPath();ct.rect(m.x-5,m.y-5,mw+10,mh+10);ct.clip();let px=m.x,py=m.y;if(dir==='right')px+=mw*p;else if(dir==='left')px-=mw*p;else if(dir==='up')py-=mh*p;else py+=mh*p;dDP(ct,px,py,mw,mh,cl,dt2,m.properties,t);ct.restore();}ct.strokeStyle='#333';ct.lineWidth=1;ct.strokeRect(m.x-3,m.y-3,mw+6,mh+6);ct.fillStyle='#252525';ct.fillRect(m.x-5,m.y-6,mw+10,4);ct.fillRect(m.x-5,m.y+mh+3,mw+10,3);if(p<.05&&dt2!=='simple'){ct.font='bold 10px Inter';ct.textAlign='center';ct.fillText(dt2==='key'?'🔒':dt2==='keycard'?'💳':'⚙',m.x+mw/2,m.y-12);}}
function dLv(ct,x,y,w,h,act,t){if(!inV(x,y,w,h))return;ct.fillStyle='#444';ct.fillRect(x,y+h-8,w,8);ct.fillStyle='#666';ct.beginPath();ct.arc(x+w/2,y+h-8,5,0,6.283);ct.fill();const ag=act?.7:-.7,lx=x+w/2+Math.sin(ag)*(h-12),ly=y+h-8-Math.cos(ag)*(h-12);ct.strokeStyle='#888';ct.lineWidth=4;ct.beginPath();ct.moveTo(x+w/2,y+h-8);ct.lineTo(lx,ly);ct.stroke();ct.fillStyle=act?'#44CC44':'#CC3333';ct.beginPath();ct.arc(lx,ly,5,0,6.283);ct.fill();}
function dKc(ct,x,y,w,h,pr,t){if(!inV(x-20,y-20,w+40,h+40))return;const cc=kcC(pr);ct.save();ct.translate(x+w/2,y+h/2+Math.sin(t*2)*3);ct.rotate(Math.sin(t*1.5)*.1);ct.fillStyle=cc;ct.fillRect(-w/2,-h/2,w,h);ct.fillStyle='rgba(255,255,255,0.3)';ct.fillRect(-w/2,-h/2+h*.3,w,h*.15);ct.fillStyle='#FFD700';ct.fillRect(-w/2+3,-h/2+3,6,4);ct.restore();}

function getDB(){const b=[];for(const m of wM){if(!m.type.startsWith('door_'))continue;const a=drA[m.id],p=a?a.p:0;if(p>=.95)continue;const mw=m.w||40,mh=m.h||80,dir=m.properties?.direction||'right';let bx=m.x,by=m.y,bw=mw,bh=mh;if(dir==='up'){bh=mh*(1-p);by=m.y+mh*p;}else if(dir==='down')bh=mh*(1-p);else if(dir==='left'){bw=mw*(1-p);bx=m.x+mw*p;}else bw=mw*(1-p);if(bw>1&&bh>1)b.push({x:bx,y:by,w:bw,h:bh});}return b;}
function nI(){if(!me)return null;const px=me.x+me.width/2,py=me.y+me.height/2;let b=null,bd=1e9;for(const m of wM){const mw=m.w||40,mh=m.h||80,d=Math.sqrt((px-m.x-mw/2)**2+(py-m.y-mh/2)**2);const can=m.type==='lever'||m.type==='door_simple'||(m.type==='door_key'&&!drs[m.id])||(m.type==='door_keycard'&&!drs[m.id]);if(can&&d<60+Math.max(mw,mh)/2&&d<bd){b=m;bd=d;}}const nav=fNIA();if(nav){const d=Math.sqrt((px-nav.x)**2+(py-nav.y)**2);if(d<bd)b=nav;}const nv=findNearVehicle();if(nv){const vx=nv.x+(nv.w||120)/2,vy=nv.y+(nv.h||50)/2;const d=Math.sqrt((px-vx)**2+(py-vy)**2);if(d<bd){b=nv;bd=d;}}return b;}

function inter(){
  if(!me||iCd>0)return;
  if(dA){adD();return;}
  if(me.inVehicle){exitVehicle();return;}
  iCd=.3;
  const px=me.x+me.width/2,py=me.y+me.height/2;
  // Check vehicle first
  const nv=findNearVehicle();
  if(nv){enterVehicle(nv);return;}
  // Check avatar
  const nav=fNIA();
  if(nav){const d=Math.sqrt((px-nav.x)**2+(py-nav.y)**2);if(d<(nav.dialogue?.triggerRadius||80)){if(nav.dialogue?.lines?.length)stD(nav);return;}}
  // Check models
  for(const m of wM){const mw=m.w||40,mh=m.h||80,d=Math.sqrt((px-m.x-mw/2)**2+(py-m.y-mh/2)**2);if(d>60+Math.max(mw,mh)/2)continue;if(m.type==='door_simple'){if(drs[m.id]){clD(m.id);iM('Door closed');}else{opD(m.id);iM('Door opened');}return;}if(m.type==='lever'){if(!lvs[m.id]){lvs[m.id]=true;if(m.properties?.targetId)opD(m.properties.targetId);wM.forEach(d2=>{if(d2.type==='door_lever'&&d2.properties?.leverId===m.id)opD(d2.id);});iM('Lever activated!');}else if(!m.properties?.oneTime){lvs[m.id]=false;if(m.properties?.targetId)clD(m.properties.targetId);wM.forEach(d2=>{if(d2.type==='door_lever'&&d2.properties?.leverId===m.id)clD(d2.id);});iM('Lever deactivated');}return;}if(m.type==='door_key'&&!drs[m.id]){const ki=me.inventory?.findIndex(it=>it?.id==='key');if(ki!==-1&&ki!==undefined){opD(m.id);me.inventory[ki]=null;iM('Door unlocked!');}else iM('You need a key!');return;}if(m.type==='door_keycard'&&!drs[m.id]){const req=m.properties?.keycardColor||'red';if(kcs[req]){opD(m.id);iM(`${req} keycard door opened!`);}else iM(`Need ${req} keycard!`);return;}}
}
function opD(id){drs[id]=true;drA[id]={p:drA[id]?.p||0,open:true};}
function clD(id){drs[id]=false;drA[id]={p:drA[id]?.p||1,open:false};}
function iM(t){iMs.push({text:t,timer:3,alpha:1});}
function uDrs(dt){for(const id in drA){const a=drA[id],m=wM.find(md=>md.id===id),sp=m?.properties?.openSpeed||2;if(a.open)a.p=Math.min(1,a.p+sp*dt);else a.p=Math.max(0,a.p-sp*dt);}}
function chKC(){if(!me)return;const px=me.x+me.width/2,py=me.y+me.height/2;for(const m of wM){if(m.type!=='keycard'||kcs[m.id])continue;const mw=m.w||30,mh=m.h||20;if(Math.sqrt((px-m.x-mw/2)**2+(py-m.y-mh/2)**2)<35){const cl=m.properties?.cardColor||'red';kcs[cl]=true;kcs[m.id]=true;iM(`Collected ${cl} keycard!`);}}}

function resize(){cv.width=innerWidth;cv.height=innerHeight;}
resize();addEventListener('resize',resize);

const socket=io();
function sL(p,t){$('loader-fill').style.width=p+'%';$('loader-text').textContent=t;}
sL(20,'Connecting...');

socket.on('connect',()=>{sL(40,'Authenticating...');socket.emit('join-game',{token:tok,place:pn});});

socket.on('game-init',data=>{
  sL(60,'Loading TuGame...');
  pd=data.place;me=data.player;mid=data.player.id;
  me.cpIdx=-1;me.atkT=0;me._me=true;
  wC=[];col=new Set();fx={};wM=[];drs={};drA={};lvs={};kcs={};wAv=[];wV=[];vStates=data.vehicleStates||{};myVeh=null;
  flOn=1;shOn=1;cN=[];cNi=-1;nR=0;nT='';dA=0;dD=null;
  if(dS.tt){clearInterval(dS.tt);dS.tt=null;}
  Object.assign(dS,{cl:0,ti:0,tp:0,sc:0,ld:null});dS.cm=new Set();
  ['dialogue-overlay','note-overlay'].forEach(id=>{const e=$(id);if(e)e.style.display='none';});

  H={on:0,bat:100,mb:100,dr:.8,rg:.3,fl:0,ft:0,br:0,sx:0,sy:0,sc:new Set(),sr:null,st:0,ch:null,pt:[],ms:[],ey:[],hb:0,nr:0};
  const gs=pd.settings||{};
  if(pd.horror||pd.darkness||gs.darknessEnabled){
    H.on=1;H.bat=gs.batteryMax||pd.flashlightBattery||100;H.mb=H.bat;H.dr=gs.batteryDrain||pd.batteryDrainRate||.8;H.rg=gs.batteryRegen||pd.batteryRechargeRate||.3;
    for(let i=0;i<30;i++)H.pt.push({x:Math.random()*5600,y:Math.random()*900,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.2,sz:1+Math.random()*2,a:Math.random()*.3});
    if(gs.darknessEnabled){pd.flashlightRadius=pd.flashlightRadius||gs.flashlightRadius||220;pd.flashlightBrightness=pd.flashlightBrightness||gs.flashlightBrightness||1.2;pd.flashlightSpread=pd.flashlightSpread||gs.flashlightSpread||.45;pd.ambientLight=pd.ambientLight||gs.ambientLight||.02;pd.flickerChance=pd.flickerChance||gs.flickerChance||.003;if(gs.particles)pd.ambientParticles=true;if(gs.breathing)pd.breathingEffect=true;if(gs.footstepShake)pd.footstepShake=true;}
  }
  if(gs.fogEnabled)pd.fog={on:1,color:gs.fogColor,density:gs.fogDensity,start:gs.fogStart,end:gs.fogEnd};
  if(gs.vignette)pd.vignette={on:1,intensity:gs.vignetteIntensity,color:gs.vignetteColor};
  if(gs.tintEnabled)pd.tint={on:1,color:gs.tintColor,opacity:gs.tintOpacity};

  if(pd.collectibleItems)pd.collectibleItems.forEach((ci,i)=>wC.push({id:'wc_'+i,type:ci.type,x:ci.x,y:ci.y,props:ci.properties||{},done:0,touch:ci.collectOnTouch!==false}));
  if(pd.items&&Array.isArray(pd.items))pd.items.forEach((it,i)=>{if(!it)return;if(it.giveOnStart){if(me.inventory){const es=me.inventory.findIndex(s=>s==null);if(es!==-1)me.inventory[es]={id:it.type,...(it.properties||{})};}col.add(it.id);}else wC.push({id:it.id||('si_'+i),type:it.type,x:it.x,y:it.y,props:it.properties||{},done:0,touch:it.collectOnTouch!==false});});
  if(pd.models)pd.models.forEach(m=>{if(!m)return;wM.push({id:m.id,type:m.type,x:m.x,y:m.y,w:m.w||(m.type==='lever'?30:m.type==='keycard'?30:40),h:m.h||(m.type==='lever'?40:m.type==='keycard'?20:80),properties:m.properties||{}});});
  if(pd.avatars)pd.avatars.forEach(av=>{if(!av)return;wAv.push({id:av.id,x:av.x,y:av.y,w:av.w||22,h:av.h||34,direction:av.direction||1,defaultAnim:av.defaultAnim||'idle',animSpeed:av.animSpeed||1,loop:av.loop!==false,interactive:av.interactive||false,usePlayerAvatar:av.usePlayerAvatar||false,bodyColor:av.bodyColor||'#fff',headColor:av.headColor||'#fff',eyeColor:av.eyeColor||'#000',keyframes:av.keyframes||[],npcName:av.npcName||(av.dialogue?.npcName)||'',dialogue:av.dialogue||null,properties:av.properties||{}});});
  // Load vehicles
  if(pd.vehicles)pd.vehicles.forEach(v=>{if(!v)return;const def=VD[v.type]||VD.car;wV.push({id:v.id,type:v.type||'car',x:v.x,y:v.y,w:v.w||def.w,h:v.h||def.h,direction:v.direction||1,bodyColor:v.bodyColor||'#3b82f6',accentColor:v.accentColor||'#1e3a5f',wheelColor:v.wheelColor||'#222',windowColor:v.windowColor||'#87ceeb',windowOpacity:v.windowOpacity||.6,maxSpeed:v.maxSpeed||def.ms,acceleration:v.acceleration||def.ac,brakeForce:v.brakeForce||def.bf,friction:v.friction||.05,jumpForce:v.jumpForce||def.jf,mass:v.mass||def.m,drivable:v.drivable!==false,enterKey:v.enterKey||'E',enterRadius:v.enterRadius||60,headlights:v.headlights||false,lightRange:v.lightRange||200,lightColor:v.lightColor||'#ffffaa',horn:v.horn||false,respawnable:v.respawnable!==false,seats:v.seats||def.s,vx:0,vy:0,onGround:false,wheelRotation:0,headlightsOn:false,_driving:false,_driverName:null,properties:v.properties||{}});});
  // Restore vehicle states from server
  for(const [vid,vs] of Object.entries(vStates)){const v=wV.find(vv=>vv.id===vid);if(v&&vs){v.x=vs.x||v.x;v.y=vs.y||v.y;v.direction=vs.direction||v.direction;}}

  rp={};for(const[id,p]of Object.entries(data.players)){if(id!==mid)rp[id]={...p,tx:p.x,ty:p.y,dx:p.x,dy:p.y,atkT:0,iSt:{}};}
  $('hud-place').textContent=pd.name;uPC();uMB();uMS();
  sL(100,'Ready!');
  setTimeout(()=>{const ls=$('loading-screen');ls.style.opacity='0';setTimeout(()=>{ls.style.display='none';rdy=1;sM(`Welcome to ${pd.name}!`);if(H.on)sM("It's dark... Press F for flashlight");if(wM.length||wAv.some(a=>a.interactive))sM('Press E to interact');if(wV.length)sM('Press E near vehicles to drive');if(mob)sM('Touch controls enabled');me.inventory?.forEach(it=>{if(it)sM(`Equipped: ${gv(it.id).n}`);});},500);},400);
});

// ==================== VEHICLE SOCKET EVENTS ====================
socket.on('vehicle-entered',d=>{
  const v=wV.find(vv=>vv.id===d.vehicleId);if(!v)return;
  if(d.isDriver)v._driverName=d.username;
  if(d.playerId!==socket.id){const p=rp[d.playerId];if(p){p.inVehicle=d.vehicleId;sM(`${d.username} entered ${VD[v.type]?.n||'vehicle'}`);}}
});
socket.on('vehicle-exited',d=>{
  const v=wV.find(vv=>vv.id===d.vehicleId);if(!v)return;
  if(!d.driver)v._driverName=null;
  else{const dp=rp[d.driver];if(dp)v._driverName=dp.username;else if(d.driver===socket.id)v._driverName=me?.username;}
  if(d.playerId!==socket.id){const p=rp[d.playerId];if(p){p.inVehicle=null;sM(`${d.username||'Player'} exited vehicle`);}}
});
socket.on('vehicle-moved',d=>{
  const v=wV.find(vv=>vv.id===d.vehicleId);if(!v)return;
  v.x=d.x;v.y=d.y;v.vx=d.vx||0;v.vy=d.vy||0;v.direction=d.direction||1;v.wheelRotation=d.wheelRotation||0;
  // Update passengers positions
  for(const[id,p]of Object.entries(rp)){if(p.inVehicle===d.vehicleId){p.tx=d.x+v.w/2-(p.width||32)/2;p.ty=d.y-10;}}
});
socket.on('promoted-to-driver',d=>{
  const v=wV.find(vv=>vv.id===d.vehicleId);if(!v)return;
  me.isDriver=true;v._driving=true;v._driverName=me?.username;myVeh=v;sM('You are now the driver!');
});
socket.on('vehicle-horn',d=>{sM('BEEP!');});
socket.on('vehicle-headlights',d=>{const v=wV.find(vv=>vv.id===d.vehicleId);if(v)v.headlightsOn=d.on;});
socket.on('vehicle-exit-position',d=>{if(me){me.x=d.x;me.y=d.y;me.vx=0;me.vy=0;}});

// ==================== OTHER SOCKET EVENTS ====================
socket.on('player-joined',p=>{rp[p.id]={...p,tx:p.x,ty:p.y,dx:p.x,dy:p.y,atkT:0,iSt:{}};uPC();sM(`${p.username} joined`);});
socket.on('player-left',d=>{const p=rp[d.id];if(p)sM(`${p.username} left`);delete rp[d.id];uPC();});
socket.on('player-moved',d=>{const p=rp[d.id];if(!p)return;p.tx=d.x;p.ty=d.y;p.vx=d.vx;p.vy=d.vy;p.direction=d.direction;p.state=d.state;p.frame=d.frame;p.activeSlot=d.activeSlot;p.hp=d.hp;if(d.itemState)p.iSt=d.itemState;if(d.inVehicle!==undefined)p.inVehicle=d.inVehicle;});
socket.on('player-respawn',d=>{if(me){dth.on=1;dth.t=0;dth.ox=me.x;dth.oy=me.y;dth.nx=d.x;dth.ny=d.y;dth.nh=d.hp;}});
socket.on('player-hit',d=>{if(me){const si=me.inventory?.[me.activeSlot];if(si?.id==='shield'&&shOn&&Math.random()<(si.blockChance||.5)){sM('Shield blocked!');return;}me.hp=d.hp;me.vx+=d.knockX;me.vy+=d.knockY;}});
socket.on('player-attack',d=>{const p=rp[d.id];if(p){p.attacking=true;p.atkT=Date.now();}});
socket.on('inventory-update',d=>{if(me){me.inventory=d.inventory;uMB();uMS();}});
socket.on('kill-feed',d=>sM(`${d.killer} eliminated ${d.victim}`));
socket.on('chat-message',d=>aC(d.username,d.msg));
socket.on('error-msg',m=>{alert(m);location.href='/home';});
socket.on('kicked',r=>{rdy=0;const o=$('kicked-overlay');if(o)o.style.display='flex';const re=$('kicked-reason');if(re)re.textContent=r||'Disconnected';});

function togI(){if(!me)return;const it=me.inventory?.[me.activeSlot];if(!it)return;const v=gv(it.id);if(!v.tg)return;if(it.id==='flashlight'){flOn=!flOn;sM(flOn?'Flashlight ON':'Flashlight OFF');}else if(it.id==='shield'){shOn=!shOn;sM(shOn?'Shield raised':'Shield lowered');}uMU();}
function uMB(){if(!mob||!me)return;const has=me.inventory?.some(i=>i?.id==='sword');const ab=$('mobile-btn-attack');if(ab)ab.style.display=(pd?.type==='pvp'||has)?'flex':'none';uMU();uMI();uNB();}
function uMU(){if(!mob||!me)return;const ub=$('mobile-btn-use');if(!ub)return;const it=me.inventory?.[me.activeSlot];ub.style.display=(it&&gv(it.id).tg)?'flex':'none';}
function uMI(){if(!mob)return;const ib=$('mobile-btn-interact');if(ib)ib.style.display=(nI()||dA||me?.inVehicle)?'flex':'none';}
function uMS(){if(!mob||!me)return;document.querySelectorAll('.mobile-slot').forEach(btn=>{const s=parseInt(btn.dataset.slot),it=me.inventory?.[s];btn.classList.toggle('active',s===me.activeSlot);btn.classList.toggle('has-item',!!it);const od=btn.querySelector('.mobile-slot-dot');if(od)od.remove();if(it){const v=gv(it.id);btn.textContent=v.n.substring(0,2).toUpperCase();btn.style.borderColor=s===me.activeSlot?v.c:`${v.c}44`;const d=document.createElement('div');d.className='mobile-slot-dot';d.style.background=v.c;btn.appendChild(d);}else{btn.textContent=String(s+1);btn.style.borderColor='';}});}

// ==================== KEYBOARD ====================
addEventListener('keydown',e=>{
  if(nR){if(e.key==='n'||e.key==='N'||e.key==='Escape'){hN();e.preventDefault();return;}if(e.key==='ArrowRight'||e.key==='ArrowDown'){nxN();e.preventDefault();return;}if(e.key==='ArrowLeft'||e.key==='ArrowUp'){pvN();e.preventDefault();return;}return;}
  if((e.key==='n'||e.key==='N')&&!chOn&&!escOn&&!dA){if(cN.length>0){shN(cN.length-1);e.preventDefault();return;}}
  if(dA){if(e.key==='e'||e.key==='E'||e.key===' '||e.key==='Enter'){adD();e.preventDefault();return;}if(e.key==='Escape'){enD();e.preventDefault();return;}if(dS.sc&&e.key>='1'&&e.key<='9'){const d=dD?.dialogue;if(d?.choices){const ci=parseInt(e.key)-1;if(d.choices[ci]){hdCh(d.choices[ci],ci);e.preventDefault();}}return;}return;}
  if(chOn){if(e.key==='Enter'){const m=$('chat-input').value.trim();if(m)socket.emit('chat-message',{msg:m});clCh();e.preventDefault();return;}if(e.key==='Escape'){clCh();e.preventDefault();return;}return;}
  if(e.key==='Escape'){togEsc();e.preventDefault();return;}
  if(escOn)return;
  if(e.key==='Enter'){opCh();e.preventDefault();return;}
  if(e.key>='1'&&e.key<='4'){const s=parseInt(e.key)-1;if(me){me.activeSlot=s;socket.emit('switch-slot',{slot:s});uMB();uMS();}e.preventDefault();return;}
  if(e.key==='f'||e.key==='F'){togI();e.preventDefault();return;}
  if(e.key==='e'||e.key==='E'){inter();e.preventDefault();return;}
  if(e.key==='h'||e.key==='H'){vehicleHorn();e.preventDefault();return;}
  if(e.key==='l'||e.key==='L'){vehicleHL();e.preventDefault();return;}
  K[e.code]=true;
});
addEventListener('keyup',e=>{K[e.code]=false;});
addEventListener('blur',()=>{K={};});
cv.addEventListener('mousedown',e=>{if(!rdy||escOn||chOn||!me||dth.on||mob||nR||dA)return;if(e.button===0)doAt();});
function doAt(){if(!me||me.inVehicle)return;const it=me.inventory?.[me.activeSlot];if(it?.id==='sword'){const now=Date.now();if(now-me.atkT>AD){socket.emit('attack',{});me.attacking=true;me.atkT=now;}}}

function initMob(){
  if(!mob)return;$('mobile-controls').style.display='block';
  const jz=$('mobile-joystick-zone'),je=$('mobile-joystick'),ke=$('mobile-joystick-knob');
  const JR=50,DZ=10;let jt=null;
  jz.addEventListener('touchstart',e=>{if(jt!==null)return;e.preventDefault();const t=e.changedTouches[0];jt=t.identifier;const r=jz.getBoundingClientRect(),cx=t.clientX-r.left,cy=t.clientY-r.top;je.style.left=(cx-JR)+'px';je.style.top=(cy-JR)+'px';je.classList.add('active');joy.on=1;joy.sx=cx;joy.sy=cy;joy.dx=0;joy.dy=0;ke.style.transform='translate(0px,0px)';},{passive:false});
  jz.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches){if(t.identifier!==jt)continue;const r=jz.getBoundingClientRect();let dx=t.clientX-r.left-joy.sx,dy=t.clientY-r.top-joy.sy;const d=Math.sqrt(dx*dx+dy*dy);if(d>JR){dx=dx/d*JR;dy=dy/d*JR;}joy.dx=Math.abs(dx)>DZ?dx/JR:0;joy.dy=Math.abs(dy)>DZ?dy/JR:0;ke.style.transform=`translate(${dx}px,${dy}px)`;}},{passive:false});
  function rj(){jt=null;joy.on=0;joy.dx=0;joy.dy=0;ke.style.transform='translate(0px,0px)';je.classList.remove('active');}
  jz.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===jt)rj();});
  jz.addEventListener('touchcancel',e=>{for(const t of e.changedTouches)if(t.identifier===jt)rj();});
  function btn(el,dn,up){el.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();el.classList.add('pressed');dn();},{passive:false});el.addEventListener('touchend',e=>{e.preventDefault();el.classList.remove('pressed');if(up)up();});el.addEventListener('touchcancel',()=>{el.classList.remove('pressed');if(up)up();});}
  btn($('mobile-btn-jump'),()=>{mJ=true;},()=>{mJ=false;});
  btn($('mobile-btn-attack'),()=>{mA=true;doAt();},()=>{mA=false;});
  btn($('mobile-btn-use'),()=>togI());
  btn($('mobile-btn-interact'),()=>inter());
  btn($('mobile-btn-chat'),()=>{chOn?clCh():opCh();});
  btn($('mobile-btn-menu'),()=>togEsc());
  const nb=$('mobile-btn-note');
  if(nb){btn(nb,()=>{if(nR){cN.length>1?nxN():hN();}else if(cN.length>0)shN(cN.length-1);});let nh2=null;nb.addEventListener('touchstart',()=>{nh2=setTimeout(()=>{if(nR)hN();},600);},{passive:true});nb.addEventListener('touchend',()=>{if(nh2)clearTimeout(nh2);});nb.addEventListener('touchcancel',()=>{if(nh2)clearTimeout(nh2);});}
  let nsX=0;const no=$('note-overlay');
  if(no){no.addEventListener('touchstart',e=>{if(!nR)return;nsX=e.touches[0].clientX;},{passive:true});no.addEventListener('touchend',e=>{if(!nR||cN.length<=1)return;const dx=e.changedTouches[0].clientX-nsX;if(Math.abs(dx)>50){dx<0?nxN():pvN();}},{passive:true});}
  document.querySelectorAll('.mobile-slot').forEach(b=>{b.addEventListener('touchstart',e=>{e.preventDefault();const s=parseInt(b.dataset.slot);if(me){me.activeSlot=s;socket.emit('switch-slot',{slot:s});uMB();uMS();}},{passive:false});});
  cv.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
  cv.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
}

function opCh(){chOn=1;$('chat-input-container').style.display='block';const ci=$('chat-input');ci.value='';ci.focus();K={};}
function clCh(){chOn=0;$('chat-input-container').style.display='none';$('chat-input').blur();K={};}
function aC(u,m){const d=document.createElement('div');d.className='chat-msg';d.innerHTML=`<span class="chat-user">${esc(u)}:</span><span class="chat-text">${esc(m)}</span>`;const cm=$('chat-messages');cm.appendChild(d);cm.scrollTop=cm.scrollHeight;setTimeout(()=>{d.style.transition='opacity 1s';d.style.opacity='0';setTimeout(()=>d.remove(),1e3);},1e4);}
function sM(m){const d=document.createElement('div');d.className='chat-msg system';d.textContent=m;const cm=$('chat-messages');cm.appendChild(d);cm.scrollTop=cm.scrollHeight;setTimeout(()=>{d.style.transition='opacity 1s';d.style.opacity='0';setTimeout(()=>d.remove(),1e3);},5e3);}

function togEsc(){escOn=!escOn;$('esc-menu').style.display=escOn?'block':'none';K={};if(escOn)uEsc();}
function uEsc(){const l=$('menu-player-list');l.innerHTML='';const all=[];if(me)all.push({...me,isMe:true});for(const p of Object.values(rp))all.push({...p,isMe:false});$('menu-player-count').textContent=`(${all.length})`;all.forEach(p=>{const item=document.createElement('div');item.className='player-list-item';const av=document.createElement('div');av.className='player-avatar-mini';const mc=document.createElement('canvas');mc.width=40;mc.height=40;av.appendChild(mc);const c2=mc.getContext('2d');c2.fillStyle='#111';c2.fillRect(0,0,40,40);TC.draw(c2,12,2,16,28,1,'idle',0,p.avatar,null,false,Date.now()/1e3,{equipped:p.equipped||{}});const nm=document.createElement('span');nm.className='player-name';nm.textContent=p.username;item.appendChild(av);item.appendChild(nm);if(p.isMe){const y=document.createElement('span');y.className='player-you';y.textContent='YOU';item.appendChild(y);}l.appendChild(item);});}

$('btn-resume').addEventListener('click',togEsc);
$('btn-leave').addEventListener('click',()=>location.href='/home');
$('btn-reset').addEventListener('click',()=>{if(!me||!pd)return;me.x=pd.spawnX;me.y=pd.spawnY;me.vx=0;me.vy=0;me.hp=me.maxHp||100;me.cpIdx=-1;me.checkpoint={x:pd.spawnX,y:pd.spawnY};fx={};flOn=1;shOn=1;drs={};drA={};lvs={};kcs={};cN=[];cNi=-1;if(nR)hN();if(me.inVehicle)exitVehicle();wM.forEach(m=>{if(m.type==='keycard')delete kcs[m.id];});wC.forEach(ci=>{if(ci.type==='note'){ci.done=0;col.delete(ci.id);}});if(H.on){H.bat=H.mb;H.sc=new Set();H.ms=[];H.ey=[];H.ch=null;}if(dA)enD();dS.cm=new Set();dS.ld=null;uMB();togEsc();sM('Reset to spawn');});

function uPC(){const cnt=1+Object.keys(rp).length;$('hud-players').textContent=`${cnt} player${cnt!==1?'s':''}`;}

function uH(dt){
  if(!H.on||!me)return;const t=Date.now()/1e3,px=me.x+me.width/2,py=me.y+me.height/2;
  if(flOn){H.bat-=H.dr*dt;if(H.bat<=0){H.bat=0;flOn=0;sM('Battery dead!');uMU();}}else{H.bat+=H.rg*dt;if(H.bat>H.mb)H.bat=H.mb;}
  if(flOn&&H.bat<20&&Math.random()<(pd.flickerChance||.003)*(1+(20-H.bat)/10)){H.fl=1;H.ft=.05+Math.random()*.15;}
  if(H.fl){H.ft-=dt;if(H.ft<=0)H.fl=0;}
  if(pd.breathingEffect)H.br+=dt*(H.nr?4:1.5);
  if(pd.footstepShake&&me.state==='run'&&me.onGround){H.sx=(Math.random()-.5)*1.5;H.sy=(Math.random()-.5);}else{H.sx*=.8;H.sy*=.8;}
  H.nr=0;
  if(pd.scareEvents){for(const s of pd.scareEvents){const d=Math.sqrt((px-s.x)**2+(py-s.y)**2);if(d<s.triggerRadius*1.5&&!H.sc.has(s.x+'_'+s.y)){H.nr=1;break;}}for(const s of pd.scareEvents){const k=s.x+'_'+s.y;if(s.once&&H.sc.has(k))continue;if(Math.sqrt((px-s.x)**2+(py-s.y)**2)<s.triggerRadius){H.sc.add(k);trS(s);}}}
  H.hb+=dt*(H.nr?6:2);
  if(H.ch){H.ch.timer-=dt;if(H.ch.timer<=0)H.ch=null;else{H.ch.x+=(px>H.ch.x?1:-1)*H.ch.speed*dt*60;H.ch.y+=(py-H.ch.y)*.02;}}
  if(pd.ambientParticles)H.pt.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.a=.1+Math.sin(t*2+p.x*.01)*.15;if(p.x<cam.x-100)p.x=cam.x+cv.width+100;if(p.x>cam.x+cv.width+100)p.x=cam.x-100;});
  H.ms=H.ms.filter(m=>{m.timer-=dt;m.alpha=Math.min(1,m.timer/.5);return m.timer>0;});
  H.ey=H.ey.filter(e=>{e.timer-=dt;e.alpha=Math.min(.8,e.timer/.5);return e.timer>0;});
  if(H.sr){H.st-=dt;if(H.st<=0)H.sr=null;}
}
function trS(s){if(s.type==='shadow'){H.ms.push({text:s.message||'...',timer:3,alpha:1});H.fl=1;H.ft=.3;}else if(s.type==='flicker'){H.sr='flicker';H.st=(s.duration||2e3)/1e3;}else if(s.type==='sound_text'){H.ms.push({text:s.message||'*....*',timer:3,alpha:1});H.sx=(Math.random()-.5)*4;H.sy=(Math.random()-.5)*3;}else if(s.type==='eyes'){for(let i=0;i<3;i++)H.ey.push({x:s.x+(Math.random()-.5)*200,y:s.y+(Math.random()-.5)*100-50,timer:2+Math.random()*2,alpha:.8,sz:2+Math.random()*2});H.ms.push({text:'Something is watching...',timer:3,alpha:1});}else if(s.type==='chase_shadow'){H.ch={x:s.x+300,y:s.y,speed:s.speed||2,timer:(s.duration||4e3)/1e3};H.ms.push({text:'RUN!',timer:2,alpha:1});}else if(s.type==='blackout'){H.sr='blackout';H.st=(s.duration||3e3)/1e3;if(s.message)H.ms.push({text:s.message,timer:3,alpha:1});flOn=0;uMU();}}

function uP(dt){
  if(!me||!pd||!rdy||escOn||chOn||nR||dA)return;
  if(dth.on){dth.t+=dt;if(dth.t>=dth.dur){dth.on=0;me.x=dth.nx;me.y=dth.ny;me.vx=0;me.vy=0;me.hp=dth.nh;fx={};flOn=1;shOn=1;if(H.on)H.bat=H.mb;if(me.inVehicle)exitVehicle();uMB();}return;}

  // Vehicle driving
  if(me.inVehicle&&myVeh){updateVehicle(myVeh,dt);uH(dt);if(iCd>0)iCd-=dt;if(mob)uMI();iMs=iMs.filter(m=>{m.timer-=dt;m.alpha=Math.min(1,m.timer/.5);return m.timer>0;});if(myVeh.y>700&&myVeh.respawnable){const sv=pd.vehicles?.find(v=>v.id===myVeh.id);if(sv){myVeh.x=sv.x;myVeh.y=sv.y;myVeh.vx=0;myVeh.vy=0;}else{myVeh.y=pd.spawnY-100;myVeh.vx=0;myVeh.vy=0;}}return;}

  let mx=0,wj=0;
  if(K.KeyA||K.ArrowLeft)mx-=1;if(K.KeyD||K.ArrowRight)mx+=1;
  wj=K.KeyW||K.ArrowUp||K.Space;
  if(mob&&joy.on){if(Math.abs(joy.dx)>.15)mx=joy.dx>0?1:-1;if(joy.dy<-.5)wj=1;}
  if(mJ)wj=1;if(mx!==0)me.direction=mx;
  let spd=pd.playerSpeed;if(fx.spd&&Date.now()<fx.spd.end)spd*=fx.spd.m;
  me.vx=mx*spd;me.vy+=pd.gravity;if(me.vy>pd.maxFallSpeed)me.vy=pd.maxFallSpeed;
  let jf=pd.jumpForce;if(fx.jmp&&Date.now()<fx.jmp.end)jf*=fx.jmp.m;
  if(wj&&me.onGround){me.vy=jf;me.onGround=false;}
  me.x+=me.vx;resolve(me,'x');me.y+=me.vy;me.onGround=false;resolve(me,'y');
  if(!me.onGround)me.state=me.vy<0?'jump':'fall';else if(Math.abs(me.vx)>.5)me.state='run';else me.state='idle';
  an+=dt;if(me.state==='run')me.frame=Math.floor(an/.1)%4;else if(me.state==='idle')me.frame=Math.floor(an/.5)%2;else me.frame=0;
  const now=Date.now();if(me.attacking&&now-me.atkT>AD)me.attacking=false;
  if(pd.checkpoints)for(let i=0;i<pd.checkpoints.length;i++){const cp=pd.checkpoints[i];if(i>me.cpIdx&&ov(me.x,me.y,me.width,me.height,cp.x,cp.y,cp.w,cp.h)){me.cpIdx=i;me.checkpoint={x:cp.x,y:cp.y-10};socket.emit('checkpoint-reached',me.checkpoint);sM('Checkpoint!');}}
  chCol();chKC();uDrs(dt);uH(dt);
  if(iCd>0)iCd-=dt;if(mob)uMI();
  iMs=iMs.filter(m=>{m.timer-=dt;m.alpha=Math.min(1,m.timer/.5);return m.timer>0;});
  if(now-lSend>SR){socket.emit('player-update',{x:me.x,y:me.y,vx:me.vx,vy:me.vy,direction:me.direction,state:me.state,frame:me.frame,onGround:me.onGround,activeSlot:me.activeSlot,attacking:me.attacking,itemState:{flashlightOn:flOn,shieldActive:shOn}});lSend=now;}
}
function chCol(){if(!me||!wC.length)return;const px=me.x+me.width/2,py=me.y+me.height/2;for(const ci of wC){if(ci.done||col.has(ci.id)||ci.touch===false)continue;if(Math.sqrt((px-ci.x)**2+(py-ci.y)**2)<30){ci.done=1;col.add(ci.id);const v=gv(ci.type);if(v.onC)v.onC(me,ci.props);else sM(`Collected ${v.n}!`);socket.emit('collect-item',{item:{id:ci.type,name:v.n,...(ci.props||{})}});uMB();uMS();}}}
function resolve(p,ax){
  const allP=[...(pd?.platforms||[]),...(pd?.blocks||[]),...getDB()];
  for(const pl of allP){if(!ov(p.x,p.y,p.width,p.height,pl.x,pl.y,pl.w,pl.h))continue;if(ax==='x'){if(p.vx>0)p.x=pl.x-p.width;else if(p.vx<0)p.x=pl.x+pl.w;p.vx=0;}else{if(p.vy>0){p.y=pl.y-p.height;p.vy=0;p.onGround=true;}else if(p.vy<0){p.y=pl.y+pl.h;p.vy=0;}}}
}

function uCam(){if(!me)return;let tx,ty;if(dth.on){tx=dth.ox+me.width/2-cv.width/2;ty=dth.oy+me.height/2-cv.height/2;}else if(me.inVehicle&&myVeh){tx=myVeh.x+(myVeh.w||120)/2-cv.width/2;ty=myVeh.y+(myVeh.h||50)/2-cv.height/2;}else{tx=me.x+me.width/2-cv.width/2;ty=me.y+me.height/2-cv.height/2;}cam.x+=(tx-cam.x)*.08;cam.y+=(ty-cam.y)*.08;if(H.on){cam.x+=H.sx;cam.y+=H.sy;}}

function render(){
  const ih=H.on,bg=pd?.settings?.bgColor||(ih?'#000':'#0a0a0a');
  c.fillStyle=bg;c.fillRect(0,0,cv.width,cv.height);
  if(!rdy||!pd||!me)return;
  const t=Date.now()/1e3,now=Date.now();uCull();
  c.save();c.translate(-Math.round(cam.x),-Math.round(cam.y));

  // Grid
  if(!ih){const sx=Math.floor(cam.x/60)*60,sy=Math.floor(cam.y/60)*60,ex=sx+cv.width+120,ey=sy+cv.height+120;c.strokeStyle='#111';c.lineWidth=1;c.beginPath();for(let gx=sx;gx<=ex;gx+=60){c.moveTo(gx,sy);c.lineTo(gx,ey);}for(let gy=sy;gy<=ey;gy+=60){c.moveTo(sx,gy);c.lineTo(ex,gy);}c.stroke();}

  // Checkpoints
  if(pd.checkpoints)for(const cp of pd.checkpoints){if(!inV(cp.x,cp.y-30,50,70))continue;const a=me.cpIdx>=pd.checkpoints.indexOf(cp),g=Math.sin(t*3)*.3+.7;c.fillStyle=a?(ih?'#2a6a2a':'#4ade80'):'#222';c.fillRect(cp.x+18,cp.y-30,3,70);c.fillStyle=a?`rgba(74,222,128,${g*(ih?.3:1)})`:'rgba(50,50,50,0.3)';c.beginPath();c.moveTo(cp.x+21,cp.y-30);c.lineTo(cp.x+45,cp.y-20);c.lineTo(cp.x+21,cp.y-10);c.fill();}

  // Platforms/blocks
  const drawBlock=(bl)=>{if(!inV(bl.x,bl.y,bl.w,bl.h))return;c.globalAlpha=bl.opacity??1;c.fillStyle=bl.color||'#333';c.fillRect(bl.x,bl.y,bl.w,bl.h);c.fillStyle=ih?'rgba(255,255,255,0.02)':'rgba(255,255,255,0.05)';c.fillRect(bl.x,bl.y,bl.w,2);if(bl.text){c.fillStyle=bl.textColor||'#fff';c.font=`${bl.textSize||14}px ${bl.textFont||'Inter'}`;c.textAlign='center';c.textBaseline='middle';c.fillText(bl.text,bl.x+bl.w/2,bl.y+bl.h/2);}c.globalAlpha=1;};
  (pd.platforms||[]).forEach(drawBlock);(pd.blocks||[]).forEach(drawBlock);

  // Models
  const ni2=nI();
  for(const m of wM){if(m.type==='keycard'&&kcs[m.id])continue;const mw=m.w||40,mh=m.h||80;if(m.type.startsWith('door_'))dDr(c,m,t);else if(m.type==='lever')dLv(c,m.x,m.y,mw,mh,lvs[m.id],t);else if(m.type==='keycard')dKc(c,m.x,m.y,mw,mh,m.properties,t);if(ni2&&ni2.id===m.id){c.fillStyle='rgba(255,255,255,0.06)';c.beginPath();c.arc(m.x+mw/2,m.y+mh/2,40+Math.sin(t*3)*5,0,6.283);c.fill();if(!mob){c.fillStyle='rgba(255,255,255,0.7)';c.font='bold 12px Inter';c.textAlign='center';c.textBaseline='bottom';c.fillText('[E]',m.x+mw/2,m.y-15);}}}

  // Collectibles
  for(const ci of wC){if(ci.done||!inV(ci.x-15,ci.y-15,30,30))continue;gv(ci.type).dW(c,ci.x,ci.y,t);}

  // Avatars
  for(const av of wAv){const aw=av.w||22,ah=av.h||34;if(!inV(av.x-aw,av.y-ah,aw*2,ah*2))continue;dGA(c,av,t);if(ni2&&ni2.id===av.id&&av.interactive&&!dA){c.fillStyle='rgba(255,255,255,0.06)';c.beginPath();c.arc(av.x,av.y,40+Math.sin(t*3)*5,0,6.283);c.fill();if(!mob){c.fillStyle='rgba(255,255,255,0.7)';c.font='bold 12px Inter';c.textAlign='center';c.textBaseline='bottom';c.fillText('[E]',av.x,av.y-ah/2-15);}}}

  // ===== VEHICLES =====
  for(const v of wV)drawVehicle(c,v,t);

  // Horror particles/eyes/chase
  if(ih&&pd.ambientParticles)for(const p of H.pt){if(!inV(p.x,p.y,p.sz,p.sz))continue;c.fillStyle=`rgba(200,200,220,${p.a})`;c.fillRect(p.x,p.y,p.sz,p.sz);}
  for(const e of H.ey){c.fillStyle=`rgba(255,0,0,${e.alpha})`;c.beginPath();c.arc(e.x,e.y,e.sz,0,6.283);c.fill();c.beginPath();c.arc(e.x+8,e.y,e.sz,0,6.283);c.fill();}
  if(H.ch){const cs=H.ch,p2=.4+Math.sin(t*8)*.2;c.fillStyle=`rgba(0,0,0,${p2})`;c.beginPath();c.ellipse(cs.x,cs.y,25,40,0,0,6.283);c.fill();c.fillStyle=`rgba(255,0,0,${p2+.2})`;c.beginPath();c.arc(cs.x-6,cs.y-15,2,0,6.283);c.fill();c.beginPath();c.arc(cs.x+6,cs.y-15,2,0,6.283);c.fill();}

  // Item effects
  if(!dth.on){me._me=true;for(const k in IV){const v=IV[k];if(v.dE)v.dE(c,me,t);}}

  // Remote players
  for(const id in rp){const p=rp[id];if(p.inVehicle)continue;p.dx+=(p.tx-p.dx)*L;p.dy+=(p.ty-p.dy)*L;if(!inV(p.dx-10,p.dy-10,(p.width||32)+20,(p.height||48)+20))continue;let ap=0;if(p.attacking&&p.atkT){ap=Math.min(1,(now-p.atkT)/AD);if(ap>=1)p.attacking=false;}p._me=false;for(const k in IV){const v=IV[k];if(v.dE)v.dE(c,p,t);}const ri=p.inventory?.[p.activeSlot];TC.draw(c,p.dx,p.dy,p.width,p.height,p.direction,p.state,p.frame,p.avatar,p.username,false,t,{activeItem:ri?.id,attacking:p.attacking,attackProgress:ap,hp:p.hp,maxHp:p.maxHp||100,itemOn:gios(ri,p.iSt),equipped:p.equipped||{}});}

  // Me
  if(dth.on){const dt2=dth.t/dth.dur;c.save();c.globalAlpha=1-dt2;const dx2=dth.ox+me.width/2,dy2=dth.oy+me.height/2;c.translate(dx2,dy2-dt2*30);c.rotate(dt2*6.283);c.translate(-dx2,-(dy2-dt2*30));TC.draw(c,dth.ox,dth.oy-dt2*30,me.width,me.height,me.direction,'idle',0,me.avatar,me.username,true,t,{isDead:true,equipped:me.equipped||{}});c.restore();}
  else if(!me.inVehicle){let ma=0;if(me.attacking&&me.atkT)ma=Math.min(1,(now-me.atkT)/AD);const mi=me.inventory?.[me.activeSlot];TC.draw(c,me.x,me.y,me.width,me.height,me.direction,me.state,me.frame,me.avatar,me.username,true,t,{activeItem:mi?.id,attacking:me.attacking,attackProgress:ma,hp:me.hp,maxHp:me.maxHp||100,itemOn:gios(mi,{flashlightOn:flOn,shieldActive:shOn}),equipped:me.equipped||{}});}

  c.restore();

  // Post-processing
  if(ih&&!dth.on)rDark(t);
  if(pd.fog?.on)rFog();if(pd.vignette?.on)rVig();
  if(pd.tint?.on){c.fillStyle=pd.tint.color||'#000';c.globalAlpha=pd.tint.opacity||.1;c.fillRect(0,0,cv.width,cv.height);c.globalAlpha=1;}

  // HUD
  if(me.inventory&&!mob)dInv(t);
  if(ih)dBat();
  dFx(t);dKcH();

  // Vehicle HUD
  if(me.inVehicle&&myVeh){
    const bw=160,bh=6,bx=cv.width/2-bw/2,by=cv.height-40;
    const sp=Math.abs(myVeh.vx||0),ms=myVeh.maxSpeed||10,pct=sp/ms;
    c.fillStyle='rgba(0,0,0,0.6)';c.fillRect(bx-2,by-2,bw+4,bh+4);
    c.fillStyle=pct>.8?'#ef4444':pct>.5?'#fbbf24':'#4ade80';
    c.fillRect(bx,by,bw*pct,bh);
    c.font='600 10px Inter';c.textAlign='center';c.fillStyle='#888';
    c.fillText(`${Math.round(sp*10)} km/h`,cv.width/2,by-6);
    c.font='500 9px Inter';c.fillStyle='rgba(255,255,255,0.3)';
    c.fillText(`[E] Exit  ${myVeh.horn?'[H] Horn  ':''}${myVeh.headlights?'[L] Lights  ':''}${myVeh.jumpForce?'[Space] Jump':''}`,cv.width/2,by+bh+14);
  }

  // Horror messages
  for(let i=0;i<H.ms.length;i++){const m=H.ms[i];c.save();c.globalAlpha=m.alpha;c.font='900 28px Inter';c.textAlign='center';c.fillStyle='#CC2222';c.shadowColor='rgba(255,0,0,0.5)';c.shadowBlur=10;c.fillText(m.text,cv.width/2,cv.height/2-60+i*40);c.shadowBlur=0;c.restore();}
  for(let i=0;i<iMs.length;i++){const m=iMs[i];c.save();c.globalAlpha=m.alpha;c.font='14px Inter';c.textAlign='center';const y=cv.height-100-i*30,w=c.measureText(m.text).width+20;c.fillStyle='rgba(0,0,0,0.7)';c.fillRect(cv.width/2-w/2,y-12,w,24);c.fillStyle='#fff';c.textBaseline='middle';c.fillText(m.text,cv.width/2,y);c.restore();}
  if(ih&&H.nr){c.fillStyle=`rgba(80,0,0,${(Math.sin(H.hb)*.5+.5)*.15})`;c.fillRect(0,0,cv.width,cv.height);}
  if(ih&&pd.breathingEffect){const ba=Math.sin(H.br)*.03;if(ba>0){c.fillStyle=`rgba(0,0,0,${ba})`;c.fillRect(0,0,cv.width,cv.height);}}
}

function gios(it,is){if(!it)return true;if(it.id==='flashlight')return is?.flashlightOn!==false;if(it.id==='shield')return is?.shieldActive!==false;return true;}
function rFog(){const f=pd.fog,cl=f.color||'#000000',r=parseInt(cl.slice(1,3),16)||0,g=parseInt(cl.slice(3,5),16)||0,b=parseInt(cl.slice(5,7),16)||0;const gr=c.createRadialGradient(cv.width/2,cv.height/2,f.start||100,cv.width/2,cv.height/2,f.end||400);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,`rgba(${r},${g},${b},${f.density||.5})`);c.fillStyle=gr;c.fillRect(0,0,cv.width,cv.height);}
function rVig(){const v=pd.vignette,cl=v.color||'#000000',r=parseInt(cl.slice(1,3),16)||0,g=parseInt(cl.slice(3,5),16)||0,b=parseInt(cl.slice(5,7),16)||0;const gr=c.createRadialGradient(cv.width/2,cv.height/2,cv.width*.3,cv.width/2,cv.height/2,cv.width*.7);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,`rgba(${r},${g},${b},${v.intensity||.3})`);c.fillStyle=gr;c.fillRect(0,0,cv.width,cv.height);}

function rDark(t){
  if(!me)return;const W=cv.width,H2=cv.height;
  if(!dkC||dkC.width!==W||dkC.height!==H2){dkC=document.createElement('canvas');dkC.width=W;dkC.height=H2;dkX=dkC.getContext('2d');}
  const d=dkX,px=me.x+me.width/2-cam.x,py=me.y+me.height/2-cam.y;
  d.fillStyle=`rgba(0,0,0,${1-(pd.ambientLight||.02)})`;d.fillRect(0,0,W,H2);d.globalCompositeOperation='destination-out';
  const isBO=H.sr==='blackout',isFL=H.fl||(H.sr==='flicker'&&Math.sin(t*30)>0);
  if(flOn&&!isBO&&H.bat>0){const dir=me.direction||1,rad=(pd.flashlightRadius||220)*(H.bat/H.mb*.5+.5),br=(pd.flashlightBrightness||1.2)*(isFL?Math.random()*.5+.3:1),spread=pd.flashlightSpread||.45,ag=dir===1?0:Math.PI;const g=d.createRadialGradient(px,py,5,px+dir*rad*.4,py,rad);g.addColorStop(0,`rgba(0,0,0,${br})`);g.addColorStop(.4,`rgba(0,0,0,${br*.7})`);g.addColorStop(.7,`rgba(0,0,0,${br*.3})`);g.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=g;d.beginPath();d.moveTo(px,py);d.arc(px,py,rad,ag-spread,ag+spread);d.closePath();d.fill();const ag2=d.createRadialGradient(px,py,0,px,py,40);ag2.addColorStop(0,'rgba(0,0,0,0.6)');ag2.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=ag2;d.beginPath();d.arc(px,py,40,0,6.283);d.fill();}else{const ag=d.createRadialGradient(px,py,0,px,py,25);ag.addColorStop(0,'rgba(0,0,0,0.2)');ag.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=ag;d.beginPath();d.arc(px,py,25,0,6.283);d.fill();}
  // Other players flashlights
  for(const id in rp){const p=rp[id];const ri=p.inventory?.[p.activeSlot];if(!ri||ri.id!=='flashlight'||p.iSt?.flashlightOn===false)continue;const rpx=p.dx+(p.width||20)/2-cam.x,rpy=p.dy+(p.height||40)/2-cam.y,rDir=p.direction||1,rAg=rDir===1?0:Math.PI;const rg=d.createRadialGradient(rpx,rpy,5,rpx+rDir*45,rpy,150);rg.addColorStop(0,'rgba(0,0,0,0.5)');rg.addColorStop(.5,'rgba(0,0,0,0.2)');rg.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=rg;d.beginPath();d.moveTo(rpx,rpy);d.arc(rpx,rpy,150,rAg-.4,rAg+.4);d.closePath();d.fill();}
  // Item/model glows
  for(const ci of wC){if(ci.done)continue;const cx=ci.x-cam.x,cy=ci.y-cam.y;if(cx<-50||cx>W+50||cy<-50||cy>H2+50)continue;const gs=ci.type==='battery'?35:20;const gg=d.createRadialGradient(cx,cy,0,cx,cy,gs);gg.addColorStop(0,'rgba(0,0,0,0.4)');gg.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=gg;d.beginPath();d.arc(cx,cy,gs,0,6.283);d.fill();}
  for(const m of wM){if(m.type==='keycard'&&kcs[m.id])continue;const mx=m.x+(m.w||30)/2-cam.x,my=m.y+(m.h||20)/2-cam.y;if(mx<-50||mx>W+50||my<-50||my>H2+50)continue;const gs=m.type==='keycard'?30:m.type==='lever'?25:10;const gg=d.createRadialGradient(mx,my,0,mx,my,gs);gg.addColorStop(0,'rgba(0,0,0,0.3)');gg.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=gg;d.beginPath();d.arc(mx,my,gs,0,6.283);d.fill();}
  for(const av of wAv){const ax=av.x-cam.x,ay=av.y-cam.y;if(ax<-50||ax>W+50||ay<-50||ay>H2+50)continue;const gg=d.createRadialGradient(ax,ay,0,ax,ay,25);gg.addColorStop(0,'rgba(0,0,0,0.3)');gg.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=gg;d.beginPath();d.arc(ax,ay,25,0,6.283);d.fill();}
  // Vehicle lights in darkness
  for(const v of wV){if(!v.headlightsOn)continue;const vx=v.x+(v.w||120)/2-cam.x,vy=v.y+(v.h||50)/2-cam.y;const lr=v.lightRange||200;const gg=d.createRadialGradient(vx,vy,10,vx+v.direction*lr*.5,vy,lr);gg.addColorStop(0,'rgba(0,0,0,0.7)');gg.addColorStop(.5,'rgba(0,0,0,0.3)');gg.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=gg;d.beginPath();d.moveTo(vx,vy);const ag=v.direction===1?0:Math.PI;d.arc(vx,vy,lr,ag-.5,ag+.5);d.closePath();d.fill();}
  d.globalCompositeOperation='source-over';c.drawImage(dkC,0,0);
  if(flOn&&!isBO&&H.bat>0&&!isFL){const dir=me.direction||1,rad=(pd.flashlightRadius||220)*(H.bat/H.mb*.5+.5),spread=pd.flashlightSpread||.45,ag=dir===1?0:Math.PI;c.save();c.globalAlpha=.04;const wg=c.createRadialGradient(px,py,10,px+dir*rad*.4,py,rad);wg.addColorStop(0,'#FFE8AA');wg.addColorStop(.5,'#FFD466');wg.addColorStop(1,'transparent');c.fillStyle=wg;c.beginPath();c.moveTo(px,py);c.arc(px,py,rad,ag-spread,ag+spread);c.closePath();c.fill();c.restore();}
}

function dBat(){const bw=mob?100:140,bh=10,bx=cv.width-bw-20,by=mob?50:50;c.font='600 10px Inter';c.textAlign='right';c.fillStyle=H.bat<20?'#ef4444':'#555';c.fillText('BATTERY',bx-6,by+8);c.fillStyle='#111';c.fillRect(bx,by,bw,bh);c.strokeStyle='#222';c.lineWidth=1;c.strokeRect(bx,by,bw,bh);const pct=Math.max(0,H.bat/H.mb);c.fillStyle=pct>.5?'#44EE44':pct>.25?'#EECC44':'#EE4444';c.fillRect(bx+1,by+1,(bw-2)*pct,bh-2);c.font='600 9px Inter';c.textAlign='center';c.fillStyle=pct>.3?'#000':'#fff';c.fillText(`${Math.round(H.bat)}%`,bx+bw/2,by+bh-2);c.fillStyle='#222';c.fillRect(bx+bw,by+2,3,bh-4);if(H.bat<15&&Math.sin(Date.now()/300)>0){c.font='bold 12px Inter';c.textAlign='center';c.fillStyle='#ef4444';c.fillText('LOW BATTERY',cv.width/2,by+35);}}
function dKcH(){const cols=['red','blue','green','yellow'].filter(cl=>kcs[cl]);if(!cols.length)return;const sx=10,sy=mob?90:110;c.font='600 9px Inter';c.textAlign='left';c.fillStyle='#555';c.fillText('KEYCARDS',sx,sy-4);cols.forEach((cl,i)=>{const x=sx+i*30;c.fillStyle='rgba(0,0,0,0.5)';c.fillRect(x-1,sy-1,26,18);c.fillStyle=KC[cl];c.fillRect(x,sy,24,16);c.fillStyle='rgba(255,255,255,0.3)';c.fillRect(x,sy+5,24,2);c.fillStyle='#FFD700';c.fillRect(x+2,sy+2,4,3);});}

function dInv(t){
  if(mob)return;const inv=me.inventory;if(!inv)return;
  const ss=52,gap=6,tw=inv.length*ss+(inv.length-1)*gap,sx=cv.width/2-tw/2,sy=cv.height-70;
  for(let i=0;i<inv.length;i++){const x=sx+i*(ss+gap),a=i===me.activeSlot;c.fillStyle=a?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.6)';c.fillRect(x,sy,ss,ss);c.strokeStyle=a?'#fff':'#222';c.lineWidth=a?2:1;c.strokeRect(x,sy,ss,ss);if(inv[i]){const v=gv(inv[i].id);v.dH(c,x,sy,ss);c.font='600 8px Inter';c.textAlign='center';let l=v.n;if(a&&inv[i].id==='flashlight'){l+=flOn?' ON':' OFF';c.fillStyle=flOn?'#FFE066':'#555';}else if(a&&inv[i].id==='shield'){l+=shOn?' UP':' DOWN';c.fillStyle=shOn?'#66AAEE':'#555';}else c.fillStyle='#666';c.fillText(l,x+ss/2,sy+ss-4);}c.font='600 9px Inter';c.textAlign='left';c.fillStyle=a?'#fff':'#333';c.fillText(String(i+1),x+4,sy+12);}
  const ai=inv[me.activeSlot];if(ai&&gv(ai.id).tg){c.font='500 10px Inter';c.textAlign='center';c.fillStyle='rgba(255,255,255,0.3)';c.fillText('[F] toggle',cv.width/2,sy-8);}
  if(nI()&&!mob&&!dA){c.font='500 10px Inter';c.textAlign='center';c.fillStyle='rgba(255,255,255,0.4)';c.fillText('[E] interact',cv.width/2,sy-22);}
  if(cN.length>0&&!mob){c.font='500 10px Inter';c.textAlign='center';c.fillStyle='rgba(255,255,255,0.3)';c.fillText(`[N] notes (${cN.length})`,cv.width/2,sy-36);}
  if(me.hp!==undefined){const bw=200,bh2=8,bx2=cv.width/2-bw/2,by2=sy-(cN.length>0?50:36);c.fillStyle='#111';c.fillRect(bx2,by2,bw,bh2);const p3=Math.max(0,me.hp/(me.maxHp||100));c.fillStyle=p3>.5?'#4ade80':p3>.25?'#fbbf24':'#ef4444';c.fillRect(bx2,by2,bw*p3,bh2);c.font='600 10px Inter';c.textAlign='center';c.fillStyle='#666';c.fillText(`${Math.max(0,Math.round(me.hp))} HP`,cv.width/2,by2-4);}
}
function dFx(t){const now=Date.now(),el=[];if(fx.spd&&now<fx.spd.end)el.push({name:'Speed',color:'#FFD700',rem:Math.ceil((fx.spd.end-now)/1e3),m:fx.spd.m});if(fx.jmp&&now<fx.jmp.end)el.push({name:'Jump',color:'#44CC44',rem:Math.ceil((fx.jmp.end-now)/1e3),m:fx.jmp.m});if(!el.length)return;const sx=10;let sy=mob?60:80;el.forEach((e,i)=>{const y=sy+i*28;c.fillStyle='rgba(0,0,0,0.6)';c.fillRect(sx,y,120,22);c.strokeStyle=e.color;c.lineWidth=1;c.strokeRect(sx,y,120,22);c.fillStyle=e.color;c.globalAlpha=.3;c.fillRect(sx,y,120,22);c.globalAlpha=1;c.font='600 10px Inter';c.textAlign='left';c.fillStyle='#fff';c.fillText(`${e.name} x${e.m}`,sx+6,y+14);c.textAlign='right';c.fillStyle=e.rem<=2?'#ef4444':'#ccc';c.fillText(`${e.rem}s`,sx+114,y+14);});}

function uFps(){fc++;const now=Date.now();if(now-fpsT>=1e3){fps=fc;fc=0;fpsT=now;$('hud-fps').textContent=`${fps} FPS`;}}

let lT=performance.now();
function loop(ts){const dt=Math.min((ts-lT)/1e3,DTM);lT=ts;uP(dt);uCam();render();uFps();requestAnimationFrame(loop);}
initMob();requestAnimationFrame(loop);
})();