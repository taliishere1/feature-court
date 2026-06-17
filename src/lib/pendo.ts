/**
 * Pendo / Novus app: Feature-court1 (InnovationT > Feature-court1 in Novus UI)
 * App ID: 6679533350748160
 */
export const PENDO_API_KEY = "65d162d9-3564-4163-afea-335d005e12ed";
export const PENDO_APP_ID = "6679533350748160";
export const PENDO_APP_NAME = "Feature-court1";

// Same key as src/lib/visitor.ts — one anonymous ID for Pendo, DB, and app UI
const VISITOR_STORAGE_KEY = "fc-visitor-id";
const LEGACY_SESSION_KEY = "fc-session-visitor-id";

/**
 * Inline install in document <head>: stub loads pendo.js, queues initialize,
 * enables session replay. Visitor ID persists in localStorage so Pendo replays
 * and app stats stay aligned across sessions. SPA pageLoad: PendoPageTracker.
 */
export const PENDO_INSTALL_SNIPPET = `(function(apiKey){
(function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
v=['initialize','identify','updateOptions','pageLoad','track','trackAgent','flushNow'];for(w=0,x=v.length;w<x;++w)(function(m){
o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
var visitorId=localStorage.getItem('${VISITOR_STORAGE_KEY}');
if(!visitorId){visitorId=sessionStorage.getItem('${LEGACY_SESSION_KEY}');if(visitorId)sessionStorage.removeItem('${LEGACY_SESSION_KEY}');}
if(!visitorId){visitorId='anon-'+crypto.randomUUID();}
localStorage.setItem('${VISITOR_STORAGE_KEY}',visitorId);
pendo.initialize({visitor:{id:visitorId},account:{id:'feature-court1'},recording:{enabled:true,autoStart:true}});
})('${PENDO_API_KEY}');`;
