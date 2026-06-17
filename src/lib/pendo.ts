/**
 * Pendo / Novus app: Feature-court1 (InnovationT > Feature-court1 in Novus UI)
 * - App ID: 6679533350748160
 * - API key below must be the Install Settings key from Feature-court1
 */
export const PENDO_API_KEY = "65d162d9-3564-4163-afea-335d005e12ed";
export const PENDO_APP_ID = "6679533350748160";
export const PENDO_APP_NAME = "Feature-court1";

const VISITOR_STORAGE_KEY = "fc1-visitor-id";
const ACCOUNT_STORAGE_KEY = "fc1-account-id";

/**
 * Part 1 — SPA install stub (loads pendo.js only).
 * @see https://support.pendo.io/hc/en-us/articles/360031862272
 */
export const PENDO_STUB_SNIPPET = `(function(apiKey){
(function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
v=['initialize','identify','updateOptions','pageLoad','track','trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('${PENDO_API_KEY}');`;

export function ensurePendoIds(): { visitorId: string; accountId: string } {
  let visitorId = localStorage.getItem(VISITOR_STORAGE_KEY);
  if (!visitorId) {
    visitorId = "anon-" + crypto.randomUUID().slice(0, 8);
    localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
  }

  let accountId = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  if (!accountId) {
    accountId = "feature-court1-" + crypto.randomUUID().slice(0, 8);
    localStorage.setItem(ACCOUNT_STORAGE_KEY, accountId);
  }

  return { visitorId, accountId };
}

export function buildPendoInitConfig() {
  const { visitorId, accountId } = ensurePendoIds();
  return {
    visitor: { id: visitorId },
    account: { id: accountId },
    recording: { enabled: true, autoStart: true },
  } as const;
}
