export const PENDO_API_KEY = "65d162d9-3564-4163-afea-335d005e12ed";

/**
 * Inline install snippet: loads the SDK stub, queues initialize before pendo.js
 * arrives, and explicitly enables session replay recording.
 */
export const PENDO_INSTALL_SNIPPET = `(function(apiKey){
(function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
v=['initialize','identify','updateOptions','pageLoad','track','trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
var visitorId=localStorage.getItem('fc-visitor-id');
if(!visitorId){visitorId='anon-'+crypto.randomUUID().slice(0,8);localStorage.setItem('fc-visitor-id',visitorId);}
var accountId=localStorage.getItem('fc-account-id');
if(!accountId){accountId='feature-court-'+crypto.randomUUID().slice(0,8);localStorage.setItem('fc-account-id',accountId);}
pendo.initialize({visitor:{id:visitorId},account:{id:accountId},recording:{enabled:true,autoStart:true}});
})('${PENDO_API_KEY}');`;
