self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});

// Réception d'un push (app fermée ou en arrière-plan)
self.addEventListener('push',e=>{
  let d={}; try{d=e.data.json()}catch(x){}
  const call=d.type==='call';
  e.waitUntil((async()=>{
    // Un appel = une NOUVELLE notification : on ferme les anciennes pour que le téléphone sonne/vibre à chaque fois
    if(call){
      try{
        const old=await self.registration.getNotifications();
        old.forEach(n=>{ if(n.tag&&n.tag.indexOf('sp-call')===0) n.close(); });
      }catch(x){}
    }
    const tag=call?('sp-call-'+Date.now()):(d.tag||'sp');
    await self.registration.showNotification(d.title||'SocialPages',{
      body:d.body||'',
      icon:'apple-touch-icon.png', badge:'apple-touch-icon.png',
      tag:tag, renotify:true, silent:false,
      requireInteraction:call,
      vibrate:call?[700,300,700,300,700,300,700,300,700,300,700]:[200,100,200],
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
