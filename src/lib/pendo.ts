/**
 * Pendo / Novus app: Feature-court1 (InnovationT > Feature-court1 in Novus UI)
 * App ID: 6679533350748160
 */
export const PENDO_API_KEY = "65d162d9-3564-4163-afea-335d005e12ed";
export const PENDO_APP_ID = "6679533350748160";
export const PENDO_APP_NAME = "Feature-court1";

const VISITOR_STORAGE_KEY = "fc-visitor-id";
const ACCOUNT_STORAGE_KEY = "fc-account-id";
const LEGACY_ACCOUNT_PREFIX = "feature-court-";
const ACCOUNT_PREFIX = "feature-court1-";

/**
 * Inline install in document <head>: stub loads pendo.js, queues initialize,
 * enables session replay. SPA pageLoad is handled only by PendoPageTracker
 * (avoids double-counting with duplicate history hooks).
 */
export const PENDO_INSTALL_SNIPPET = `(function(apiKey){
(function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
v=['initialize','identify','updateOptions','pageLoad','track','trackAgent','flushNow'];for(w=0,x=v.length;w<x;++w)(function(m){
o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
var visitorId=localStorage.getItem('${VISITOR_STORAGE_KEY}');
if(!visitorId){visitorId='anon-'+crypto.randomUUID().slice(0,8);localStorage.setItem('${VISITOR_STORAGE_KEY}',visitorId);}
var accountId=localStorage.getItem('${ACCOUNT_STORAGE_KEY}');
if(accountId&&accountId.indexOf('${LEGACY_ACCOUNT_PREFIX}')===0&&accountId.indexOf('${ACCOUNT_PREFIX}')!==0){
accountId='${ACCOUNT_PREFIX}'+accountId.slice('${LEGACY_ACCOUNT_PREFIX}'.length);
localStorage.setItem('${ACCOUNT_STORAGE_KEY}',accountId);
}
if(!accountId){accountId='${ACCOUNT_PREFIX}'+crypto.randomUUID().slice(0,8);localStorage.setItem('${ACCOUNT_STORAGE_KEY}',accountId);}
pendo.initialize({visitor:{id:visitorId},account:{id:accountId},recording:{enabled:true,autoStart:true}});
})('${PENDO_API_KEY}');`;
