SOCIALPAGES — PAQUET POUR CLOUDFLARE PAGES
=============================================

CONTENU
-------
- index.html : copie de votre fichier index(10).html, renommée pour l'hébergement.
  Le contenu du HTML n'a pas été modifié.
- manifest.webmanifest, sw.js et icônes PNG : ressources PWA réutilisées depuis
  l'archive SocialPages précédente afin de satisfaire les références du HTML.
- _headers : en-têtes statiques. Cloudflare Pages peut utiliser ce fichier.

CONFIGURATION CLOUDFLARE PAGES AVEC GITHUB
------------------------------------------
Dépôt : socialpages
Branche : main
Framework preset : Aucun
Build command : laisser vide
Build output directory : .

IMPORTANT AVANT DE DÉPLOYER
---------------------------
Ce ZIP est un paquet statique préparé à partir du dernier HTML reçu.
Il ne contient pas de scripts SQL, de secrets serveur, ni de fonctions Supabase
Edge Functions. Il ne remplace pas la configuration déjà présente dans Supabase.

Le code HTML a été conservé sans modification. La syntaxe JavaScript intégrée
a passé une vérification statique Node.js, mais cela ne prouve pas que toutes
les fonctions fonctionnent en production.

Les ressources PWA (manifest, service worker et icônes) ont été reprises d'une
archive précédente du projet. Le service worker fourni est minimal : sa présence
permet son enregistrement, mais ne constitue pas à elle seule une preuve du
fonctionnement des notifications Push en arrière-plan.

AUCUNE ACTION SUR VOS SERVICES
------------------------------
- Le site Netlify existant n'a pas été modifié.
- Aucun fichier n'a été envoyé sur GitHub.
- Aucun déploiement Cloudflare n'a été lancé.
- Aucune modification Supabase ou SQL n'a été effectuée.

ÉTAPE SUIVANTE
--------------
Avant le déploiement, vérifiez que le contenu de ce dossier est bien celui que
vous souhaitez publier. Ensuite, il faudra remplacer les anciens fichiers du
dépôt GitHub par le contenu de ce paquet, puis lancer le déploiement Cloudflare.
Ne déployez pas une ancienne version du dépôt.
