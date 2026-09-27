/* Account-scoped, local-first sync. No administrative key belongs in this file. */
window.AuroraCloud=(()=>{
 const cfg=window.AURORA_CLOUD_CONFIG, merge=window.AuroraMerge;
 let client,user=null,base=null,busy=false,timer,channel,blocked=false,last='Saved on this device',started=false,lastRev=-1,viaLink=false,skipped=0;
 const copy=x=>structuredClone(x), $c=s=>document.querySelector(s);
 const content=st=>['spaces','tasks','entries','habits','goals'].some(k=>st[k]?.length);
 const editing=()=>!!document.querySelector('dialog[open],#cardView.in,#gridOverlay.on')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable||typeof homeEdit!=='undefined'&&homeEdit;
 function status(message){last=message;const el=$c('#cloudStatus');if(el)el.textContent=message;const who=$c('#cloudAccount');if(who)who.textContent=user?user.email:'Sign in on your phone and desktop to share your Spaces, notes and photos.';if($c('#cloudLogin'))$c('#cloudLogin').hidden=!!user;if($c('#cloudSync'))$c('#cloudSync').hidden=!user;if($c('#cloudLogout'))$c('#cloudLogout').hidden=!user;}
 function failure(e){const msg=e?.message||String(e);if(/aurora_state|aurora_commit|schema cache|bucket not found/i.test(msg))return 'Cloud setup is incomplete. Run supabase-setup.sql, then retry.';if(!navigator.onLine||/fetch|network/i.test(msg))return 'Offline — changes remain on this device. Will retry.';return 'Sync paused: '+msg;}
 function queue(delay=900){clearTimeout(timer);if(user&&!blocked){status('Saved on this device · waiting to sync');timer=setTimeout(()=>sync(),delay)}}
 const localSave=Store.save;
 Store.save=function(){const result=localSave.apply(this,arguments);Promise.resolve(result).then(()=>{if(window.AURORA_SAVE_STATE!=='error')queue()});return result};
 const localMedia=Store.media.get;
 Store.media.get=async id=>{const own=await localMedia(id);if(own||!user||blocked||!client)return own;try{const {data,error}=await client.storage.from('aurora-media').download(path(id));if(error)throw error;await DB.set('images',id,data);await DB.set('kv','cloud-media:'+user.id+':'+id,'remote');return data}catch(e){status(failure(e));return null}};
 function path(id){return user.id+'/'+encodeURIComponent(String(id))}
 function mediaIds(st){const ids=new Set();function walk(v){if(!v||typeof v!=='object'||v.del)return;for(const [k,x]of Object.entries(v)){if((k==='img'||k==='poster')&&typeof x==='string'&&x)ids.add(x);else if(typeof x==='object')walk(x)}}walk(st);return [...ids]}
 // Media ids are unique and never change content, so "already uploaded" is a flag, not a hash.
 // A file over the bucket limit stays on this device instead of stopping every sync.
 async function uploadMedia(st,uid,remote){skipped=0;const remoteIds=new Set(mediaIds(remote));for(const id of mediaIds(st)){if(user?.id!==uid)throw Error('Account changed');const key='cloud-media:'+uid+':'+id;if(await DB.get('kv',key))continue;const blob=await localMedia(id);if(!blob){if(!remoteIds.has(id))throw Error("A referenced media file is missing on this device. Restore it or remove its reference before syncing.");continue}if(blob.size>52428800){skipped++;continue}status('Uploading media…');const type=blob.type||(/video/i.test(String(id))?'video/mp4':'image/jpeg');const {error}=await client.storage.from('aurora-media').upload(path(id),blob,{upsert:true,contentType:type});if(error)throw error;await DB.set('kv',key,'up')}}
 function valid(st){return st&&typeof st==='object'&&Number(st.v)<=SCHEMA&&st.settings&&['spaces','tasks','entries','habits','goals'].every(k=>Array.isArray(st[k]))}
 function choose(conflicts){return new Promise(resolve=>{const d=$c('#cloudConflict');$c('#cloudConflictDetails').textContent=conflicts.slice(0,12).map(x=>x.path+'\nThis device: '+JSON.stringify(x.local)+'\nCloud: '+JSON.stringify(x.cloud)).join('\n\n');let done=false;const finish=v=>{if(done)return;done=true;d.close();d.oncancel=null;resolve(v)};d.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>finish(b.dataset.choice));d.oncancel=e=>{e.preventDefault();finish(null)};d.showModal()})}
 async function sync(force=false){
  if(!user||blocked||busy)return;if(!navigator.onLine){status('Offline — changes remain on this device.');return}if(!force&&(document.hidden||editing())){queue(2500);return}
  const uid=user.id;busy=true;
  try{
   if(!force&&base&&lastRev>=0&&merge.equal(S,base)){const {data:head,error:headError}=await client.from('aurora_state').select('revision').eq('user_id',uid).maybeSingle();if(!headError&&(head?.revision||0)===lastRev){if(!/^Synced/.test(last))status('Synced');return}}
   status('Syncing…');
   for(let attempt=0;attempt<4;attempt++){
    const {data:row,error}=await client.from('aurora_state').select('state,revision').eq('user_id',uid).maybeSingle();if(error)throw error;if(user?.id!==uid)return;
    let remote=row?.state;const revision=row?.revision||0;if(remote&&!valid(remote))throw Error('This cloud account uses a newer Aurora. Update the app before syncing.');if(remote&&Number(remote.v)<SCHEMA)remote=Store.migrate(copy(remote));if(base&&Number(base.v)<SCHEMA)base=Store.migrate(base);
    const local=copy(S);let result;
    if(!remote)result={state:local,conflicts:[]};
    else if(!base&&!content(local))result={state:copy(remote),conflicts:[]};
    else result=merge.merge(base||defaultState(),local,remote);
    if(result.conflicts.length){status('Choose how to resolve simultaneous edits');const choice=await choose(result.conflicts);if(!choice){blocked=true;status('Sync paused · tap Sync now to review conflicts');return}result=merge.merge(base||defaultState(),local,remote,choice)}
    if(!merge.equal(local,S)){continue}
    let committed=result.state,rev=revision;
    if(!remote||!merge.equal(result.state,remote)){
     await uploadMedia(result.state,uid,remote);
     const {data:answer,error:writeError}=await client.rpc('aurora_commit',{expected_revision:revision,next_state:result.state});if(writeError)throw writeError;if(!answer?.ok)continue;committed=answer.state;rev=answer.revision;
    }
    if(user?.id!==uid)return;
    // Never replace form-owned objects while the user is editing a draft.
    if(editing()){base=copy(local);lastRev=-1;await DB.set('kv','cloud-base:'+uid,base);status('Changes sent · incoming changes wait until you finish editing');queue(2500);return}
    const latest=merge.merge(local,S,committed,'local').state,changed=!merge.equal(S,latest);
    if(changed){S=latest;await DB.set('kv','state',S);applyLook();render();if(typeof activeIntro!=='undefined')activeIntro?.update(readMotionIntro());}
    base=copy(committed);lastRev=rev;await DB.set('kv','cloud-base:'+uid,base);await DB.set('kv','cloud-last:'+uid,Date.now());
    if(!merge.equal(S,committed)){queue();return}
    status((skipped?skipped+' large file'+(skipped>1?'s stay':' stays')+' on this device · ':'')+'Synced · '+new Date().toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}));return;
   }
   queue(2200);
  }catch(e){status(failure(e));}finally{busy=false}
 }
 async function sessionChanged(session){
  const next=session?.user;if(next?.id===user?.id)return;if(channel){client.removeChannel(channel);channel=null}clearTimeout(timer);user=next||null;base=null;lastRev=-1;blocked=true;
  if(!user){blocked=false;status('Saved on this device · not signed in');return}
  const owner=await DB.get('kv','cloud-owner');if(owner&&owner!==user.id){blocked=true;status('This device contains another account’s data. Sign out and erase the local copy before switching accounts.');return}
  if(!owner&&viaLink&&content(S)&&!confirm('Connect this device to '+(user.email||'this account')+'?\n\nThe Spaces, tasks, notes and photos on this device will be added to that account.')){viaLink=false;user=null;await client.auth.signOut({scope:'local'});status('Saved on this device · not signed in');return}
  viaLink=false;await DB.set('kv','cloud-owner',user.id);blocked=false;base=await DB.get('kv','cloud-base:'+user.id)||null;status('Connected · checking cloud');
  channel=client.channel('aurora-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'aurora_state',filter:'user_id=eq.'+user.id},()=>queue(300)).subscribe();queue(100);
 }
 function mount(){
  if($c('#cloudPanel'))return;const panel=document.createElement('section');panel.id='cloudPanel';panel.className='glass cloud-panel';panel.innerHTML='<h3>Account & sync</h3><p id="cloudAccount"></p><p class="cloud-status" id="cloudStatus" role="status" aria-live="polite"></p><div class="cloud-actions"><button class="btn" id="cloudLogin">Connect my devices</button><button class="btn" id="cloudSync" hidden>Sync now</button><button class="btn ghost" id="cloudLogout" hidden>Sign out</button></div>';
  $c('[data-acc="data"]').before(panel);
  const d=document.createElement('dialog');d.id='cloudAuth';d.className='cloud-dialog';d.innerHTML='<h2>Your Aurora, everywhere.</h2><p>Use the same email on your phone and desktop. We will send you a secure sign-in link. Open it on the device you want to connect.</p><form id="cloudAuthForm"><label for="cloudEmail">Email</label><input id="cloudEmail" type="email" autocomplete="email" required><p class="cloud-message" id="cloudAuthMessage" role="status"></p><div class="cloud-actions"><button type="submit" class="primary" id="cloudSubmit">Email me a sign-in link</button><button type="button" id="cloudCancel">Close</button></div></form>';
  document.body.append(d);
  const c=document.createElement('dialog');c.id='cloudConflict';c.className='cloud-dialog';c.innerHTML='<h2>Two edits, one place.</h2><p>The same fields changed on both devices. Choose which version to keep for these conflicts. Other changes will be combined.</p><pre class="cloud-conflicts" id="cloudConflictDetails"></pre><div class="cloud-actions"><button data-choice="local">Keep this device’s edits</button><button data-choice="cloud">Keep cloud edits</button><button data-choice="">Decide later</button></div>';document.body.append(c);
  $c('#cloudLogin').onclick=()=>{d.showModal();$c('#cloudEmail').focus()};$c('#cloudCancel').onclick=()=>d.close();
  $c('#cloudSync').onclick=()=>{if(blocked&&last.includes('another account'))return;blocked=false;sync(true)};
  $c('#cloudLogout').onclick=async()=>{if(busy){status('Please wait for the current sync to finish.');return}const {error}=await client.auth.signOut({scope:'local'});if(error)status(failure(error));else await sessionChanged(null)};
  let cooldown=0;
  $c('#cloudAuthForm').onsubmit=async e=>{e.preventDefault();const btn=$c('#cloudSubmit');btn.disabled=true;try{
   if(!client)throw Error('Connection is unavailable. Try reloading the app.');
   if(Date.now()<cooldown)throw Error('Please wait a minute before requesting another email.');
   const host=window.parent.location;
   if(!/^https?:$/.test(host.protocol))throw Error('Open the hosted app to sign in. Email links do not work with a downloaded file.');
   const {error}=await client.auth.signInWithOtp({email:$c('#cloudEmail').value.trim(),options:{emailRedirectTo:host.origin+host.pathname}});
   if(error)throw error;cooldown=Date.now()+60000;
   $c('#cloudAuthMessage').textContent='Check your inbox and open the sign-in link on this device. You can close this window.';
  }catch(err){$c('#cloudAuthMessage').textContent=err.message}finally{btn.disabled=false}};
  // Wiping is explicitly local; require sign-out so an empty state cannot reach the cloud.
  document.addEventListener('click',e=>{if(e.target.closest('#wipeBtn')&&user){e.preventDefault();e.stopImmediatePropagation();toast('Sign out before erasing the local copy. Your cloud data will stay safe.')}},true);
  status(last);
 }
 async function start(){if(started)return;started=true;mount();try{client=window.AURORA_CLOUD_CLIENT_FACTORY?window.AURORA_CLOUD_CLIENT_FACTORY():supabase.createClient(cfg.url,cfg.key,{auth:{storageKey:'aurora-cloud-session-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>sessionChanged(session).catch(e=>status(failure(e))),0));const returned=window.parent.AURORA_AUTH_RETURN;window.parent.AURORA_AUTH_RETURN=null;
if(returned?.error)throw Error(returned.error);
if(returned?.access_token&&returned?.refresh_token){viaLink=true;const {error:authError}=await client.auth.setSession({access_token:returned.access_token,refresh_token:returned.refresh_token});if(authError)throw authError;}
const {data,error}=await client.auth.getSession();if(error)throw error;await sessionChanged(data.session);if(!user)status('Saved on this device · not signed in');}catch(e){status(failure(e))}}
 addEventListener('online',()=>queue(100));setInterval(()=>{if(user&&!blocked&&!document.hidden)sync()},8000);
 return {start,sync,status:()=>last,isConnected:()=>!!user,mediaIds};
})();
