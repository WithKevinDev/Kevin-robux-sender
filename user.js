// ==UserScript==
// @name         KEVIN CATALOGUE GIFTER
// @namespace    kevin.catalogue.gifter
// @version      1.0.2
// @description  Kevin Catalogue Gifter (local visual simulation; does not send real gifts or grant Robux)
// @author       Kevin
// @match        https://www.roblox.com/*
// @match        https://web.roblox.com/*
// @run-at       document-start
// @noframes
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_addValueChangeListener
// @connect      users.roblox.com
// @connect      thumbnails.roblox.com
// @connect      friends.roblox.com
// ==/UserScript==

(() => {

  "use strict";

  // Visible launcher so the panel can always be opened without the Tampermonkey menu.
  GM_addStyle(`
    #kcg-launcher {
      position: fixed !important; right: 18px !important; bottom: 18px !important;
      z-index: 2147483647 !important; display: flex !important; align-items: center !important;
      gap: 9px !important; padding: 12px 16px !important; border-radius: 999px !important;
      border: 1px solid rgba(255,92,120,.9) !important;
      background: linear-gradient(135deg,#ff3155,#9f1239) !important;
      color: #fff !important; font: 800 12px/1.1 system-ui,sans-serif !important;
      letter-spacing: .09em !important; cursor: pointer !important;
      box-shadow: 0 8px 28px rgba(225,20,60,.38), inset 0 1px rgba(255,255,255,.2) !important;
      transition: transform .18s ease, box-shadow .18s ease, filter .18s ease !important;
    }
    #kcg-launcher:hover { transform: translateY(-3px) !important; filter: brightness(1.12) !important; }
    #kcg-launcher:active { transform: scale(.97) !important; }
    #kcg-launcher .kcg-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #fff;
      box-shadow: 0 0 10px rgba(255,255,255,.85); display: inline-block;
    }
    #rpkp-root { z-index: 2147483646 !important; }
  `);


  const DEFAULTS = { fakeRobux: 1000000, fakeEnabled: true, giftEnabled: true, deductOnGift: true, fakeOwned: {}, comboDiscountEnabled: true, comboDiscount: 3000 };
  const MAX = 2147483647;

  let settings = {};
  for (const k in DEFAULTS) settings[k] = GM_getValue(k, DEFAULTS[k]);

  function setVals(patch) {
    for (const k in patch) { settings[k] = patch[k]; GM_setValue(k, patch[k]); }
    flashSaved();
    tick();
    refreshPanel();
  }

  try {
    for (const k in DEFAULTS) {
      GM_addValueChangeListener(k, (name, _old, newV, remote) => {
        settings[name] = newV;
        if (remote) { tick(); refreshPanel(); }
      });
    }
  } catch (_) {}

  GM_addStyle(`
html.rpk-fake #nav-robux-amount:not([data-rpk]),
html.rpk-fake #nav-robux-balance:not([data-rpk]) { visibility: hidden !important; }

.rpk-overlay, .rpk-buy-overlay, .rpk-gift-btn {
  --rpk-surface:#1d1e22; --rpk-shift:#2b2d33; --rpk-hover:rgba(255,255,255,0.08); --rpk-press:rgba(255,255,255,0.14);
  --rpk-text:#f7f7f8; --rpk-muted:#a8a9ad; --rpk-stroke:rgba(255,255,255,0.22); --rpk-stroke-strong:rgba(255,255,255,0.5);
  --rpk-primary:#335fff; --rpk-primary-hover:#2a4fd8; --rpk-green:#00b06f; --rpk-scrim:rgba(0,0,0,0.6);
}
.rpk-overlay.rpk-light, .rpk-buy-overlay.rpk-light, .rpk-gift-btn.rpk-light {
  --rpk-surface:#ffffff; --rpk-shift:#f2f2f3; --rpk-hover:rgba(0,0,0,0.05); --rpk-press:rgba(0,0,0,0.1);
  --rpk-text:#121215; --rpk-muted:#5e5f63; --rpk-stroke:rgba(0,0,0,0.22); --rpk-stroke-strong:rgba(0,0,0,0.55);
  --rpk-green:#00a160; --rpk-scrim:rgba(0,0,0,0.5);
}

.rpk-gift-btn { --rpk-gift-bg:#393b3d; --rpk-gift-bg-hover:#45474a; --rpk-gift-text:#ffffff;
  background:var(--rpk-gift-bg)!important; color:var(--rpk-gift-text)!important; border:0!important; transition:background-color .12s; }
.rpk-gift-btn.rpk-light { --rpk-gift-bg:#e3e4e6; --rpk-gift-bg-hover:#d8d9dc; --rpk-gift-text:#393b3d; }
.rpk-gift-btn:hover { background:var(--rpk-gift-bg-hover)!important; }

.rpk-gift-floating { position:fixed; right:24px; bottom:24px; z-index:2147483000; min-width:140px; height:48px; padding:0 20px;
  border:0; border-radius:8px; background:#393b3d; color:#fff; font:600 18px/1 "Builder Sans","Segoe UI",sans-serif; cursor:pointer; }
.rpk-gift-floating:hover { filter:brightness(1.08); }

html.rpk-owned-page #item-details-container .item-purchase-btns-container > *:not(.rpk-gift-container):not(.rpk-owned-row) { display:none!important; }
.rpk-owned-row { width:100%; }
.rpk-owned-edit { flex:none; }

.rpk-icon { display:inline-block; flex:none; color:var(--rpk-text); }
.rpk-icon-sm { width:16px; height:16px; }
.rpk-icon-md { width:24px; height:24px; }
.rpk-icon-lg { width:28px; height:28px; }
.rpk-icon-fallback { display:inline-flex; align-items:center; justify-content:center; font-size:18px; line-height:1; background:none!important; }
.rpk-fallback-robux { background:var(--rpk-text)!important; clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%); position:relative; }
.rpk-fallback-robux::after { content:""; position:absolute; inset:22%; background:var(--rpk-surface); clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%); }
.rpk-robux { display:inline-flex; align-items:center; gap:6px; font-weight:600; }

.rpk-overlay { position:fixed; inset:0; z-index:2147483600; display:flex; align-items:center; justify-content:center; padding:16px;
  background:var(--rpk-scrim); animation:rpk-fade .18s ease-out; font-family:"Builder Sans","HCo Gotham SSm","Segoe UI",sans-serif; -webkit-font-smoothing:antialiased; }
.rpk-overlay.rpk-out { animation:rpk-fade .2s ease-in reverse forwards; }
@keyframes rpk-fade { from { opacity:0; } to { opacity:1; } }

.rpk-sheet { position:relative; display:flex; flex-direction:column; width:490px; max-width:100%; max-height:min(620px,calc(100vh - 32px));
  overflow:hidden; border-radius:16px; border:1px solid var(--rpk-stroke); background:var(--rpk-surface); color:var(--rpk-text);
  box-shadow:0 16px 48px rgba(0,0,0,0.32); animation:rpk-pop .22s cubic-bezier(.2,1.2,.4,1); box-sizing:border-box; }
.rpk-sheet * { box-sizing:border-box; }
@keyframes rpk-pop { from { transform:translateY(12px) scale(0.98); opacity:0; } to { transform:none; opacity:1; } }

.rpk-sheet-header { display:flex; align-items:center; justify-content:space-between; flex:none; padding:12px 12px 8px 24px; }
.rpk-header-left, .rpk-header-right { display:flex; align-items:center; gap:8px; }
.rpk-header-left { margin-left:-6px; }
.rpk-sheet-title { display:flex; align-items:center; gap:8px; margin:0; font:inherit; font-size:22px; font-weight:700; line-height:1.2; color:var(--rpk-text); }
.rpk-header-balance { font-size:16px; margin-right:4px; }
.rpk-icon-btn { position:relative; display:flex; align-items:center; justify-content:center; width:40px; height:40px; padding:0; border:0; border-radius:8px; background:transparent; color:var(--rpk-text); cursor:pointer; }
.rpk-icon-btn:hover { background:var(--rpk-hover); }
.rpk-icon-btn:active { background:var(--rpk-press); }
.rpk-close-float { position:absolute; top:12px; right:12px; z-index:6; }

.rpk-gift-item { display:flex; align-items:center; gap:14px; padding:8px 24px 0; flex:none; }
.rpk-gift-item-thumb { width:64px; height:64px; flex:none; border-radius:8px; background:var(--rpk-shift); }
.rpk-gift-item-name { font-size:17px; font-weight:700; margin-bottom:6px; }
.rpk-gift-item-price { font-size:16px; font-weight:500; }

.rpk-change-gift { align-self:flex-start; margin:18px 24px 2px; padding:0; border:0; background:none; color:var(--rpk-text); font:inherit; font-size:12px; text-decoration:underline; text-underline-offset:2px; cursor:pointer; opacity:.85; }
.rpk-change-gift:hover { opacity:1; }
.rpk-ask { padding:0 24px; font-size:17px; font-weight:700; flex:none; }

.rpk-search-row { padding:14px 24px 16px; flex:none; }
.rpk-search { display:flex; align-items:center; gap:10px; height:40px; padding:0 14px; border:1px solid var(--rpk-stroke); border-radius:999px; cursor:text; transition:border-color .12s; }
.rpk-search:hover { border-color:var(--rpk-stroke-strong); }
.rpk-search:focus-within { border-color:var(--rpk-text); }
.rpk-search-input { flex:1; min-width:0; height:100%; padding:0; border:0; outline:none; background:none; color:var(--rpk-text); font:inherit; font-size:16px; appearance:none; }
.rpk-search-input::placeholder { color:var(--rpk-muted); }
.rpk-search-input::-webkit-search-cancel-button { display:none; }

.rpk-sheet-tall { height:min(560px,calc(100vh - 32px)); }
.rpk-sheet-body { flex:1 1 auto; min-height:0; overflow-y:auto; padding:0 24px 16px; scrollbar-width:none; }
.rpk-sheet-body::-webkit-scrollbar { display:none; }
.rpk-section { display:flex; flex-direction:column; }
.rpk-section-heading { position:sticky; top:0; z-index:1; margin:0; padding:4px 0 8px; background:var(--rpk-surface); color:var(--rpk-text); font:inherit; font-size:17px; font-weight:700; }
.rpk-loading-inline { font-size:13px; color:var(--rpk-muted); padding:2px 0 8px; }
.rpk-hint { padding:32px 0; text-align:center; color:var(--rpk-muted); font-size:14px; }
.rpk-list { display:flex; flex-direction:column; }

.rpk-user-row { display:flex; align-items:center; gap:12px; padding:6px 8px; margin:0 -8px; width:calc(100% + 16px); border-radius:8px; cursor:pointer; outline:none; }
.rpk-user-row:hover, .rpk-user-row:focus-visible { background:var(--rpk-shift); }
.rpk-user-row-static { cursor:default; margin:0; width:100%; padding:0; }
.rpk-user-row-static:hover { background:none; }
.rpk-avatar { width:48px; height:48px; flex:none; border-radius:50%; overflow:hidden; background:var(--rpk-shift); }
.rpk-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
.rpk-user-text { display:flex; flex-direction:column; min-width:0; }
.rpk-user-name { font-size:16px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rpk-user-handle { font-size:13px; color:var(--rpk-muted); font-weight:400; }

.rpk-spinner { width:26px; height:26px; margin:40px auto; border:3px solid var(--rpk-shift); border-top-color:var(--rpk-text); border-radius:50%; animation:rpk-spin .8s linear infinite; }
.rpk-spinner-lg { width:44px; height:44px; margin:0 auto 16px; border-width:4px; }
@keyframes rpk-spin { to { transform:rotate(360deg); } }
.rpk-loading { flex:1; min-height:300px; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.rpk-loading-text { color:var(--rpk-muted); font-size:15px; }

.rpk-confirm { display:flex; flex-direction:column; align-items:center; padding-top:8px; text-align:center; }
.rpk-confirm-img { width:180px; height:180px; flex:none; border-radius:12px; background:var(--rpk-shift); margin-bottom:14px; }
.rpk-confirm-name { font-size:20px; font-weight:700; margin-bottom:6px; }
.rpk-confirm-price { font-size:17px; }
.rpk-confirm-to { width:100%; margin-top:20px; padding:12px 14px; border:1px solid var(--rpk-stroke); border-radius:12px; text-align:left; }
.rpk-confirm-label { display:block; font-size:13px; color:var(--rpk-muted); margin-bottom:8px; }
.rpk-balance-after { display:flex; align-items:center; gap:6px; margin-top:14px; font-size:14px; color:var(--rpk-muted); }
.rpk-balance-after .rpk-robux { color:var(--rpk-text); }

.rpk-sheet-footer { flex:none; padding:12px 24px 24px; }
.rpk-btn { width:100%; height:48px; border:0; border-radius:8px; font:inherit; font-size:17px; font-weight:600; cursor:pointer; transition:background-color .12s; }
.rpk-btn-primary { background:var(--rpk-primary); color:#fff; }
.rpk-btn-primary:hover { background:var(--rpk-primary-hover); }

.rpk-sheet.rpk-success { align-items:center; padding:24px; text-align:center; }
.rpk-stage { position:relative; flex:none; height:240px; width:100%; display:flex; align-items:center; justify-content:center; }
.rpk-rays { position:absolute; width:360px; height:360px; opacity:0; background:repeating-conic-gradient(rgba(255,196,60,0.22) 0 10deg, transparent 10deg 20deg); border-radius:50%;
  -webkit-mask:radial-gradient(circle,#000 20%,transparent 68%); mask:radial-gradient(circle,#000 20%,transparent 68%); animation:rpk-rays-in .5s .9s forwards, rpk-spin 14s linear infinite; }
@keyframes rpk-rays-in { to { opacity:1; } }
.rpk-giftbox { position:absolute; width:110px; height:110px; animation:rpk-shake .9s ease-in-out, rpk-box-gone .25s .9s forwards; }
.rpk-box { position:absolute; bottom:0; left:5px; width:100px; height:72px; border-radius:6px; background:linear-gradient(90deg,transparent 42%,#ffffff 42% 58%,transparent 58%),#2a4fd8; }
.rpk-lid { position:absolute; top:14px; left:0; width:110px; height:26px; border-radius:6px; z-index:1; background:linear-gradient(90deg,transparent 42%,#ffffff 42% 58%,transparent 58%),#335fff; animation:rpk-lid-off .4s .75s forwards; }
.rpk-lid::before, .rpk-lid::after { content:""; position:absolute; top:-18px; width:28px; height:22px; border:6px solid #ffffff; border-radius:50% 50% 0 50%; box-shadow:0 0 0 1px rgba(0,0,0,0.08); }
.rpk-lid::before { left:26px; transform:rotate(-20deg); }
.rpk-lid::after { right:26px; transform:scaleX(-1) rotate(-20deg); }
@keyframes rpk-shake { 0%,100% { transform:rotate(0); } 15% { transform:rotate(-8deg); } 30% { transform:rotate(8deg); } 45% { transform:rotate(-6deg); } 60% { transform:rotate(6deg); } 75% { transform:rotate(-3deg) scale(1.05); } }
@keyframes rpk-lid-off { to { transform:translate(40px,-90px) rotate(40deg); opacity:0; } }
@keyframes rpk-box-gone { to { transform:scale(0.4); opacity:0; } }
.rpk-reveal { position:relative; z-index:2; display:flex; align-items:center; justify-content:center; width:220px; height:220px;
  opacity:0; transform:scale(0.2) translateY(40px); filter:drop-shadow(0 8px 20px rgba(0,0,0,0.35));
  animation:rpk-reveal .6s .95s cubic-bezier(.2,1.5,.4,1) forwards, rpk-float 3s 1.6s ease-in-out infinite; }
.rpk-reveal img { width:100%; height:100%; object-fit:contain; }
.rpk-reveal-duo { width:300px; gap:0; }
.rpk-reveal-duo img { width:60%; }
.rpk-reveal-duo img:first-child { margin-right:-20%; }
@keyframes rpk-reveal { to { opacity:1; transform:scale(1) translateY(0); } }
@keyframes rpk-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }

.rpk-success-title { font-size:26px; font-weight:800; opacity:0; animation:rpk-up .4s 1.2s forwards; }
.rpk-success-to { display:flex; align-items:center; gap:12px; width:100%; margin-top:14px; padding:12px; border:1px solid var(--rpk-stroke); border-radius:12px; text-align:left; opacity:0; animation:rpk-up .4s 1.35s forwards; }
.rpk-success-avatar { width:64px; height:64px; border-radius:8px; background:var(--rpk-shift); object-fit:cover; flex:none; }
.rpk-success-text { font-size:15px; line-height:1.4; }
.rpk-btn-done { margin-top:18px; flex:none; opacity:0; animation:rpk-up .4s 1.5s forwards; }
@keyframes rpk-up { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }

.rpk-confetti { position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:5; }
.rpk-confetti i { position:absolute; top:-12px; width:8px; height:13px; border-radius:2px; opacity:0; animation-name:rpk-confetti; animation-timing-function:cubic-bezier(.25,.5,.5,1); animation-fill-mode:forwards; }
@keyframes rpk-confetti { 0% { opacity:1; transform:translate(0,0) rotate(0); } 100% { opacity:0.9; transform:translate(var(--drift),640px) rotate(var(--spin)); } }

.rpk-thumb { position:relative; overflow:hidden; background:var(--rpk-shift); }
.rpk-thumb img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
.rpk-thumb-duo img { width:72%; height:100%; }
.rpk-thumb-duo img:first-child { left:-8%; right:auto; z-index:1; }
.rpk-thumb-duo img:last-child { left:auto; right:-8%; }
.rpk-confirm-img { display:block; }

.rpk-price-line { display:inline-flex; align-items:center; gap:8px; flex-wrap:wrap; }
.rpk-price-was { color:var(--rpk-muted); text-decoration:line-through; font-size:0.85em; font-weight:500; }

.rpk-change { display:flex; flex-direction:column; gap:12px; padding-top:4px; padding-bottom:24px; }
.rpk-change-heading { font-size:18px; font-weight:700; margin-top:4px; }
.rpk-deal-card { border-radius:12px; overflow:hidden; background:var(--rpk-shift); }
.rpk-deal-banner { position:relative; display:flex; align-items:center; gap:14px; min-height:112px; padding:12px 16px 12px 12px; overflow:hidden; background:#121215; color:#f7f7f8; }
.rpk-deal-banner-bg { position:absolute; inset:0; opacity:0.4; background-repeat:no-repeat; background-size:260px auto,260px auto; background-position:70% 40%,105% 40%; filter:blur(1px); }
.rpk-deal-banner-fade { position:absolute; inset:0; background:linear-gradient(to right,rgb(18,18,21) 30%,rgba(18,18,21,0)); }
.rpk-deal-banner-thumb { position:relative; z-index:1; width:88px; height:88px; flex:none; background:none; }
.rpk-deal-banner-text { position:relative; z-index:1; display:flex; flex-direction:column; gap:4px; }
.rpk-deal-banner-title { font-size:17px; font-weight:700; line-height:1.25; }
.rpk-deal-banner-sub { font-size:14px; color:#c7c8cb; }
.rpk-deal-row, .rpk-single-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.rpk-deal-row { padding:16px; }
.rpk-deal-left { display:flex; flex-direction:column; gap:8px; min-width:0; }
.rpk-deal-price { display:flex; align-items:center; flex-wrap:wrap; gap:10px; }
.rpk-deal-now { display:inline-flex; align-items:center; gap:6px; font-size:26px; font-weight:800; line-height:1; }
.rpk-icon-deal { width:26px; height:26px; }
.rpk-deal-was { position:relative; display:inline-flex; align-items:center; gap:4px; color:var(--rpk-muted); font-size:16px; font-weight:700; }
.rpk-deal-was .rpk-icon { color:var(--rpk-muted); }
.rpk-deal-was .rpk-fallback-robux { background:var(--rpk-muted)!important; }
.rpk-deal-card .rpk-fallback-robux::after, .rpk-single-list .rpk-fallback-robux::after { background:var(--rpk-shift); }
.rpk-deal-was::after { content:""; position:absolute; left:-2px; right:-2px; top:50%; height:2px; background:var(--rpk-muted); transform:rotate(-8deg); }
.rpk-pills { display:flex; gap:6px; flex-wrap:wrap; }
.rpk-pill { display:inline-flex; align-items:center; height:24px; padding:0 10px; border-radius:999px; background:var(--rpk-hover); color:var(--rpk-text); font-size:12px; font-weight:600; white-space:nowrap; }
.rpk-pill-save { background:rgba(63,198,121,0.16); color:#2fa865; }
.rpk-select-btn { flex:none; min-width:112px; height:40px; padding:0 16px; border:0; border-radius:8px; background:var(--rpk-hover); color:var(--rpk-text); font:inherit; font-size:15px; font-weight:600; cursor:pointer; transition:background-color .12s, filter .12s; }
.rpk-select-btn:hover { background:var(--rpk-press); }
.rpk-select-emphasis { background:var(--rpk-primary); color:#fff; }
.rpk-select-emphasis:hover { background:var(--rpk-primary-hover); }
.rpk-select-on { background:transparent; box-shadow:inset 0 0 0 1px var(--rpk-stroke-strong); cursor:default; }
.rpk-select-on:hover { background:transparent; }
.rpk-single-list { display:flex; flex-direction:column; border-radius:12px; background:var(--rpk-shift); }
.rpk-single-row { padding:12px 16px 12px 12px; }
.rpk-single-row + .rpk-single-row { border-top:1px solid var(--rpk-stroke); }
.rpk-single-thumb { width:56px; height:56px; flex:none; border-radius:8px; background:var(--rpk-surface); }
.rpk-single-meta { flex:1; min-width:0; }
.rpk-single-name { font-size:15px; font-weight:700; margin-bottom:4px; }
.rpk-single-price { font-size:15px; }

.rpkp-root { position:fixed; right:18px; bottom:76px; width:300px; z-index:2147482500; background:#17080b; color:#fff1f2;
  border:1px solid #7f1d2d; border-radius:16px; font:13px/1.35 "Segoe UI",system-ui,sans-serif; box-shadow:0 16px 48px rgba(0,0,0,.5); overflow:hidden; -webkit-font-smoothing:antialiased; }
.rpkp-root[hidden] { display:none; }
.rpkp-root { background:linear-gradient(155deg,#240a10 0%,#120609 100%); border-color:#8f1d32; box-shadow:0 18px 52px rgba(100,0,20,.42),0 0 0 1px rgba(229,38,63,.08); }
.rpkp-card { background:linear-gradient(145deg,#32101a,#21090f); }
.rpkp-group { background:#21090f; }
.rpkp-head { background:linear-gradient(90deg,rgba(229,38,63,.16),transparent 75%); }
.rpkp-root * { box-sizing:border-box; }
.rpkp-head { display:flex; align-items:center; gap:9px; padding:12px 14px; border-bottom:1px solid #7f1d2d; cursor:move; }
.rpkp-mark { width:18px; height:18px; flex:none; background:#e5263f; clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%); }
.rpkp-brand { flex:1; font-size:13px; font-weight:800; letter-spacing:.06em; }
.rpkp-brand span { color:#e5263f; }
.rpkp-saved { color:#3ddc84; font-size:10px; font-weight:700; opacity:0; transition:opacity .2s; }
.rpkp-saved.show { opacity:1; }
.rpkp-x { width:22px; height:22px; border:0; background:none; color:#fda4af; cursor:pointer; font-size:12px; border-radius:6px; line-height:1; }
.rpkp-x:hover { background:#35101a; color:#f4f4f5; }
.rpkp-body { padding:12px 14px 14px; display:flex; flex-direction:column; gap:10px; }
.rpkp-label { color:#fda4af; font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; }
.rpkp-card { padding:12px; border-radius:14px; background:#260b11; border:1px solid #5b1826; }
.rpkp-amount { display:flex; align-items:baseline; gap:9px; margin:8px 0 11px; }
.rpkp-hex { width:18px; height:18px; flex:none; align-self:center; position:relative; background:#fff1f2; clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%); }
.rpkp-hex::after { content:""; position:absolute; inset:5px; background:#260b11; clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%); }
.rpkp-big { font-size:24px; font-weight:800; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }

.rpkp-nav b { color:#f4f4f5; }
.rpkp-input-wrap { position:relative; }
#rpkp-amount { width:100%; height:38px; padding:0 58px 0 12px; border-radius:10px; border:1px solid #27272b; background:#17080b; color:#fff1f2; font:600 15px "Segoe UI",system-ui,sans-serif; outline:none; }
#rpkp-amount:focus { border-color:#e5263f; box-shadow:0 0 0 3px rgba(229,38,63,.28); }
.rpkp-set { position:absolute; right:5px; top:4px; height:30px; padding:0 14px; border:0; border-radius:7px; cursor:pointer; background:#e5263f; color:#fff; font:700 12px "Segoe UI",system-ui,sans-serif; letter-spacing:.05em; }
.rpkp-set:hover { filter:brightness(1.14); }
.rpkp-chip:hover { border-color:#9f2438; background:#48121f; }
.rpkp-chip.minus { color:#85858c; }
.rpkp-chip.minus:hover { border-color:#e5263f; color:#e5263f; background:#35101a; }
.rpkp-group { border-radius:14px; background:#260b11; border:1px solid #5b1826; overflow:hidden; }
.rpkp-row { display:flex; align-items:center; gap:12px; padding:9px 14px; min-height:40px; cursor:pointer; }
.rpkp-row + .rpkp-row { border-top:1px solid #5b1826; }
label.rpkp-row:hover { background:#35101a; }
.rpkp-t { flex:1; min-width:0; }
.rpkp-t b { display:block; font-size:12.5px; font-weight:600; }
.rpkp-t small { color:#fda4af; font-size:10.5px; }
.rpkp-switch { position:relative; width:36px; height:21px; flex:none; }
.rpkp-switch input { position:absolute; opacity:0; inset:0; margin:0; cursor:pointer; }
.rpkp-track { position:absolute; inset:0; border-radius:999px; background:#4a1724; transition:background .18s; }
.rpkp-track::after { content:""; position:absolute; top:3px; left:3px; width:15px; height:15px; border-radius:50%; background:#fecdd3; transition:transform .18s cubic-bezier(.3,1.4,.5,1), background .18s; }
.rpkp-switch input:checked + .rpkp-track { background:#e5263f; }
.rpkp-switch input:checked + .rpkp-track::after { transform:translateX(15px); background:#fff; }
.rpkp-disc { display:flex; align-items:center; gap:5px; flex:none; padding:0 9px; height:30px; border-radius:8px; border:1px solid #27272b; background:#0a0a0b; transition:border-color .15s, box-shadow .15s, opacity .15s; }
.rpkp-disc span { color:#fda4af; font-size:12px; }
.rpkp-disc.off { opacity:.35; }
.rpkp-disc:focus-within { border-color:#e5263f; box-shadow:0 0 0 3px rgba(229,38,63,.28); }
#rpkp-discountAmount { width:52px; border:0; background:transparent; color:#f4f4f5; outline:none; text-align:right; font:700 13px "Segoe UI",system-ui,sans-serif; font-variant-numeric:tabular-nums; }
.rpkp-reset { width:100%; height:34px; border-radius:10px; cursor:pointer; border:1px solid #27272b; background:#260b11; color:#85858c; font:600 12px "Segoe UI",system-ui,sans-serif; }
.rpkp-reset:hover { border-color:#e5263f; color:#e5263f; }
.rpkp-reset.done { border-color:#3ddc84; color:#3ddc84; }
.rpkp-foot { text-align:center; color:#5e5f63; font-size:10px; letter-spacing:.06em; }
`);

  const safeJSON = (t) => { try { return JSON.parse(t); } catch { return null; } };
  const api = (url, method, body) =>
    new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: method || "GET",
        url,
        headers: body
          ? { Accept: "application/json", "Content-Type": "application/json" }
          : { Accept: "application/json" },
        data: body ? JSON.stringify(body) : undefined,
        responseType: "json",
        onload: (r) =>
          resolve({ ok: r.status >= 200 && r.status < 300, status: r.status, data: r.response ?? safeJSON(r.responseText) }),
        onerror: () => resolve({ ok: false }),
        ontimeout: () => resolve({ ok: false }),
      });
    });

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const sheetHeight = (sheet) => (sheet.childElementCount ? sheet.getBoundingClientRect().height : 0);

  let sheetAnim = 0;
  function animateSheetTo(sheet, oldH) {
    const release = () => {
      sheet.style.transition = "";
      sheet.style.height = "";
    };
    if (!oldH || prefersReducedMotion()) return release();

    sheet.style.transition = "none";
    sheet.style.height = "";
    const target = sheet.getBoundingClientRect().height;
    if (Math.abs(target - oldH) < 2) return release();

    sheet.style.height = oldH + "px";
    sheet.getBoundingClientRect();
    sheet.style.transition = "height 0.26s cubic-bezier(.2, .8, .2, 1)";
    sheet.style.height = target + "px";

    const token = ++sheetAnim;
    const finish = () => {
      if (token !== sheetAnim) return;
      sheet.removeEventListener("transitionend", onEnd);
      release();
    };
    const onEnd = (e) => e.propertyName === "height" && finish();
    sheet.addEventListener("transitionend", onEnd);
    setTimeout(finish, 320);
  }
  const fmt = (n) => n.toLocaleString("en-US");

  function formatShort(n) {
    for (const [v, s] of [[1e9, "B"], [1e6, "M"], [1e3, "K"]]) {
      if (n >= v) {
        const x = n / v;
        return (x < 10 ? Math.floor(x * 10) / 10 : Math.floor(x)) + s + "+";
      }
    }
    return String(n);
  }

  const clamp = (n) => Math.min(MAX, Math.max(0, Math.floor(Number(n) || 0)));
  function parseAmount(str) {
    const m = String(str).trim().toLowerCase().replace(/[,\s]/g, "").match(/^(\d*\.?\d+)([kmb])?$/);
    if (!m) return null;
    const mult = { k: 1e3, m: 1e6, b: 1e9 }[m[2]] || 1;
    return clamp(parseFloat(m[1]) * mult);
  }

  function icon(name, sizeClass, fallback) {
    const i = el("span", `icon icon-regular-${name} rpk-icon ${sizeClass || ""}`);
    i.setAttribute("aria-hidden", "true");
    requestAnimationFrame(() => {
      const cs = getComputedStyle(i);
      const painted = [cs.maskImage, cs.webkitMaskImage, cs.backgroundImage].some((v) => v && v !== "none");
      if (!painted) {
        i.classList.add("rpk-icon-fallback", `rpk-fallback-${name}`);
        if (fallback) i.textContent = fallback;
      }
    });
    return i;
  }

  function robuxAmount(n, cls) {
    const wrap = el("span", "rpk-robux " + (cls || ""));
    wrap.appendChild(icon("robux", "rpk-icon-sm", ""));
    wrap.appendChild(el("span", null, fmt(n)));
    return wrap;
  }

  function setFake(node, want) {
    if (!node) return;
    if (node.textContent !== want) {
      if (node.textContent !== node.dataset.rpkFake) node.dataset.rpkReal = node.textContent;
      node.textContent = want;
    }
    node.dataset.rpkFake = want;
    node.dataset.rpk = "1";
  }

  function restoreReal(node) {
    if (!node || node.dataset.rpkReal == null) return;
    if (node.textContent === node.dataset.rpkFake) node.textContent = node.dataset.rpkReal;
    delete node.dataset.rpkReal;
    delete node.dataset.rpkFake;
    delete node.dataset.rpk;
  }

  function applyRobux() {
    const on = settings.fakeEnabled;
    document.documentElement.classList.toggle("rpk-fake", on);
    const shortEl = document.getElementById("nav-robux-amount");
    const balEl = document.getElementById("nav-robux-balance");

    if (!on) {
      restoreReal(shortEl);
      restoreReal(balEl);
      return;
    }
    const n = settings.fakeRobux;
    setFake(shortEl, formatShort(n));
    setFake(balEl, `${fmt(n)} Robux`);
  }

  function currentBalance() {
    if (settings.fakeEnabled) return settings.fakeRobux;
    const t = document.getElementById("nav-robux-balance")?.textContent || "";
    const v = parseInt(t.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(v) ? v : null;
  }

  function getItemInfo() {
    const m = location.pathname.match(/\/(bundles|catalog)\/(\d+)/);
    if (!m) return null;
    const container = document.getElementById("item-details-container") || document.body;

    const h1 = container.querySelector("h1");
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    const name = (h1?.textContent || ogTitle || document.title).trim();

    let price = 0;
    for (const p of container.querySelectorAll('[class*="text-robux"]')) {
      const v = parseInt(p.textContent.replace(/[^\d]/g, ""), 10);
      if (v > 0) { price = v; break; }
    }

    const ogImage = document.querySelector('meta[property="og:image"]')?.content;
    return { kind: m[1], id: m[2], name, price, ogImage };
  }

  const imageCache = new Map();
  function getItemImage(item) {
    const key = item.kind + item.id;
    if (!imageCache.has(key)) {
      const url =
        item.kind === "bundles"
          ? `https://thumbnails.roblox.com/v1/bundles/thumbnails?bundleIds=${item.id}&size=420x420&format=Png`
          : `https://thumbnails.roblox.com/v1/assets?assetIds=${item.id}&size=420x420&format=Png`;
      imageCache.set(key, api(url).then((r) => r.data?.data?.[0]?.imageUrl || item.ogImage || ""));
    }
    return imageCache.get(key);
  }

  const HEADLESS = { kind: "bundles", id: "201", name: "Headless Horseman", price: 31000 };
  const KORBLOX = { kind: "bundles", id: "192", name: "Korblox Deathspeaker", price: 17000 };

  function giftOptions(page) {
    const isPage = (b) => page.kind === b.kind && page.id === b.id;
    const withPagePrice = (b) => ({ ...b, price: isPage(b) && page.price ? page.price : b.price });
    const h = withPagePrice(HEADLESS);
    const k = withPagePrice(KORBLOX);

    const single = isPage(HEADLESS)
      ? { key: "single", name: h.name, price: h.price, parts: [h] }
      : isPage(KORBLOX)
      ? { key: "single", name: k.name, price: k.price, parts: [k] }
      : { key: "single", name: page.name, price: page.price, parts: [page] };

    const full = h.price + k.price;
    const discount = settings.comboDiscountEnabled ? Math.min(Math.max(0, settings.comboDiscount | 0), full) : 0;
    const combo = {
      key: "combo",
      name: `${h.name} + ${k.name}`,
      price: full - discount,
      was: discount > 0 ? full : null,
      parts: [h, k],
    };
    return [single, combo];
  }

  const giftImages = (gift) => Promise.all(gift.parts.map(getItemImage));

  function giftThumb(gift, cls) {
    const wrap = el("div", `rpk-thumb ${cls}` + (gift.parts.length > 1 ? " rpk-thumb-duo" : ""));
    giftImages(gift).then((srcs) =>
      srcs.forEach((src) => {
        const img = el("img");
        if (src) img.src = src;
        wrap.appendChild(img);
      })
    );
    return wrap;
  }

  async function addHeadshots(users) {
    for (let i = 0; i < users.length; i += 100) {
      const chunk = users.slice(i, i + 100);
      const t = await api(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${chunk.map((u) => u.id).join(",")}&size=150x150&format=Png&isCircular=false`
      );
      const map = new Map((t.data?.data || []).map((x) => [x.targetId, x.imageUrl]));
      chunk.forEach((u) => (u.avatar = map.get(u.id) || ""));
    }
    return users;
  }

  let friendsCache = null;
  async function getFriends() {
    if (friendsCache) return friendsCache;
    const me = document.querySelector('meta[name="user-data"]')?.dataset.userid;
    if (!me) return (friendsCache = []);

    const r = await api(`https://friends.roblox.com/v1/users/${me}/friends`);
    const ids = (r.data?.data || []).map((f) => f.id).filter(Boolean);
    if (!ids.length) return (friendsCache = []);

    const users = [];
    for (let i = 0; i < ids.length; i += 100) {
      const u = await api("https://users.roblox.com/v1/users", "POST", { userIds: ids.slice(i, i + 100), excludeBannedUsers: true });
      for (const x of u.data?.data || []) users.push({ id: x.id, name: x.name, displayName: x.displayName });
    }
    users.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return (friendsCache = await addHeadshots(users));
  }

  async function searchUsers(q) {
    const results = new Map();
    const [exact, search] = await Promise.all([
      api("https://users.roblox.com/v1/usernames/users", "POST", { usernames: [q], excludeBannedUsers: true }),
      q.length >= 3
        ? api(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(q)}&limit=10`)
        : Promise.resolve({ ok: true, data: { data: [] } }),
    ]);
    for (const u of [...(exact.data?.data || []), ...(search.data?.data || [])]) {
      if (!results.has(u.id)) results.set(u.id, { id: u.id, name: u.name, displayName: u.displayName });
    }
    const users = await addHeadshots([...results.values()].slice(0, 10));
    const rateLimited = !users.length && (search.status === 429 || exact.status === 429);
    return { users, rateLimited };
  }

  async function getFullAvatar(userId) {
    const r = await api(
      `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`
    );
    return r.data?.data?.[0]?.imageUrl || "";
  }

  function parseRGB(c) {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return a === 0 ? null : [r, g, b];
  }

  function isLightTheme() {
    for (const node of [document.getElementById("container-main"), document.body, document.documentElement]) {
      if (!node) continue;
      const rgb = parseRGB(getComputedStyle(node).backgroundColor);
      if (rgb) return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 > 0.5;
    }
    return !document.body?.classList.contains("dark-theme");
  }

  let overlay = null;

  function onEsc(e) {
    if (e.key === "Escape") closeModal();
  }

  function closeModal() {
    if (!overlay) return;
    document.removeEventListener("keydown", onEsc);
    overlay.classList.add("rpk-out");
    const o = overlay;
    overlay = null;
    setTimeout(() => o.remove(), 200);
  }

  function openGiftModal() {
    const item = getItemInfo();
    if (!item || overlay) return;

    overlay = el("div", "rpk-overlay" + (isLightTheme() ? " rpk-light" : ""));
    const sheet = el("div", "rpk-sheet");
    sheet.setAttribute("role", "dialog");
    overlay.appendChild(sheet);
    overlay.addEventListener("mousedown", (e) => e.target === overlay && closeModal());
    document.addEventListener("keydown", onEsc);
    document.body.appendChild(overlay);

    const options = giftOptions(item);
    const ctx = { sheet, options, gift: options[0], query: "" };
    showPickStep(ctx);
  }

  function sheetHeader(ctx, title, onBack) {
    const h = el("div", "rpk-sheet-header");
    const left = el("div", "rpk-header-left");
    if (onBack) {
      const back = el("button", "rpk-icon-btn");
      back.setAttribute("aria-label", "Back");
      back.appendChild(icon("chevron-large-left", "rpk-icon-md", "‹"));
      back.addEventListener("click", onBack);
      left.appendChild(back);
    }
    const t = el("h2", "rpk-sheet-title");
    if (!onBack) t.appendChild(icon("roblox-plus", "rpk-icon-lg", ""));
    t.append(title);
    left.appendChild(t);
    h.appendChild(left);

    const right = el("div", "rpk-header-right");
    const bal = currentBalance();
    if (bal != null) right.appendChild(robuxAmount(bal, "rpk-header-balance"));
    const x = el("button", "rpk-icon-btn");
    x.setAttribute("aria-label", "Close");
    x.appendChild(icon("x", "rpk-icon-md", "✕"));
    x.addEventListener("click", closeModal);
    right.appendChild(x);
    h.appendChild(right);
    return h;
  }

  function userRow(u, onClick) {
    const row = el("div", "rpk-user-row");
    row.setAttribute("role", "option");
    row.tabIndex = 0;
    const av = el("span", "rpk-avatar");
    const img = el("img");
    img.alt = u.name;
    if (u.avatar) img.src = u.avatar;
    av.appendChild(img);
    row.appendChild(av);

    const names = el("div", "rpk-user-text");
    names.appendChild(el("span", "rpk-user-name", u.displayName));
    if (u.displayName !== u.name) names.appendChild(el("span", "rpk-user-handle", "@" + u.name));
    row.appendChild(names);

    row.addEventListener("click", onClick);
    row.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick()));
    return row;
  }

  function section(title, users, ctx) {
    const s = el("div", "rpk-section");
    s.appendChild(el("h2", "rpk-section-heading", title));
    const list = el("div", "rpk-list");
    list.setAttribute("role", "listbox");
    for (const u of users) list.appendChild(userRow(u, () => showConfirmStep(ctx, u)));
    s.appendChild(list);
    return s;
  }

  function showPickStep(ctx) {
    const { sheet, gift } = ctx;
    const oldH = sheetHeight(sheet);
    sheet.replaceChildren();
    sheet.classList.remove("rpk-success");
    sheet.classList.add("rpk-sheet-tall");
    sheet.appendChild(sheetHeader(ctx, "Send gift"));

    const itemRow = el("div", "rpk-gift-item");
    itemRow.appendChild(giftThumb(gift, "rpk-gift-item-thumb"));
    const meta = el("div", "rpk-gift-item-meta");
    meta.appendChild(el("div", "rpk-gift-item-name", gift.name));
    if (gift.price) meta.appendChild(priceLine(gift, "rpk-gift-item-price"));
    itemRow.appendChild(meta);
    sheet.appendChild(itemRow);

    const change = el("button", "rpk-change-gift", "Change gift");
    change.addEventListener("click", () => showChangeStep(ctx));
    sheet.appendChild(change);
    sheet.appendChild(el("div", "rpk-ask", "Who would you like to gift this to?"));

    const searchRow = el("div", "rpk-search-row");
    const box = el("label", "rpk-search");
    box.appendChild(icon("magnifying-glass", "rpk-icon-md", "⌕"));
    const input = el("input", "rpk-search-input");
    input.type = "search";
    input.placeholder = "Search";
    input.maxLength = 30;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.value = ctx.query;
    box.appendChild(input);
    searchRow.appendChild(box);
    sheet.appendChild(searchRow);

    const body = el("div", "rpk-sheet-body");
    sheet.appendChild(body);
    animateSheetTo(sheet, oldH);
    setTimeout(() => input.focus(), 50);

    let timer = 0;
    let seq = 0;
    const render = async () => {
      const q = input.value.trim();
      ctx.query = q;
      const mySeq = ++seq;
      body.replaceChildren(section(q ? "Results" : "My friends", [], ctx));
      body.firstChild.appendChild(el("div", "rpk-loading-inline", "Loading..."));

      const friends = await getFriends();
      if (mySeq !== seq || !overlay) return;

      if (!q) {
        body.replaceChildren();
        if (friends.length) body.appendChild(section(`My friends (${friends.length})`, friends, ctx));
        else body.appendChild(el("div", "rpk-hint", "Search for anyone on Roblox by username"));
        return;
      }

      const lq = q.toLowerCase();
      const matchFriends = friends.filter(
        (f) => f.name.toLowerCase().includes(lq) || f.displayName.toLowerCase().includes(lq)
      );
      const { users, rateLimited } = await searchUsers(q);
      if (mySeq !== seq || !overlay) return;

      const seen = new Set();
      const exactMatch = users.filter((u) => u.name.toLowerCase() === lq);
      const results = [...exactMatch, ...matchFriends, ...users].filter((u) => !seen.has(u.id) && seen.add(u.id));

      const s = section("Results", results, ctx);
      if (!results.length) {
        s.appendChild(el("div", "rpk-loading-inline", rateLimited ? "Searching too fast — wait a sec and try again" : "No users found"));
      }
      body.replaceChildren(s);
    };

    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(render, 350);
    });
    render();
  }

  function priceLine(gift, cls) {
    const line = el("div", "rpk-price-line " + (cls || ""));
    line.appendChild(robuxAmount(gift.price));
    if (gift.was) line.appendChild(el("span", "rpk-price-was", fmt(gift.was)));
    return line;
  }

  function dealPrice(opt) {
    const wrap = el("div", "rpk-deal-price");
    const now = el("span", "rpk-deal-now");
    now.appendChild(icon("robux", "rpk-icon-deal", ""));
    now.appendChild(el("span", null, fmt(opt.price)));
    wrap.appendChild(now);
    if (opt.was) {
      const was = el("span", "rpk-deal-was");
      was.appendChild(icon("robux", "rpk-icon-sm", ""));
      was.appendChild(el("span", null, fmt(opt.was)));
      wrap.appendChild(was);
    }
    return wrap;
  }

  function pill(text, cls) {
    return el("span", "rpk-pill " + (cls || ""), text);
  }

  function selectButton(ctx, opt, emphasis) {
    const selected = opt.key === ctx.gift.key;
    const b = el("button", "rpk-select-btn" + (selected ? " rpk-select-on" : emphasis ? " rpk-select-emphasis" : ""));
    b.type = "button";
    b.textContent = selected ? "Selected" : "Select";
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      ctx.gift = opt;
      showPickStep(ctx);
    });
    return b;
  }

  function showChangeStep(ctx) {
    const { sheet } = ctx;
    const oldH = sheetHeight(sheet);
    sheet.replaceChildren();
    sheet.classList.remove("rpk-sheet-tall");
    sheet.appendChild(sheetHeader(ctx, "Change gift", () => showPickStep(ctx)));
    const body = el("div", "rpk-sheet-body rpk-change");

    const combo = ctx.options.find((o) => o.parts.length > 1);
    const singles = ctx.options.filter((o) => o !== combo);

    if (combo) {
      body.appendChild(el("div", "rpk-change-heading", "Bundle deal picked for you"));
      const card = el("div", "rpk-deal-card");

      const banner = el("div", "rpk-deal-banner");
      const bg = el("div", "rpk-deal-banner-bg");
      giftImages(combo).then((srcs) => {
        bg.style.backgroundImage = srcs.filter(Boolean).map((u) => `url("${u}")`).join(", ");
      });
      banner.appendChild(bg);
      banner.appendChild(el("div", "rpk-deal-banner-fade"));
      banner.appendChild(giftThumb(combo, "rpk-deal-banner-thumb"));
      const text = el("div", "rpk-deal-banner-text");
      text.appendChild(el("div", "rpk-deal-banner-title", combo.name));
      text.appendChild(el("div", "rpk-deal-banner-sub", "Both bundles in one gift"));
      banner.appendChild(text);
      card.appendChild(banner);

      const row = el("div", "rpk-deal-row");
      const left = el("div", "rpk-deal-left");
      left.appendChild(dealPrice(combo));
      const pills = el("div", "rpk-pills");
      if (combo.was) pills.appendChild(pill(`Save ${fmt(combo.was - combo.price)}`, "rpk-pill-save"));
      pills.appendChild(pill("Best value"));
      left.appendChild(pills);
      row.appendChild(left);
      row.appendChild(selectButton(ctx, combo, true));
      card.appendChild(row);
      body.appendChild(card);
    }

    if (singles.length) {
      body.appendChild(el("div", "rpk-change-heading", combo ? "Or just one item" : "Choose what to gift"));
      const list = el("div", "rpk-single-list");
      for (const opt of singles) {
        const row = el("div", "rpk-single-row");
        row.appendChild(giftThumb(opt, "rpk-single-thumb"));
        const meta = el("div", "rpk-single-meta");
        meta.appendChild(el("div", "rpk-single-name", opt.name));
        if (opt.price) meta.appendChild(robuxAmount(opt.price, "rpk-single-price"));
        row.appendChild(meta);
        row.appendChild(selectButton(ctx, opt, false));
        list.appendChild(row);
      }
      body.appendChild(list);
    }

    sheet.appendChild(body);
    animateSheetTo(sheet, oldH);
  }

  function showConfirmStep(ctx, user) {
    const { sheet, gift: item } = ctx;
    const oldH = sheetHeight(sheet);
    sheet.replaceChildren();
    sheet.classList.remove("rpk-sheet-tall");
    sheet.appendChild(sheetHeader(ctx, "Confirm Gift", () => showPickStep(ctx)));

    const body = el("div", "rpk-sheet-body rpk-confirm");
    body.appendChild(giftThumb(item, "rpk-confirm-img"));
    body.appendChild(el("div", "rpk-confirm-name", item.name));
    if (item.price) body.appendChild(priceLine(item, "rpk-confirm-price"));

    const to = el("div", "rpk-confirm-to");
    to.appendChild(el("span", "rpk-confirm-label", "Gift to"));
    const r = userRow(user, () => {});
    r.classList.add("rpk-user-row-static");
    to.appendChild(r);
    body.appendChild(to);

    const bal = currentBalance();
    if (bal != null && item.price) {
      const after = settings.deductOnGift || !settings.fakeEnabled ? bal - item.price : bal;
      const line = el("div", "rpk-balance-after");
      line.append("Balance after gift: ");
      line.appendChild(robuxAmount(Math.max(0, after)));
      body.appendChild(line);
    }
    sheet.appendChild(body);

    const footer = el("div", "rpk-sheet-footer");
    const send = el("button", "rpk-btn rpk-btn-primary", "Send Gift");
    send.addEventListener("click", () => doGift(ctx, user));
    footer.appendChild(send);
    sheet.appendChild(footer);
    animateSheetTo(sheet, oldH);
  }

  async function doGift(ctx, user) {
    const { sheet, gift: item } = ctx;
    const oldH = sheetHeight(sheet);
    sheet.replaceChildren();
    sheet.classList.remove("rpk-sheet-tall");
    const loading = el("div", "rpk-loading");
    loading.appendChild(el("div", "rpk-spinner rpk-spinner-lg"));
    loading.appendChild(el("div", "rpk-loading-text", "Sending gift…"));
    sheet.appendChild(loading);
    animateSheetTo(sheet, oldH);

    const [itemImgs, avatarImg] = await Promise.all([giftImages(item), getFullAvatar(user.id), sleep(1600)]);
    if (!overlay) return;

    if (settings.fakeEnabled && settings.deductOnGift && item.price) {
      setVals({ fakeRobux: Math.max(0, settings.fakeRobux - item.price) });
    }
    showSuccess(ctx, itemImgs, user, avatarImg);
  }

  function showSuccess(ctx, itemImgs, user, avatarImg) {
    const { sheet, gift: item } = ctx;
    const oldH = sheetHeight(sheet);
    sheet.replaceChildren();
    sheet.classList.add("rpk-success");

    const x = el("button", "rpk-icon-btn rpk-close-float");
    x.setAttribute("aria-label", "Close");
    x.appendChild(icon("x", "rpk-icon-md", "✕"));
    x.addEventListener("click", closeModal);
    sheet.appendChild(x);

    const stage = el("div", "rpk-stage");
    stage.appendChild(el("div", "rpk-rays"));
    const gift = el("div", "rpk-giftbox");
    gift.appendChild(el("div", "rpk-lid"));
    gift.appendChild(el("div", "rpk-box"));
    stage.appendChild(gift);
    const reveal = el("div", "rpk-reveal" + (itemImgs.length > 1 ? " rpk-reveal-duo" : ""));
    for (const src of itemImgs) {
      const img = el("img");
      if (src) img.src = src;
      reveal.appendChild(img);
    }
    stage.appendChild(reveal);
    sheet.appendChild(stage);

    sheet.appendChild(el("div", "rpk-success-title", "Gift Sent!"));

    const to = el("div", "rpk-success-to");
    const av = el("img", "rpk-success-avatar");
    if (avatarImg) av.src = avatarImg;
    to.appendChild(av);
    const txt = el("div", "rpk-success-text");
    txt.append("You gifted ");
    txt.appendChild(el("b", null, item.name));
    txt.append(" to ");
    txt.appendChild(el("b", null, user.displayName));
    txt.appendChild(el("div", "rpk-user-handle", "@" + user.name));
    to.appendChild(txt);
    sheet.appendChild(to);

    const done = el("button", "rpk-btn rpk-btn-primary rpk-btn-done", "Done");
    done.addEventListener("click", closeModal);
    sheet.appendChild(done);

    animateSheetTo(sheet, oldH);
    confetti(sheet);
  }

  function confetti(host) {
    const colors = ["#335fff", "#3fc679", "#ffb02e", "#ff4d6d", "#b36bff", "#ffffff"];
    const layer = el("div", "rpk-confetti");
    for (let i = 0; i < 90; i++) {
      const c = el("i");
      c.style.left = Math.random() * 100 + "%";
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = 0.9 + Math.random() * 0.6 + "s";
      c.style.animationDuration = 1.8 + Math.random() * 1.4 + "s";
      c.style.setProperty("--drift", (Math.random() * 160 - 80).toFixed(0) + "px");
      c.style.setProperty("--spin", (Math.random() * 1080 - 540).toFixed(0) + "deg");
      layer.appendChild(c);
    }
    host.appendChild(layer);
    setTimeout(() => layer.remove(), 5000);
  }

  const h = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  function purchaseRow() {
    return document.querySelector("#item-details-container .item-purchase-btns-container");
  }

  const BUY_HTML = `
<div class="rpk-buy-root foundation-web-dialog-overlay padding-medium foundation-web-portal-zindex bg-common-backdrop" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:2147483600;pointer-events:auto;">
 <div role="dialog" class="relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high relative unified-purchase-dialog-content" data-size="Large" tabindex="-1" style="pointer-events:auto;">
  <div class="absolute foundation-web-dialog-close-container">
   <button type="button" aria-label="Close" class="rpk-x foundation-web-close-affordance flex stroke-none bg-none cursor-pointer relative clip group/interactable focus-visible:outline-focus disabled:outline-none bg-over-media-100 padding-medium radius-circle">
    <div aria-hidden="true" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
    <span aria-hidden="true" class="icon icon-regular-x size-[var(--icon-size-large)]"></span>
   </button>
  </div>
  <div class="padding-x-xlarge padding-top-xlarge padding-bottom-xlarge gap-xlarge flex flex-col">
   <div style="margin-top:2px;">
    <div id="rbx-unified-purchase-heading" class="flex flex-row items-center justify-between" style="padding-right:42px;">
     <span class="text-heading-medium">Buy Item</span>
     <div class="flex flex-row items-center"><span class="icon-robux-16x16"></span><span class="rpk-bal text-robux ml-1 text-body-medium"></span></div>
    </div>
   </div>
   <div class="flex flex-row items-center gap-large">
    <div class="relative shrink-0 unified-modal-thumbnail-container" style="max-width:40vw;max-height:40vw;">
     <div class="rounded" style="width:100%;height:100%;background-color:rgba(255,255,255,0.06);"></div>
     <div class="absolute unified-modal-thumbnail" style="inset:0px;display:flex;align-items:center;justify-content:center;">
      <div class="marketplace-item-purchase-thumbnail-outer-container"><div class="marketplace-item-purchase-thumbnail-container"><span class="thumbnail-2d-container"><img class="rpk-thumb" alt="" style="width:150px;height:150px;object-fit:contain;border-radius:8px;"></span></div></div>
     </div>
    </div>
    <div class="min-w-0 flex flex-col gap-small">
     <span class="text-body-large break-words"><span class="rpk-name font-bold"></span></span>
     <div class="flex flex-row items-center"><span class="icon-robux-16x16"></span><span class="rpk-price text-robux"></span></div>
    </div>
   </div>
  </div>
  <div class="padding-x-xlarge padding-bottom-xlarge flex flex-col mt-[40px]">
   <div class="gap-small flex flex-col">
    <div class="flex flex-row-reverse">
     <button type="button" data-testid="purchase-confirm-button" class="rpk-confirm foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-large height-1200 padding-x-medium bg-action-emphasis content-action-emphasis fill basis-0" style="text-decoration:none;">
      <div aria-hidden="true" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
      <span class="flex items-center min-width-0 gap-small"><span class="padding-y-xsmall text-truncate-end text-no-wrap">Buy</span></span>
     </button>
    </div>
   </div>
   <button type="button" class="gap-y-medium flex flex-row justify-between padding-medium bg-shift-100 stroke-default stroke-thick radius-medium cursor-pointer text-body-medium margin-top-[12px]">
    <div class="gap-x-small flex items-center"><span aria-hidden="true" class="icon icon-regular-roblox-plus size-[var(--icon-size-small)]"></span><span>Get 10% off with Roblox Plus</span></div>
    <div class="foundation-web-badge flex items-center select-none gap-[var(--size-150)] radius-circle height-600 width-[fit-content] padding-x-small bg-system-contrast content-inverse-emphasis stroke-none"><span class="text-no-wrap text-truncate-split text-label-small padding-y-xsmall padding-x-xxsmall content-inverse-emphasis">New</span></div>
   </button>
  </div>
 </div>
</div>`;

  const COMPLETE_HTML = `
<div class="rpk-buy-root foundation-web-dialog-overlay padding-medium foundation-web-portal-zindex bg-common-backdrop" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:2147483600;pointer-events:auto;">
 <div role="dialog" aria-describedby="unified-purchase-completion-modal-body" class="relative radius-large bg-surface-100 stroke-muted stroke-standard foundation-web-dialog-content shadow-transient-high relative width-full" data-size="Medium" tabindex="-1" style="pointer-events:auto;max-width:420px;">
  <div class="absolute foundation-web-dialog-close-container">
   <button type="button" aria-label="Close" class="rpk-x foundation-web-close-affordance flex stroke-none bg-none cursor-pointer relative clip group/interactable focus-visible:outline-focus disabled:outline-none bg-over-media-100 padding-small radius-circle">
    <div aria-hidden="true" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
    <span aria-hidden="true" class="icon icon-regular-x size-[var(--icon-size-medium)]"></span>
   </button>
  </div>
  <div class="padding-x-xlarge padding-top-xlarge padding-bottom-xlarge gap-xlarge flex flex-col">
   <div style="margin-top:-4px;">
    <div id="rbx-unified-purchase-heading" class="flex flex-row items-center justify-between" style="padding-right:42px;">
     <span class="text-heading-medium">Purchase Complete</span>
     <div class="flex flex-row items-center"><span class="icon-robux-16x16"></span><span class="rpk-bal text-robux ml-1 text-body-medium"></span></div>
    </div>
   </div>
   <div class="flex justify-center gap-bottom-large"><span aria-hidden="true" class="icon icon-regular-circle-check size-[var(--icon-size-xlarge)]" style="font-size:48px;width:48px;height:48px;line-height:1;"></span></div>
   <div id="unified-purchase-completion-modal-body" class="text-center text-body-large">You have successfully bought <b class="rpk-name"></b></div>
  </div>
  <div class="padding-x-xlarge padding-bottom-xlarge gap-small flex flex-col mt-[40px]">
   <div class="flex flex-row-reverse">
    <button type="button" class="rpk-ok foundation-web-button relative clip group/interactable focus-visible:outline-focus disabled:outline-none cursor-pointer relative flex items-center justify-center stroke-none padding-y-none select-none radius-medium text-label-large height-1200 padding-x-medium bg-action-emphasis content-action-emphasis fill basis-0" style="text-decoration:none;">
     <div aria-hidden="true" class="absolute inset-[0] transition-colors group-hover/interactable:bg-[var(--color-state-hover)] group-active/interactable:bg-[var(--color-state-press)] group-disabled/interactable:bg-none"></div>
     <span class="flex items-center min-width-0 gap-small"><span class="padding-y-xsmall text-truncate-end text-no-wrap">OK</span></span>
    </button>
   </div>
  </div>
 </div>
</div>`;

  let buyOverlay = null;
  let purchased = false;
  let pendingOwned = null;

  function buyEsc(e) {
    if (e.key === "Escape") closeBuy();
  }

  function closeBuy() {
    if (!buyOverlay) return;
    document.removeEventListener("keydown", buyEsc);
    buyOverlay.remove();
    buyOverlay = null;
    if (purchased && pendingOwned) {
      const key = pendingOwned.kind + pendingOwned.id;
      const owned = { ...(settings.fakeOwned || {}), [key]: true };
      purchased = false;
      pendingOwned = null;
      reloading = true;
      GM_setValue("fakeOwned", owned);
      settings.fakeOwned = owned;
      location.reload();
    }
  }

  function mountOverlay(node, item) {
    buyOverlay = node;
    const bal = currentBalance();
    node.querySelector(".rpk-bal").textContent = bal != null ? fmt(bal) : "";
    node.querySelectorAll(".rpk-name").forEach((n) => (n.textContent = item.name));
    const priceEl = node.querySelector(".rpk-price");
    if (priceEl) priceEl.textContent = item.price ? fmt(item.price) : "";
    node.querySelectorAll(".rpk-x, .rpk-ok").forEach((b) => b.addEventListener("click", closeBuy));
    node.addEventListener("mousedown", (e) => e.target === node && closeBuy());
    document.body.appendChild(node);
  }

  function openFakePurchase(item) {
    if (buyOverlay) return;
    purchased = false;
    const node = h(BUY_HTML);
    const thumb = node.querySelector(".rpk-thumb");
    getItemImage(item).then((src) => src && thumb && (thumb.src = src));
    const confirm = node.querySelector(".rpk-confirm");
    let processing = false;
    confirm.addEventListener("click", () => {
      if (processing) return;
      processing = true;
      confirm.disabled = true;
      confirm.setAttribute("aria-busy", "true");
      confirm.classList.remove("bg-action-emphasis", "content-action-emphasis");
      confirm.classList.add("bg-shift-100", "content-muted");
      setTimeout(() => buyOverlay && completePurchase(item), 1370);
    });
    mountOverlay(node, item);
    document.addEventListener("keydown", buyEsc);
  }

  function completePurchase(item) {
    if (settings.fakeEnabled && item.price) {
      setVals({ fakeRobux: Math.max(0, settings.fakeRobux - item.price) });
    }
    purchased = true;
    pendingOwned = { kind: item.kind, id: item.id };
    buyOverlay.remove();
    buyOverlay = null;
    const node = h(COMPLETE_HTML);
    mountOverlay(node, item);
  }

  function onBuyCapture(e) {
    if (!settings.fakeEnabled) return;
    const btn = e.target.closest("button, a");
    if (!btn || btn.closest(".rpk-buy-root, .rpk-overlay, .rpk-gift-container, .rpkp-root")) return;
    const container = document.getElementById("item-details-container");
    if (!container || !container.contains(btn)) return;
    if (!/^(buy|buy now|get)$/i.test(btn.textContent.trim())) return;
    const item = getItemInfo();
    if (!item) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (e.type === "click" && !buyOverlay) openFakePurchase(item);
  }

  const GIFT_HTML = `<div class="btn-container rpk-gift-container"><button type="button" class="btn-primary-lg rpk-gift-btn"><span>Gift</span></button></div>`;

  function giftClick(e) {
    e.preventDefault();
    e.stopPropagation();
    openGiftModal();
  }

  function sizeGift(row, cont) {
    cont.querySelector(".rpk-gift-btn").classList.toggle("rpk-light", isLightTheme());
  }

  function ensureGiftButton() {
    if (!settings.giftEnabled || !getItemInfo()) {
      document.querySelector(".rpk-gift-container")?.remove();
      document.querySelector(".rpk-gift-floating")?.remove();
      return;
    }
    const row = purchaseRow();
    if (row) {
      document.querySelector(".rpk-gift-floating")?.remove();
      let cont = row.querySelector(":scope > .rpk-gift-container");
      if (!cont) {
        cont = h(GIFT_HTML);
        cont.querySelector("button").addEventListener("click", giftClick);
        row.appendChild(cont);
      } else if (row.lastElementChild !== cont) {
        row.appendChild(cont);
      }
      sizeGift(row, cont);
      return;
    }
    if (!document.querySelector(".rpk-gift-floating") && performance.now() > 8000) {
      const btn = el("button", "rpk-gift-floating");
      btn.type = "button";
      btn.appendChild(el("span", null, "Gift"));
      btn.addEventListener("click", giftClick);
      document.body.appendChild(btn);
    }
  }

  const OWNED_ROW_HTML = `<div class="price-row-container rpk-owned-row"><div class="price-container-text"><div class="item-first-line">This item is available in your inventory.</div></div><a href="/my/avatar" class="btn-control-md rpk-owned-edit" title="Edit in Avatar Editor"><span class="icon-nav-charactercustomizer"></span></a></div>`;
  const OWNED_BADGE_HTML = `<span class="item-owned rpk-owned-badge"><div class="label-checkmark"><span class="icon-checkmark-white-bold"></span></div><span>Item Owned</span></span>`;

  function applyOwned() {
    const item = getItemInfo();
    const row = purchaseRow();
    const owned = !!(item && settings.fakeEnabled && settings.fakeOwned && settings.fakeOwned[item.kind + item.id]);
    document.documentElement.classList.toggle("rpk-owned-page", owned);

    const creator = document.querySelector("#item-details-container .item-details-creator-container");
    if (creator) {
      const fakeBadge = creator.querySelector(":scope > .rpk-owned-badge");
      const realBadge = creator.querySelector(":scope > .item-owned:not(.rpk-owned-badge)");
      if (owned && !fakeBadge && !realBadge) creator.appendChild(h(OWNED_BADGE_HTML));
      else if (!owned && fakeBadge) fakeBadge.remove();
    }

    if (!row) return;
    let ownedRow = row.querySelector(":scope > .rpk-owned-row");
    if (owned) {
      if (!ownedRow) {
        ownedRow = h(OWNED_ROW_HTML);
        row.insertBefore(ownedRow, row.firstChild);
      } else if (row.firstElementChild !== ownedRow) {
        row.insertBefore(ownedRow, row.firstChild);
      }
    } else {
      ownedRow?.remove();
    }

    const gift = row.querySelector(".rpk-gift-btn");
    if (gift) {
      if (owned) {
        const buy = row.querySelector(".PurchaseButton, .btn-growth-lg");
        const blue = buy && getComputedStyle(buy).backgroundColor;
        if (blue && blue !== "rgba(0, 0, 0, 0)") {
          gift.style.setProperty("background", blue, "important");
          gift.style.setProperty("color", "#fff", "important");
        }
      } else if (gift.style.background) {
        gift.style.removeProperty("background");
        gift.style.removeProperty("color");
      }
    }
  }

  const PANEL_HTML = `
<div class="rpkp-root" id="rpkp-root" hidden>
  <div class="rpkp-head">
    <div class="rpkp-mark"></div>
    <div class="rpkp-brand">KEVIN <span>CATALOGUE GIFTER</span></div>
    <span class="rpkp-saved" id="rpkp-saved">✓ Saved</span>
    <button class="rpkp-x" id="rpkp-close" title="Close">✕</button>
  </div>
  <div class="rpkp-body">
    <div class="rpkp-card">
      <div class="rpkp-label">Fake Robux balance</div>
      <div class="rpkp-amount"><div class="rpkp-hex"></div><div class="rpkp-big" id="rpkp-big">0</div></div>
      <div class="rpkp-input-wrap"><input id="rpkp-amount" type="text" inputmode="numeric" autocomplete="off" placeholder="Enter amount…"><button class="rpkp-set" id="rpkp-set">SET</button></div>
    </div>
    <div class="rpkp-label">Features</div>
    <div class="rpkp-group">
      <label class="rpkp-row"><div class="rpkp-t"><b>Fake balance</b><small>Show fake Robux in the navbar</small></div><span class="rpkp-switch"><input type="checkbox" id="rpkp-enabled"><span class="rpkp-track"></span></span></label>
      <label class="rpkp-row"><div class="rpkp-t"><b>Gift button</b><small>Add "Gift" by Buy / Add to cart</small></div><span class="rpkp-switch"><input type="checkbox" id="rpkp-gift"><span class="rpkp-track"></span></span></label>
      <label class="rpkp-row"><div class="rpkp-t"><b>Deduct on gift</b><small>Gifting lowers your fake balance</small></div><span class="rpkp-switch"><input type="checkbox" id="rpkp-deduct"><span class="rpkp-track"></span></span></label>
    </div>
    <div class="rpkp-group">
    <button class="rpkp-reset" id="rpkp-resetOwned">Reset owned items</button>
    <div class="rpkp-foot" id="rpkp-ver"></div>
  </div>
</div>`;

  let savedTimer = 0;
  function flashSaved() {
    const s = document.getElementById("rpkp-saved");
    if (!s) return;
    s.classList.add("show");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => s.classList.remove("show"), 1400);
  }

  function refreshPanel() {
    if (!document.getElementById("rpkp-root")) return;
    const g = (id) => document.getElementById(id);
    g("rpkp-big").textContent = settings.fakeRobux.toLocaleString("en-US");
    g("rpkp-enabled").checked = settings.fakeEnabled;
    g("rpkp-gift").checked = settings.giftEnabled;
    g("rpkp-deduct").checked = settings.deductOnGift;
  }

  function togglePanel() {
    const r = document.getElementById("rpkp-root");
    if (!r) { buildPanel(); }
    const panel = document.getElementById("rpkp-root");
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) refreshPanel();
  }

  let panelBuilt = false;
  function buildPanel() {
    if (panelBuilt || !document.body) return;
    if (document.getElementById("rpkp-root")) { panelBuilt = true; return; }
    panelBuilt = true;
    const frag = document.createElement("div");
    frag.innerHTML = PANEL_HTML;
    while (frag.firstChild) document.body.appendChild(frag.firstChild);

    // Always-visible launcher; click it to show/hide the panel.
    if (!document.getElementById("kcg-launcher")) {
      const launcher = document.createElement("button");
      launcher.id = "kcg-launcher";
      launcher.type = "button";
      launcher.innerHTML = '<span class="kcg-dot"></span> KEVIN GIFTER';
      launcher.title = "Open Kevin Catalogue Gifter";
      launcher.addEventListener("click", () => {
        const panel = document.getElementById("rpkp-root");
        if (panel) {
          panel.hidden = !panel.hidden;
          if (!panel.hidden) refreshPanel();
        }
      });
      document.body.appendChild(launcher);
    }


    const g = (id) => document.getElementById(id);
    g("rpkp-close").addEventListener("click", () => (g("rpkp-root").hidden = true));

    const root = g("rpkp-root");
    const head = root.querySelector(".rpkp-head");
    let drag = null;
    head.addEventListener("mousedown", (e) => {
      if (e.target.closest(".rpkp-x")) return;
      const r = root.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      root.style.right = "auto";
      root.style.bottom = "auto";
      root.style.left = r.left + "px";
      root.style.top = r.top + "px";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!drag) return;
      const w = root.offsetWidth, h2 = root.offsetHeight;
      const x = Math.max(4, Math.min(innerWidth - w - 4, e.clientX - drag.dx));
      const y = Math.max(4, Math.min(innerHeight - h2 - 4, e.clientY - drag.dy));
      root.style.left = x + "px";
      root.style.top = y + "px";
    });
    window.addEventListener("mouseup", () => {
      drag = null;
      document.body.style.userSelect = "";
    });

    g("rpkp-set").addEventListener("click", () => {
      const n = parseAmount(g("rpkp-amount").value);
      if (n == null) { g("rpkp-amount").focus(); return; }
      setVals({ fakeRobux: n });
      g("rpkp-amount").value = "";
    });
    g("rpkp-amount").addEventListener("keydown", (e) => e.key === "Enter" && g("rpkp-set").click());

    g("rpkp-enabled").addEventListener("change", (e) => setVals({ fakeEnabled: e.target.checked }));
    g("rpkp-gift").addEventListener("change", (e) => setVals({ giftEnabled: e.target.checked }));
    g("rpkp-deduct").addEventListener("change", (e) => setVals({ deductOnGift: e.target.checked }));

    g("rpkp-resetOwned").addEventListener("click", () => {
      GM_setValue("fakeOwned", {});
      settings.fakeOwned = {};
      tick();
      const b = g("rpkp-resetOwned");
      b.textContent = "✓ Owned items cleared";
      b.classList.add("done");
      setTimeout(() => { b.textContent = "Reset owned items"; b.classList.remove("done"); }, 1500);
    });

    g("rpkp-ver").textContent = "discord.gg/luascript";

    refreshPanel();
  }

  try { GM_registerMenuCommand("Toggle Kevin Catalogue Gifter panel", togglePanel); } catch (_) {}

  let observer = null;
  const OBS_OPTS = { childList: true, subtree: true, characterData: true };

  let scheduled = false;
  let reloading = false;
  function tick() {
    if (reloading || scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      observer?.disconnect();
      try {
        applyRobux();
        if (document.body) {
          buildPanel();
          ensureGiftButton();
          applyOwned();
        }
      } finally {
        observer?.observe(document.documentElement, OBS_OPTS);
      }
    }, 16);
  }

  observer = new MutationObserver(tick);
  tick();
  observer.observe(document.documentElement, OBS_OPTS);
  for (const t of ["pointerdown", "mousedown", "click"]) document.addEventListener(t, onBuyCapture, true);

  setInterval(tick, 1500);
})();

/* Custom theme CSS appended for future maintenance:

/* Kevin Catalogue Gifter — custom crimson motion theme */
.rpkp-root {
  background: radial-gradient(ellipse at 8% 0%, rgba(239, 35, 68, .20), transparent 38%),
              linear-gradient(155deg, #21070e 0%, #10050a 58%, #1a0610 100%) !important;
  border: 1px solid rgba(255, 66, 101, .8) !important;
  box-shadow: 0 24px 70px rgba(0,0,0,.55), 0 0 0 1px rgba(255,55,90,.12),
              0 0 35px rgba(230,25,65,.14) !important;
  animation: kcg-panel-in .42s cubic-bezier(.2,.85,.25,1.15);
  transform-origin: top right;
}
@keyframes kcg-panel-in {
  from { opacity: 0; transform: translateY(14px) scale(.965); filter: blur(5px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes kcg-glow {
  0%,100% { box-shadow: 0 0 0 rgba(255,45,83,0); }
  50% { box-shadow: 0 0 18px rgba(255,45,83,.2); }
}
.rpkp-head {
  background: linear-gradient(105deg, rgba(239,35,68,.23), rgba(44,8,18,.28) 60%, transparent) !important;
  border-bottom-color: rgba(255,66,101,.34) !important;
}
.rpkp-brand { letter-spacing: .105em !important; text-shadow: 0 0 18px rgba(255,55,90,.24); }
.rpkp-card, .rpkp-group {
  background: linear-gradient(145deg, rgba(67,13,29,.84), rgba(27,7,14,.96)) !important;
  border-color: rgba(255,66,101,.34) !important;
  transition: border-color .22s ease, transform .22s ease, box-shadow .22s ease;
}
.rpkp-card:hover, .rpkp-group:hover {
  border-color: rgba(255,90,120,.75) !important;
  box-shadow: 0 8px 26px rgba(190,20,55,.12);
}
.rpkp-root button {
  transition: transform .16s ease, filter .16s ease, box-shadow .16s ease !important;
}
.rpkp-root button:hover { filter: brightness(1.14); transform: translateY(-1px); }
.rpkp-root button:active { transform: translateY(1px) scale(.985); }
.rpkp-root input {
  background: rgba(12,4,8,.82) !important;
  border-color: rgba(255,66,101,.32) !important;
  transition: border-color .2s ease, box-shadow .2s ease !important;
}
.rpkp-root input:focus {
  border-color: #ff496a !important;
  box-shadow: 0 0 0 3px rgba(255,55,90,.12), 0 0 22px rgba(255,55,90,.08) !important;
  outline: none !important;
}
.rpkp-root .rpkp-toggle, .rpkp-root [role="switch"] {
  transition: background .2s ease, box-shadow .2s ease !important;
}
.rpkp-root .rpkp-footer, .rpkp-root .rpkp-version {
  color: #ff9bab !important;
  letter-spacing: .12em;
  font-size: 10px !important;
}

*/
