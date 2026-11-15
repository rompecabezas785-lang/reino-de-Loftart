// District identity, model footprint normalization and measured placement audit.
(() => {
  const g=window.__juego;
  const districts=[
    {id:'artesanos',name:'Barrio de la Forja',x:-34,z:-30,color:'#ad7350',roof:'#5c4540',detail:'Herrería · Canteras · Oficios'},
    {id:'guardia',name:'Bastión del Norte',x:34,z:-30,color:'#71899a',roof:'#354f64',detail:'Cuartel · Almacén · Guardia'},
    {id:'mercado',name:'Barrio del Pan',x:-34,z:32,color:'#caa76c',roof:'#a56540',detail:'Hornos · Cocina · Mercado'},
    {id:'jardines',name:'Jardines del Saber',x:34,z:32,color:'#91a894',roof:'#426a68',detail:'Academia · Huertas · Molino'},
  ];
  const districtFor=(x,z)=>districts.reduce((a,b)=>Math.hypot(x-a.x,z-a.z)<Math.hypot(x-b.x,z-b.z)?a:b);
  const before=[],after=[],normalized=new WeakSet();
  function bounds(building){return new nr().setFromObject(building.grupo);}
  function collisions(){const pairs=[];for(let i=0;i<g.edificios.length;i++)for(let j=i+1;j<g.edificios.length;j++){
    const a=g.edificios[i],b=g.edificios[j],aa=bounds(a),bb=bounds(b);
    const x=Math.min(aa.max.x,bb.max.x)-Math.max(aa.min.x,bb.min.x),z=Math.min(aa.max.z,bb.max.z)-Math.max(aa.min.z,bb.min.z);
    if(x>.05&&z>.05)pairs.push({a:a.id,b:b.id,x,z});
  }return pairs;}
  before.push(...collisions());
  const materials=new Map();
  function decorate(e){
    if(e.tipoId==='castillo')return;
    const district=districtFor(e.x,e.z);
    for(const root of e.grupo.children){
      if(root.userData.bandera||normalized.has(root))continue;
      normalized.add(root);root.updateMatrixWorld(true);
      const b=new nr().setFromObject(root),size=b.getSize(new U());
      if(size.x===0||size.z===0)continue;
      const sx=Math.min(1,e.def.tam[0]*.92/size.x),sz=Math.min(1,e.def.tam[2]*.92/size.z);
      root.scale.x*=sx;root.scale.z*=sz;root.updateMatrixWorld(true);
      const adjusted=new nr().setFromObject(root),center=adjusted.getCenter(new U());
      root.position.x+=e.x-center.x;root.position.z+=e.z-center.z;
      root.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=true;mesh.receiveShadow=true;
        const transform=material=>{const key=material.uuid+district.id;if(!materials.has(key)){
          const m=material.clone();if(m.color)m.color.lerp(new q(district.color),.14);
          if('roughness'in m)m.roughness=Math.max(.65,m.roughness);
          if(m.map)m.map.anisotropy=Math.min(4,g.renderer.capabilities.getMaxAnisotropy());materials.set(key,m);
        }return materials.get(key);};mesh.material=Array.isArray(mesh.material)?mesh.material.map(transform):transform(mesh.material);
      });
    }
    // Keep existing shared collider objects so saves and the AI retain references.
    const b=bounds(e);for(const c of e.colliders)if(c.tipo==='caja')Object.assign(c,{minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,alto:b.max.y});
  }
  for(const e of g.edificios){decorate(e);const update=e.actualizarModelo.bind(e);e.actualizarModelo=()=>{update();decorate(e);};}
  after.push(...collisions());
  const scenery=new Mn();scenery.name='Barrios de la ciudad';g.scene.add(scenery);
  const occupied=g.edificios.map(e=>{const b=bounds(e);return {minX:b.min.x-.8,maxX:b.max.x+.8,minZ:b.min.z-.8,maxZ:b.max.z+.8};});
  // Preserve the two main roads and each building's approach corridor.
  const footprints=[];
  function reserve(x,z,w,d){const b={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2};
    if(Math.abs(x)<9||Math.abs(z)<9||Math.abs(x)>60||Math.abs(z)>60)return false;
    if(g.edificios.some(e=>Math.abs(x-e.x)<2.5&&z>e.z&&z<e.z+e.def.tam[2]/2+5))return false;
    if([...occupied,...footprints].some(a=>b.minX<a.maxX&&b.maxX>a.minX&&b.minZ<a.maxZ&&b.maxZ>a.minZ))return false;
    footprints.push(b);return true;
  }
  const palettes={wood:new Xo({color:0x71553b,roughness:.92}),metal:new Xo({color:0x434c55,metalness:.45,roughness:.55}),leaf:new Xo({color:0x557452,roughness:1}),stone:new Xo({color:0xc0b59e,roughness:1})};
  const pieces=[];
  function part(group,w,h,d,x,y,z,mat){const m=Z(w,h,d,'#ffffff');m.material=mat;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);pieces.push(m);return m;}
  const counts={};
  for(const district of districts){counts[district.id]=0;const fabric=new Xo({color:district.roof,roughness:1});
    for(let i=0;i<30&&counts[district.id]<9;i++){
      const x=district.x+(i%6-2.5)*7,z=district.z+(Math.floor(i/6)-2)*7;
      if(!reserve(x,z,3,2.5))continue;
      const group=new Mn();group.position.set(x,0,z);scenery.add(group);counts[district.id]++;
      if(district.id==='mercado'){
        part(group,2.6,.15,1.5,0,.9,0,palettes.wood);
        for(const xx of [-1.2,1.2])for(const zz of [-.65,.65])part(group,.12,2.5,.12,xx,1.25,zz,palettes.wood);
        const roof=part(group,2.9,.15,1.9,0,2.5,0,fabric);roof.rotation.x=.12;
        for(let k=0;k<3;k++)part(group,.55,.3,.5,k*.7-.7,1.1,0,palettes.stone);
      }else if(district.id==='artesanos'){
        for(let k=0;k<3;k++){part(group,.8,.8,.9,k*.85-.85,.4,0,palettes.wood);part(group,.9,.12,1,k*.85-.85,.75,0,palettes.metal);}
      }else if(district.id==='guardia'){
        part(group,2.5,.2,1,0,.6,0,palettes.wood);
        for(const xx of [-1,1])part(group,.14,2,.14,xx,1,0,palettes.metal);
        part(group,2.5,.18,.18,0,1.8,0,palettes.wood);
        for(const xx of [-.7,0,.7])part(group,.45,.65,.15,xx,1.4,.1,fabric);
      }else{
        part(group,2.7,.45,1.8,0,.225,0,palettes.stone);
        for(const xx of [-.8,0,.8]){part(group,.7,.7,1.2,xx,.75,0,palettes.leaf);part(group,.2,.2,.2,xx,1.2,.2,fabric);}
      }
      g.terreno.colliders.push(ff(x,z,2.8,2.2,1.2));
    }
  }
  // Compact instancing keeps district props inexpensive.
  scenery.updateMatrixWorld(true);const unit=Z(1,1,1,'#ffffff').geometry;
  for(const material of new Set(pieces.map(p=>p.material))){const group=pieces.filter(p=>p.material===material),batch=new Fi(unit,material,group.length),dummy=new jn();
    group.forEach((p,i)=>{p.getWorldPosition(dummy.position);p.getWorldQuaternion(dummy.quaternion);const b=p.geometry.parameters;dummy.scale.set(b.width,b.height,b.depth);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);p.removeFromParent();p.geometry.dispose();});batch.castShadow=true;batch.receiveShadow=true;scenery.add(batch);
  }
  const label=document.createElement('div');label.id='barrio-actual';document.getElementById('hud').append(label);
  const update=g._actualizarHudOleadas.bind(g);g._actualizarHudOleadas=()=>{update();const p=g.rey.pos;
    label.hidden=g.enInterior||g.mazmorra||Math.max(Math.abs(p.x),Math.abs(p.z))>68;
    const d=districtFor(p.x,p.z),central=Math.hypot(p.x,p.z)<20;
    label.textContent=central?'Plaza de la Corona':d.name+' · '+d.detail;
  };
  g.cityAudit={before,after,counts,footprints,districts,buildingCount:g.edificios.length};
})();
