/* Pure three-way merge. Changes to different fields merge; conflicting edits
   to the same field require a user choice instead of silently losing either. */
globalThis.AuroraMerge=(()=>{
 const collections=new Set(['spaces','tasks','entries','habits','goals']);
 const safe=k=>!['__proto__','constructor','prototype'].includes(k);
 const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const canonical=v=>Array.isArray(v)?v.map(canonical):obj(v)?Object.fromEntries(Object.keys(v).filter(safe).sort().map(k=>[k,canonical(v[k])])):v;
 const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
 const copy=v=>v===undefined?undefined:structuredClone(v);
 function merge(base,local,remote,choice){
  const conflicts=[];
  function walk(b,l,r,path){
   if(equal(l,r))return copy(l);if(equal(l,b))return copy(r);if(equal(r,b))return copy(l);
   if(path==='meta')return {...r,...l,updatedAt:Math.max(l?.updatedAt||0,r?.updatedAt||0)};
   if(['u','c'].includes(path.split('.').at(-1))&&typeof l==='number'&&typeof r==='number')return Math.max(l,r);
   if(collections.has(path)&&Array.isArray(l)&&Array.isArray(r)){
    const maps=[b||[],l,r].map(a=>new Map(a.map(v=>[v.id,v]))),ids=new Set([...maps[1].keys(),...maps[2].keys()]);
    return [...ids].map(id=>walk(...maps.map(m=>m.get(id)),path+'.'+id)).filter(v=>v!==undefined);
   }
   if(obj(b)&&obj(l)&&obj(r)&&!!l.del!==!!r.del&&(l.del||r.del)){
    conflicts.push({path,local:copy(l),cloud:copy(r)});return copy(choice==='cloud'?r:l);
   }
   if(obj(l)&&obj(r)&&(b===undefined||obj(b))){const out={};for(const k of new Set([...Object.keys(b||{}),...Object.keys(l),...Object.keys(r)])){if(!safe(k))continue;const v=walk(b?.[k],l[k],r[k],path?path+'.'+k:k);if(v!==undefined)out[k]=v}return out}
   conflicts.push({path,local:copy(l),cloud:copy(r)});return copy(choice==='cloud'?r:l);
  }
  return {state:walk(base||{},local,remote,''),conflicts};
 }
 return {merge,equal};
})();
