/* Castle expansion. Engine access is explicitly injected by tools/build.py. */
async function ampliarCastillo(game, A) {
  const O = {x:-220,z:220}, gold='#c5a361', stone='#c6bba5', wood='#503226';
  const floors = [
    {id:-1,name:'Sótano · servicio y calabozos',height:-8.3},
    {id:0,name:'Planta baja · recepción real',height:0},
    {id:1,name:'Primera planta · vida de la corte',height:8.3},
    {id:2,name:'Segunda planta · aposentos reales',height:16.6}
  ];
  const rooms = [
    {name:'Salón del trono',x:0,z:-20,type:'throne',floor:0,width:32,depth:32},
    {name:'Cocina',x:-19,z:-10,type:'kitchen',floor:-1},
    {name:'Dependencias del servicio',x:19,z:-10,type:'staff',floor:-1},
    {name:'Calabozo',x:-19,z:10,type:'dungeon',floor:-1},
    {name:'Despensa y bodega',x:19,z:10,type:'pantry',floor:-1},
    {name:'Salón de bailes',x:-19,z:-10,type:'dance',floor:1},
    {name:'Biblioteca',x:19,z:-10,type:'library',floor:1},
    {name:'Capilla y jardín interior',x:-19,z:10,type:'chapel',floor:1},
    {name:'Sala de entrenamiento',x:19,z:10,type:'training',floor:1},
    {name:'Oficina principal',x:-19,z:-10,type:'office',floor:2},
    {name:'Oficina con chimenea',x:19,z:-10,type:'fireplace',floor:2},
    {name:'Baños termales',x:-19,z:10,type:'baths',floor:2},
    {name:'Dormitorio real',x:19,z:10,type:'bedroom',floor:2}
  ];
  const trainingRoom=rooms.find(r=>r.type==='training');
  const atlas = new Image(); atlas.src='assets/castillo-atlas.png'; await atlas.decode();
  const textures=[];
  function texture(image){const t=new A.Texture(image);t.colorSpace='srgb';t.needsUpdate=true;t.anisotropy=Math.min(8,game.renderer.capabilities.getMaxAnisotropy());textures.push(t);return t;}
  const art=[0,1,2,3].map(i=>{const t=texture(atlas);t.repeat.set(.5,.5);t.offset.set(i%2*.5,i<2?.5:0);return t;});
  const labels=new Map();
  function labelTexture(text){if(labels.has(text))return labels.get(text);const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#172c32';ctx.fillRect(0,0,1024,128);ctx.strokeStyle=gold;ctx.lineWidth=6;ctx.strokeRect(8,8,1008,112);ctx.fillStyle='#f5e5be';ctx.font='38px Georgia';ctx.textAlign='center';ctx.fillText(text,512,78);const t=texture(c);labels.set(text,t);return t;}
  function snap(yaw=0){game.camRig.iniciado=false;game.camRig.yaw=yaw;game.camRig.pitch=.22;game.camRig.distActual=5;game.camRig.update(1/60,game.rey.pos,{dx:0,dy:0,rueda:0},game.terreno.colliders);}
  function ownMaterial(mesh){mesh.material=mesh.material.clone();return mesh.material;}
  class Palace {
    constructor(side){
      this.lado=side;this.grupo=new A.Group();this.grupo.position.set(O.x,0,O.z);
      this.levels=new Map();this.actors=[];this.interactions=[];this.flames=[];this.steam=[];
      this.time=0;this.spar=null;this.balcony=null;this.floor=0;this.doors=[];
      this.worldColliders=game.terreno.colliders;this.worldVisible=game.terreno.group.visible;
      this.build();this.grupo.traverse(m=>{m.castShadow=false;});game.scene.add(this.grupo);
      this.activateFloor(0);game.terreno.group.visible=false;
    }
    get height(){return floors.find(f=>f.id===this.floor).height;}
    activateFloor(id){
      this.floor=id;for(const [key,level]of this.levels)level.group.visible=key===id;
      this.colliders=this.levels.get(id).colliders;
      game.terreno.colliders=this.colliders.map(c=>({...c,alto:c.alto+this.height}));
    }
    changeFloor(id){
      if(!this.levels.has(id))return;
      this.stopSpar();const goingUp=id>this.floor;this.activateFloor(id);
      this.teleport(goingUp?9:-9,25);
      game._avisoRey(floors.find(f=>f.id===id).name);
    }
    box(x,z,w,d,h,color=stone,y=0,solid=true){const m=A.box(w,h,d,color);m.position.set(x,y+h/2,z);this.buildLevel.group.add(m);if(solid)this.buildLevel.colliders.push(A.collider(O.x+x,O.z+z,w,d,h+y));return m;}
    cyl(x,z,r,h,color,y=0){const m=A.cylinder(r,r,h,color,16);m.position.set(x,y+h/2,z);this.buildLevel.group.add(m);return m;}
    plaque(text,x,z,w=5){const m=this.box(x,z,w,.05,.65,'#ffffff',3.3,false);ownMaterial(m).map=labelTexture(text);return m;}
    painting(x,z,index=0,w=4,h=3){this.box(x,z,w+.3,.18,h+.3,gold,2,false);const m=this.box(x,z+.11,w,.05,h,'#ffffff',2.15,false);ownMaterial(m).map=art[index];}
    rug(x,z,w,d){if(d>w*2){const count=Math.ceil(d/w);for(let i=0;i<count;i++)this.rug(x,z-d/2+(i+.5)*d/count,w,d/count);return;}const m=this.box(x,z,w,d,.025,'#ffffff',.025,false);ownMaterial(m).map=art[2];}
    table(x,z,w=4,d=2){this.box(x,z,w,d,.18,wood,.95);for(const dx of [-w/2+.2,w/2-.2])for(const dz of [-d/2+.2,d/2-.2])this.box(x+dx,z+dz,.15,.15,.95,gold,0,false);}
    chair(x,z){this.box(x,z,.8,.8,.12,'#713747',.55);this.box(x,z-.35,.8,.13,1.4,wood);}
    fire(x,z){this.box(x,z,4,1.3,3.6,stone);this.box(x,z+.7,2.6,.08,2,'#211d21',.3,false);this.box(x,z+.85,4.5,1.8,.25,gold,2.7,false);for(let i=0;i<5;i++){const m=this.cyl(x-1+i*.5,z+.85,.16,.5+i%2*.3,'#ffad41',.2);const mat=ownMaterial(m);mat.emissive.set('#ff8c24');mat.emissiveIntensity=1.8;this.flames.push(m);}}
    arch(x,z,rotation=0){const group=new A.Group();group.position.set(x,0,z);group.rotation.y=rotation;this.buildLevel.group.add(group);for(const dx of [-2.8,2.8]){const p=A.cylinder(.28,.4,5.4,stone,12);p.position.set(dx,2.7,0);group.add(p);}for(let i=0;i<13;i++){const angle=i/12*Math.PI,m=A.box(.6,.5,.65,gold);m.position.set(Math.cos(angle)*2.8,5.2+Math.sin(angle)*1.1,0);m.rotation.z=angle;group.add(m);}}
    portal(x,z,label,action){this.plaque(label,x,z,4);this.interactions.push({x,z,label,action,floor:this.buildLevel.id});this.rug(x,z+1,3,2);}
    room(r){const {x,z,type}=r;const w=r.width??26,d=r.depth??20;
      this.box(x,z,w,d,.18,type==='baths'?'#a9cccb':type==='dungeon'?'#50565c':'#c5b89e',-.18,false);
      this.box(x,z,w,d,.2,'#6b6962',6.7,false);this.box(x,z-d/2,w,.35,6.5,stone);if(type!=='throne')this.box(x,z+d/2,w,.35,6.5,stone);
      if(type==='throne'){for(const side of [-1,1])this.box(side*(w/4+1.5),z+d/2,w/2-3,.5,6.5,stone);this.arch(0,z+d/2);this.throneDoor(z+d/2);}
      for(const side of [-1,1]){const inner=(x<0?1:-1)===side&&type!=='throne';if(inner){this.box(x+side*w/2,z-6.5,.35,7,6.5,stone);this.box(x+side*w/2,z+6.5,.35,7,6.5,stone);this.arch(x+side*w/2,z,Math.PI/2);}else this.box(x+side*w/2,z,.35,d,6.5,stone);}
      this.plaque(r.name,x,z-d/2+.35,8);this.painting(x-6,z-d/2+.4,type==='office'?0:1,3,2.6);
      for(const dx of [-11,11]){this.cyl(x+dx,z-8,.36,5.5,stone);this.cyl(x+dx,z-8,.5,.18,gold,5.3);}
      if(type!=='baths'&&type!=='dungeon')this.rug(x,z,7,7);
      if(type==='pantry'){for(const dx of [-9,-3,3,9]){this.box(x+dx,z-6,4,1,3,wood);for(let i=0;i<3;i++)this.cyl(x+dx-1+i,z-5.2,.3,.55,'#ac8658',1);this.cyl(x+dx,z+5,.8,1.6,wood);}}
      if(type==='bedroom'){this.box(x,z-3,5,6,.6,wood);this.box(x,z-3,4.8,5.8,.25,'#6f3649',.6,false);for(const dx of [-2.5,2.5])for(const dz of [-6,0])this.cyl(x+dx,z+dz,.13,4,gold);this.box(x,z-3,5.5,6.5,.2,'#6f3649',4,false);this.table(x+8,z+4,3,2);this.fire(x-8,z-7);}
      if(type==='library'){for(const dx of [-9,-3,3,9]){this.box(x+dx,z-6,4,.8,3.5,wood);for(let row=0;row<4;row++)for(let b=0;b<11;b++)this.box(x+dx-1.7+b*.33,z-5.55,.22,.35,.5+(b%3)*.05,['#85434a','#324e55','#b59c61'][b%3],.25+row*.8,false);}this.table(x,z+3);this.chair(x,z+4.5);}
      if(type==='office'||type==='fireplace'){this.table(x,z-2,5,2.5);this.chair(x,z-4);this.painting(x+5,z-9.6,0);this.fire(x+8,z-7);for(let i=0;i<3;i++)this.box(x-1+i,z-2,.6,.9,.06,'#eee0b9',1.14,false);this.box(x+1.7,z-2,.12,.12,.4,gold,1.13,false);}
      if(type==='kitchen'){this.fire(x-8,z-7);this.table(x,z,7,3);this.table(x+9,z-5,3,5);for(let i=0;i<7;i++)this.cyl(x-2.5+i*.8,z,.25,.12,['#c18b45','#b85834','#90a25b'][i%3],1.13);for(let i=0;i<4;i++)this.cyl(x-9+i*1.3,z+6,.5,1.3,wood);}
      if(type==='dance'){for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++)this.box(x+i*1.6,z+j*1.6,1.58,1.58,.025,(i+j)%2?'#283d43':'#e4d7b6',.03,false);for(const dx of [-9,9]){this.table(x+dx,z+5,2,2);this.chair(x+dx,z+7);}for(let i=0;i<8;i++){const a=i*Math.PI/4;this.cyl(x+Math.sin(a)*2,z+Math.cos(a)*2,.1,.6,gold,5);}}
      if(type==='baths'){for(const dx of [-9,9]){this.cyl(x+dx,z-5,.55,.8,'#eee5d0');this.cyl(x+dx,z-5,.4,.1,'#719caa',.8);this.box(x+dx,z-7,2.2,1,.65,'#ddd6c5');this.box(x+dx,z-7.45,2.2,.2,1.1,'#ddd6c5');this.box(x+dx-1.6,z-6,.15,4,2.2,wood);}
      this.box(x,z,9,7,.1,'#368f9c',.02,false);for(const dx of [-4.8,4.8])this.box(x+dx,z,.6,8,.45,'#e1d5b8');for(const dz of [-3.8,3.8]){this.box(x-3,z+dz,3,.6,.45,'#e1d5b8');this.box(x+3,z+dz,3,.6,.45,'#e1d5b8');}for(let i=0;i<12;i++){const m=this.cyl(x+Math.sin(i*7)*3,z+Math.cos(i*4)*2,.17,.12,'#e0ffff',.8+i%3*.5);const mat=ownMaterial(m);mat.transparent=true;mat.opacity=.2;this.steam.push(m);}for(const dx of [-10,10]){this.box(x+dx,z+4,2,3,.6,wood);this.box(x+dx,z+4,1.3,2,.12,'#eee6d9',.6,false);}this.portal(x,z+5,'E: descansar en las aguas termales',()=>{game.rey.vida=game.rey.vidaMax;game._avisoRey('Las aguas termales restauran tu vida.');});}
      if(type==='throne'){
        const back=z-d/2;this.rug(x,z,6,d-3);
        this.box(x,back+5,5,4,.18,gold,0,false);this.box(x,back+4,2,1.6,.7,'#81354a');
        this.box(x,back+3.2,2.3,.3,3.6,gold);this.box(x,back+3.42,1.7,.12,2.7,'#713448',.65,false);
        for(const dx of [-1.3,1.3])this.box(x+dx,back+4,.3,2,1.2,gold);
        this.painting(x,back+.4,2,5,4);
        for(const dx of [-11,11])for(const dz of [-8,0,8]){this.cyl(x+dx,z+dz,.4,6.3,stone);this.cyl(x+dx,z+dz,.55,.2,gold,5.9);}
      }
      if(type==='training'){this.spirit=A.person({ropa:'#65dfe1',piel:'#a5f9ff',pelo:'#ecffff',nombre:'Espíritu de entrenamiento'});this.spirit.position.set(x,0,z);this.spirit.traverse(m=>{if(m.material){const mat=ownMaterial(m);mat.transparent=true;mat.opacity=.65;mat.emissive.set('#36b8c7');mat.emissiveIntensity=.6;}});this.buildLevel.group.add(this.spirit);this.portal(x,z+5,'E: iniciar / terminar entrenamiento',()=>this.toggleSpar());for(let i=0;i<4;i++){this.box(x-9+i*6,z-6,.25,.25,2.1,wood);this.box(x-9+i*6,z-6,1.5,.18,.2,wood,1.5,false);}}
      if(type==='chapel'){for(const dx of [-6,6])for(const dz of [-3,2,6])this.box(x+dx,z+dz,4,1,.55,wood);this.box(x,z-6,4,2,1,stone);this.painting(x,z-9.6,3,4,3.5);for(const dx of [-10,10]){this.cyl(x+dx,z+7,.65,.7,'#9b7356');this.cyl(x+dx,z+7,.8,1.3,'#5e8060',.7);}}
      if(type==='dungeon'){for(let cell=0;cell<3;cell++){const cx=x-8+cell*8;this.box(cx,z-5,7,7,.1,'#3d444c',0,false);for(let i=0;i<=10;i++)this.box(cx-3.5+i*.7,z-1.5,.09,.15,3.4,'#333e46',0,false);this.buildLevel.colliders.push(A.collider(O.x+cx,O.z+z-1.5,7,.25,4));for(const dx of [-3.5,3.5])this.box(cx+dx,z-5,.25,7,4,'#62626a');const monster=A.person({escala:1.3,piel:['#7a9151','#986aa8','#9d5d51'][cell],ropa:'#403b36',nombre:'Monstruo cautivo'});monster.position.set(cx,0,z-5);for(const dx of [-.2,.2]){const horn=A.cylinder(0,.13,.5,'#d6c7aa',6);horn.position.set(dx,2.5,0);monster.add(horn);}this.buildLevel.group.add(monster);this.actors.push({model:monster,x:cx,z:z-5,captive:true,floor:r.floor});}}
      if(type==='staff'){for(const dx of [-8,0,8])for(const dz of [-5,5]){this.box(x+dx,z+dz,2.6,4,.5,wood);this.box(x+dx,z+dz,2.5,3.8,.18,'#5b7d83',.5,false);this.box(x+dx,z+dz-1.3,2,.8,.2,'#eee1c7',.7,false);}}
    }
    throneDoor(z){
      const door={open:false,leaves:[],collider:A.collider(O.x,O.z+z,5.8,.4,5),floor:0};
      for(const side of [-1,1]){const pivot=new A.Group();pivot.position.set(side*2.9,0,z);const leaf=A.box(2.9,5,.22,wood);leaf.position.set(-side*1.45,2.5,0);pivot.add(leaf);const trim=A.box(2.55,.14,.27,gold);trim.position.set(-side*1.45,3.9,0);pivot.add(trim);this.buildLevel.group.add(pivot);door.leaves.push({pivot,side});}
      this.buildLevel.colliders.push(door.collider);this.doors.push(door);
      const toggle=()=>{door.open=!door.open;for(const {pivot,side}of door.leaves)pivot.rotation.y=door.open?side*Math.PI/2:0;
        const cols=this.levels.get(0).colliders;const i=cols.indexOf(door.collider);if(door.open&&i>=0)cols.splice(i,1);else if(!door.open&&i<0)cols.push(door.collider);
        this.activateFloor(0);game._avisoRey(door.open?'Puertas del salón del trono abiertas':'Puertas del salón del trono cerradas');};
      for(const side of [-1,1])this.interactions.push({x:0,z:z+side*2,label:'E: abrir / cerrar el salón del trono',action:toggle,floor:0});
    }
    stairs(x,target){
      const up=target>this.buildLevel.id;
      for(let i=0;i<14;i++)this.box(x,29+i*.26,3.4,.28,.15,stone,i*.32,false);
      for(const side of [-1,1]){this.cyl(x+side*1.9,29,.18,4.8,gold);this.box(x+side*1.9,30.7,.15,4,.25,gold,4.8,false);}
      this.arch(x,29);this.portal(x,28,'E: '+(up?'subir':'bajar')+' a '+(target===-1?'sótano':target===0?'planta baja':'planta '+target),()=>this.changeFloor(target));
    }
    build(){
      for(const floor of floors){
        const group=new A.Group();group.position.y=floor.height;group.name=floor.name;this.grupo.add(group);
        const level={...floor,group,colliders:[]};this.levels.set(floor.id,level);this.buildLevel=level;
        const light=game.hemi.clone();light.color.set(floor.id<0?'#e5c29a':'#ffe3b5');light.groundColor.set('#687f88');light.intensity=1.2;group.add(light);
        if(floor.id===0){
          this.box(0,15,32,38,.18,'#c5b89e',-.18,false);this.box(0,15,32,38,.2,'#6b6962',6.7,false);
          for(const side of [-1,1]){this.box(side*16,15,.4,38,6.5,stone);this.box(side*9.5,34,13,.4,6.5,stone);this.painting(side*10,-3.7,side<0?0:1,4,3);}
          for(const side of [-1,1]){for(const z of [4,12]){this.box(side*12,z,4,1,.55,wood);this.box(side*14,z,.2,3,1.6,wood);}this.cyl(side*7,0,.5,6.3,stone);this.cyl(side*7,0,.7,.2,gold,5.9);}
          this.rug(0,14,5,35);this.arch(0,34);this.plaque('Vestíbulo real · E: salir',0,34,6);
        }else{
          this.box(0,0,12,40,.18,'#c5b89e',-.18,false);this.box(0,0,12,40,.2,'#6b6962',6.7,false);this.rug(0,0,4,37);
          this.box(0,-20,12,.4,6.5,stone);
          this.box(0,27,32,14,.18,'#c5b89e',-.18,false);this.box(0,27,32,14,.2,'#6b6962',6.7,false);
          this.box(0,34,32,.4,6.5,stone);for(const side of [-1,1]){this.box(side*16,27,.4,14,6.5,stone);this.box(side*11,20,10,.4,6.5,stone);}
          this.arch(0,20);this.plaque(floor.name,0,33.7,10);
        }
        for(const r of rooms.filter(r=>r.floor===floor.id))this.room(r);
        if(floor.id>-1)this.stairs(-9,floor.id-1);
        if(floor.id<2)this.stairs(9,floor.id+1);
        if(floor.id===1){this.portal(-3,-17,'E: balcón norte',()=>this.toBalcony(-1));this.portal(3,-17,'E: balcón sur',()=>this.toBalcony(1));}
      }
      const assignments=['throne','kitchen','library','baths','office','fireplace','dance','staff'];
      for(let i=0;i<8;i++){
        const r=rooms.find(r=>r.type===assignments[i]),h=game.habitantes.find(h=>h.castleSlot===i);if(!h)continue;
        const model=A.person({ropa:i<4?'#304e5b':'#262934',piel:i%2?'#bc8f70':'#e1b998',pelo:i%2?'#332824':'#9d7f55',nombre:h.nombreCompleto});
        const uniform=A.box(i<4?.42:.25,i<4?.7:.35,.04,'#eee8db');uniform.position.set(0,i<4?.8:1.3,.17);model.add(uniform);
        this.levels.get(r.floor).group.add(model);this.actors.push({model,x:r.x+6,z:r.z+4,h,floor:r.floor});
      }
      this.buildLevel=null;
    }
    entrada(){return{x:O.x,z:O.z+31};} salida(){return{x:0,z:this.lado*16.33};} salidaCercana(p){return this.floor===0&&!this.balcony&&Math.hypot(p.x-O.x,p.z-O.z-34)<3;}
    teleport(x,z){this.stopSpar();game.rey.pos.set(O.x+x,this.height,O.z+z);game.rey.modelo.position.copy(game.rey.pos);snap();}
    toBalcony(side){this.stopSpar();this.balconyReturn={floor:this.floor,x:side<0?-3:3,z:-14};this.balcony=side;this.grupo.visible=false;this.removedCastleCollider=game.fort.castillo.colision;game.terreno.colliders=this.worldColliders.filter(c=>c!==this.removedCastleCollider);game.terreno.group.visible=this.worldVisible;game.rey.pos.set(0,8.3,side*14);game.rey.modelo.position.copy(game.rey.pos);snap(side>0?Math.PI:0);game._avisoRey('Balcón '+(side<0?'norte':'sur')+' · E para regresar');}
    fromBalcony(){if(!this.balcony)return;game.terreno.group.visible=false;this.balcony=null;this.grupo.visible=true;this.activateFloor(this.balconyReturn.floor);this.teleport(this.balconyReturn.x,this.balconyReturn.z);}
    toggleSpar(){if(this.floor!==trainingRoom.floor)return;if(this.spar){this.stopSpar();return;}this.spar={hp:100,t:0,cool:1.2,phase:'guardia',hits:0,dodges:0,attacks:0,dodgeCool:0};if(this.floor!==trainingRoom.floor)return;this.spirit.position.set(trainingRoom.x,0,trainingRoom.z);game._avisoRey('Práctica: ataques rápidos, C para esquivar. E para terminar.');}
    stopSpar(){if(this.spar)game._avisoRey('Entrenamiento terminado');this.spar=null;}
    strike(hit){const s=this.spar;if(!s)return;const p=this.spirit.position,dx=O.x+p.x-game.rey.pos.x,dz=O.z+p.z-game.rey.pos.z,d=Math.hypot(dx,dz);if(d>hit.alcance+.5)return;const dot=(dx*Math.sin(game.rey.rotY)+dz*Math.cos(game.rey.rotY))/(d||1);if(dot<Math.cos(hit.cono*Math.PI/360))return;if(s.dodgeCool<=0){p.x=Math.max(trainingRoom.x-9,Math.min(trainingRoom.x+9,p.x+(dx>=0?-2:2)));s.dodgeCool=2;s.dodges++;s.phase='esquiva';game._avisoRey('El espíritu esquiva. ¡Aprovechá su recuperación!');}else{s.hp=Math.max(0,s.hp-hit.dano);s.hits++;game.dmgNums.mostrar(new A.Vector(O.x+p.x,this.height+2,O.z+p.z),String(Math.round(hit.dano)));if(!s.hp){game._avisoRey('¡Práctica completada! Has vencido al espíritu.');this.spar=null;}}}
    tick(dt){this.time+=dt;const p=game.rey.pos;for(const [i,a]of this.actors.entries()){const t=this.time*.7+i;a.model.position.set(a.x+Math.sin(t)*(a.captive?1:1.2),0,a.z+Math.cos(t)*.6);a.model.rotation.y=Math.atan2(Math.cos(t),-Math.sin(t));const parts=a.model.userData.partes;parts.legL.rotation.x=Math.sin(t*6)*.22;parts.legR.rotation.x=-parts.legL.rotation.x;}
      this.flames.forEach((m,i)=>m.scale.y=1+.18*Math.sin(this.time*8+i));this.steam.forEach((m,i)=>{m.position.y=.4+((this.time*.3+i*.13)%2);m.material.opacity=.14*(1-(m.position.y-.4)/2);});
      if(this.spar){const s=this.spar,sp=this.spirit.position,x=p.x-O.x,z=p.z-O.z;if(this.floor!==trainingRoom.floor||Math.abs(x-trainingRoom.x)>12||Math.abs(z-trainingRoom.z)>9){this.stopSpar();return;}s.t+=dt;s.cool-=dt;s.dodgeCool-=dt;const dx=x-sp.x,dz=z-sp.z,d=Math.hypot(dx,dz);this.spirit.rotation.y=Math.atan2(dx,dz);if(d>1.5){sp.x+=dx/d*Math.min(d-1.5,dt*4.5);sp.z+=dz/d*Math.min(d-1.5,dt*4.5);}if(s.cool<.35&&s.cool>0)s.phase='¡ataque inminente!';if(s.cool<=0){s.cool=.72;s.attacks++;s.phase='ataque rápido';this.spirit.userData.partes.armR.rotation.x=-1.6;if(d<2.4&&!game.rey.esquiva){game.rey.vida=Math.max(1,game.rey.vida-4);if(game.rey.vida===1){game._avisoRey('Fin de práctica: recuperate en las termas.');this.spar=null;}}}else this.spirit.userData.partes.armR.rotation.x*=.85;}
    }
    dispose(){this.fromBalcony();this.stopSpar();const cols=game.terreno.colliders;for(const c of this.colliders){const i=cols.indexOf(c);if(i>=0)cols.splice(i,1);}game.terreno.colliders=this.worldColliders;game.terreno.group.visible=this.worldVisible;game.scene.remove(this.grupo);const mats=new Set();this.grupo.traverse(m=>{m.geometry?.dispose();if(m.material)mats.add(m.material);});// Shared engine materials remain owned by the engine.
      for(const m of mats)if(m.map)m.dispose();}
  }
  A.professions.sirviente_castillo='Sirviente del castillo';if(!A.professionIds.includes('sirviente_castillo'))A.professionIds.push('sirviente_castillo');
  function staff(){const names=['Elena','Inés','Clara','Lucía','Arturo','Tomás','Mateo','Julián'];for(let i=0;i<8;i++){if(game.habitantes.some(h=>h.castleSlot===i))continue;const h=A.createResident({raza:'humano'});Object.assign(h,{nombre:names[i],apellido:i<4?'del Alba':'de Roble',genero:i<4?'femenino':'masculino',profesion:'sirviente_castillo',edificioId:game.castillo.id,hogar:game.castillo.id,castleSlot:i,aprendiz:false,potencialMagico:false});game.habitantes.push(h);}game._refrescarPaneles();}staff();
  const load=game._aplicarPartida.bind(game);game._aplicarPartida=function(data){load(data);staff();};
  // Hide exterior copies of castle employees; their interior actors share resident data.
  const updateVillagers=game.aldeanos.update.bind(game.aldeanos);game.aldeanos.update=function(...args){const out=updateVillagers(...args);for(const a of this.mapa.values())if(a.h.castleSlot!==undefined)a.modelo.visible=false;return out;};
  game._entrarCastillo=function(door){const side=door.pos.z<0?-1:1;const interior=new Palace(side);this.enCastillo={interior,lado:side};const p=interior.entrada();this._teletransportar(p.x,p.z);snap();this._avisoRey('Castillo de Loftart · explorá las salas y los balcones');};
  const exitCastle=game._salirCastillo.bind(game);game._salirCastillo=function(){exitCastle();snap();};
  const handle=game._gestionarFortaleza.bind(game);game._gestionarFortaleza=function(){const palace=this.enCastillo?.interior;if(!(palace instanceof Palace))return handle();this._eTomada=false;this._textoFort=null;let action=null;const p=this.rey.pos;if(palace.balcony){this._textoFort='E: regresar por la escalera';action=()=>palace.fromBalcony();}else if(palace.salidaCercana(p)){this._textoFort='E: salir del castillo';action=()=>this._salirCastillo();}else {let best=2.8;for(const item of palace.interactions){if(item.floor!==palace.floor)continue;const d=Math.hypot(p.x-O.x-item.x,p.z-O.z-item.z);if(d<best){best=d;this._textoFort=item.label;action=item.action;}}}if(action&&this.input.presionada('KeyE')&&!this._hayPanelAbierto()){action();this._eTomada=true;}this._mostrarTextoFort(document.getElementById('prompt'));};
  const hit=game._resolverGolpe.bind(game);game._resolverGolpe=function(h){if(this.enCastillo?.interior instanceof Palace)this.enCastillo.interior.strike(h);else hit(h);};
  const updateKing=game.rey.update.bind(game.rey);game.rey.update=function(...args){
    const palace=game.enCastillo?.interior;
    if(!(palace instanceof Palace))return updateKing(...args);
    const height=palace.balcony?8.3:palace.height,cols=game.terreno.colliders;
    this.pos.y-=height;if(!palace.balcony)game.terreno.colliders=palace.colliders;
    try{updateKing(...args);}finally{game.terreno.colliders=cols;this.pos.y+=height;}
    if(palace.balcony){this.pos.x=Math.max(-4.8,Math.min(4.8,this.pos.x));this.pos.z=palace.balcony*Math.max(12.8,Math.min(16,Math.abs(this.pos.z)));}
    this.modelo.position.copy(this.pos);
  };
  // The original camera and movement solver assume a floor at y=0.
  // Solve against only the active storey in local height, then restore world height.
  const updateCamera=game.camRig.update.bind(game.camRig);
  game.camRig.update=function(dt,target,input,colliders){
    const palace=game.enCastillo?.interior;
    if(!(palace instanceof Palace)||palace.balcony)return updateCamera(dt,target,input,colliders);
    const local=target.clone();local.y-=palace.height;
    updateCamera(dt,local,input,palace.colliders);this.camera.position.y+=palace.height;
    const look=this.objetivoSuave.clone();look.y+=palace.height;this.camera.lookAt(look);
  };
  const status=document.createElement('div');status.id='castle-status';status.style.cssText='position:fixed;left:24px;top:78px;max-width:420px;padding:12px 18px;color:#f0dfb8;background:#14272ee8;border-left:3px solid #c5a361;font:16px Georgia;pointer-events:none;display:none';document.getElementById('hud').append(status);
  const frame=game._frame.bind(game);let previous;game._frame=function(ms){const dt=Math.min(.05,Math.max(0,(ms-(previous??ms))/1000));previous=ms;const palace=this.enCastillo?.interior;if(palace instanceof Palace&&!this.menu.abierto&&!this._hayPanelAbierto())palace.tick(dt);frame(ms);status.style.display=this.enCastillo?'block':'none';if(this.enCastillo){const p=this.rey.pos;const room=rooms.find(r=>r.floor===palace.floor&&Math.abs(p.x-O.x-r.x)<(r.width??26)/2&&Math.abs(p.z-O.z-r.z)<(r.depth??20)/2);const s=palace.spar;status.textContent=palace.balcony?'Balcón '+(palace.balcony<0?'norte':'sur')+' · E: regresar':floors.find(f=>f.id===palace.floor).name+' · '+(room?.name??(palace.floor===0?'Vestíbulo real':'Descansillo y galería'))+(s?' · Espíritu '+Math.ceil(s.hp)+'/100 · '+s.phase:' · P: habitantes');}};
  // Real exterior platforms at the original model's balcony height.
  for(const side of [-1,1]){const g=new A.Group();g.name='Balcón accesible';const floor=A.box(11,.25,4.5,stone);floor.position.set(0,8.15,side*14.5);g.add(floor);for(let i=0;i<=16;i++){const bal=A.cylinder(.08,.12,1.2,gold,8);bal.position.set(-5+i*.625,8.9,side*16.6);g.add(bal);}const rail=A.box(10.6,.15,.2,gold);rail.position.set(0,9.55,side*16.6);g.add(rail);for(const x of [-5.2,5.2]){const sideRail=A.box(.18,1.15,4.5,gold);sideRail.position.set(x,8.95,side*14.5);g.add(sideRail);}game.scene.add(g);}
  game.castleExpansion={rooms,floors,origin:O,version:2};
}
