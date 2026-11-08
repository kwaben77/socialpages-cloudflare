self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});

async function closeCallNotifs(){
  try{
    const old=await self.registration.getNotifications();
    old.forEach(n=>{ if(n.tag&&n.tag.indexOf('sp-call')===0) n.close(); });
  }catch(x){}
}

// Réception d'un push (app fermée ou en arrière-plan)
self.addEventListener('push',e=>{
  let d={}; try{d=e.data.json()}catch(x){}
  const call=d.type==='call';
  e.waitUntil((async()=>{
    if(call){
      // Rappels de sonnerie : si l'app est affichée à l'écran, elle sonne elle-même, on ne duplique pas
      if(d.n>0){
        try{
          const cl=await self.clients.matchAll({type:'window',includeUncontrolled:true});
          if(cl.some(c=>c.visibilityState==='visible')) return;
        }catch(x){}
      }
      // Chaque sonnerie = une NOUVELLE notification (les anciennes sont fermées) pour que le téléphone resonne
      await closeCallNotifs();
    } else if(d.type==='message' && typeof d.body==='string' && d.body.indexOf('📞')===0){
      // « Appel manqué / refusé / terminé » : l'ancienne notification d'appel n'a plus lieu d'être
      await closeCallNotifs();
    }
    const tag=call?('sp-call-'+Date.now()):(d.tag||'sp');
    await self.registration.showNotification(d.title||'SocialPages',{
      body:d.body||'',
      icon:'apple-touch-icon.png', badge:'apple-touch-icon.png',
      tag:tag, renotify:true, silent:false,
      requireInteraction:call,
      vibrate:call?[600,300,600,300,600]:[200,100,200],
      timestamp:Date.now(),
      data:{url:d.url||'./'},
      actions:call?[{action:'open',title:'Répondre'}]:[]
    });
  })());
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){ if('focus' in c) return c.focus(); }
    return clients.openWindow(url);
  }));
});
