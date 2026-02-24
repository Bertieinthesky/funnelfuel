/**
 * Funnel Fuel Tracking Pixel
 * Version: 1.0.0
 *
 * Installation:
 *   <script src="https://app.funnelfuel.ai/pixel.js" data-org-key="YOUR_ORG_KEY" async></script>
 *
 * Collects: page views, form submissions (email/phone extraction), UTM persistence,
 * device fingerprint, and SPA navigation events.
 * Does NOT use third-party cookies. All data is sent to your own first-party endpoint.
 */
(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────────
  var ENDPOINT = "https://app.funnelfuel.ai/api/pixel";
  var COOKIE_NAME = "_ff_sid";
  var STORAGE_KEY = "_ff_utm";
  var ADCLICK_KEY = "_ff_adc";
  var CID_COOKIE  = "_ff_cid";
  var COOKIE_DAYS = 365;

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  var scripts = document.querySelectorAll("script[data-org-key]");
  var orgKey =
    scripts.length
      ? scripts[scripts.length - 1].getAttribute("data-org-key")
      : null;

  if (!orgKey) {
    console.warn("[FunnelFuel] Missing data-org-key attribute on script tag.");
    return;
  }

  // Override endpoint if script tag specifies one (for local dev)
  var customEndpoint = scripts[scripts.length - 1].getAttribute("data-endpoint");
  if (customEndpoint) ENDPOINT = customEndpoint;

  // Debug mode: add data-debug="true" to the script tag to enable console logging
  var DEBUG = scripts[scripts.length - 1].getAttribute("data-debug") === "true";
  function log() {
    if (DEBUG) console.log.apply(console, ["[FunnelFuel]"].concat(Array.prototype.slice.call(arguments)));
  }

  // ── Cookie Utilities ─────────────────────────────────────────────────────────
  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie =
      name + "=" + value + "; expires=" + expires + "; path=/; SameSite=Lax";
  }

  function getCookie(name) {
    var match = document.cookie.match(
      new RegExp("(?:^|; )" + name + "=([^;]*)")
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  // ── Session ID ───────────────────────────────────────────────────────────────
  function generateId() {
    var rnd = "";
    if (crypto && crypto.getRandomValues) {
      var arr = new Uint8Array(12);
      crypto.getRandomValues(arr);
      rnd = Array.from(arr)
        .map(function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    } else {
      rnd = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
    return "ff_" + Date.now().toString(36) + "_" + rnd;
  }

  function getSessionId() {
    var sid = getCookie(COOKIE_NAME);
    if (!sid) {
      sid = generateId();
      setCookie(COOKIE_NAME, sid, COOKIE_DAYS);
    }
    return sid;
  }

  // ── UTM Persistence (first-touch wins, stored in localStorage) ───────────────
  function parseUtms() {
    var params = new URLSearchParams(window.location.search);
    var utms = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(
      function (k) {
        var v = params.get(k);
        if (v) utms[k] = v;
      }
    );
    return utms;
  }

  function getStoredUtms() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function persistUtms(utms) {
    if (!Object.keys(utms).length) return;
    try {
      var stored = getStoredUtms();
      if (!stored.utm_source) {
        // First-touch attribution — only store if not already set
        var merged = Object.assign({}, stored, utms);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
    } catch (e) {}
  }

  function getMergedUtms() {
    var stored = getStoredUtms();
    var current = parseUtms();
    return Object.assign({}, stored, current); // current-page UTMs win if present
  }

  // ── Contact ID from email click-through (ff_cid=CONTACT_ID) ──────────────────
  // When a known contact clicks an email link containing ?ff_cid=..., the pixel
  // stores it in a cookie so every subsequent event on this browser is linked to
  // that contact — even if they never fill out a form on this device.
  function captureContactId() {
    var params = new URLSearchParams(window.location.search);
    var cid = params.get("ff_cid");
    if (cid) {
      setCookie(CID_COOKIE, cid, COOKIE_DAYS);
      log("Contact ID captured from URL:", cid);
    }
    return cid || getCookie(CID_COOKIE) || null;
  }

  // ── Ad Click Parameters ───────────────────────────────────────────────────────
  // Captures platform click IDs (fbclid, gclid, ttclid, etc.) on first visit.
  // Stored in localStorage so they survive across pages within the session.
  var AD_CLICK_PARAMS = [
    "fbclid",       // Facebook / Meta
    "gclid",        // Google Ads
    "gbraid",       // Google Ads (iOS privacy)
    "wbraid",       // Google Ads (web-to-app)
    "ttclid",       // TikTok
    "li_fat_id",    // LinkedIn
    "msclkid",      // Microsoft / Bing
    "twclid",       // Twitter / X
    "sccid",        // Snapchat
    "irclickid",    // Impact / affiliates
    "ScCid",        // Snapchat (alternate)
    "epik",         // Pinterest
    "rdt_cid",      // Reddit
    // Hyros-compatible ad tracking params
    "h_ad_id",      // Hyros ad ID (cross-platform)
    "fbc_id",       // Hyros Facebook adset ID
    "gc_id",        // Hyros Google campaign ID
    "ttc_id",       // Hyros TikTok ad ID
    "bng_id",       // Hyros Bing ad group ID
    "pnt_id",       // Hyros Pinterest ad group ID
    "rdt_id",       // Hyros Reddit ad group ID
  ];

  function captureAdClicks() {
    var params = new URLSearchParams(window.location.search);
    var clicks = {};
    AD_CLICK_PARAMS.forEach(function (key) {
      var val = params.get(key);
      if (val) clicks[key] = val;
    });
    if (Object.keys(clicks).length) {
      try {
        // Merge with any previously stored clicks (first-touch wins per param)
        var stored = JSON.parse(localStorage.getItem(ADCLICK_KEY) || "{}");
        var merged = Object.assign({}, clicks, stored); // stored wins = first-touch
        localStorage.setItem(ADCLICK_KEY, JSON.stringify(merged));
        log("Ad click params captured:", JSON.stringify(clicks));
      } catch (e) {}
    }
  }

  function getAdClicks() {
    try {
      return JSON.parse(localStorage.getItem(ADCLICK_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  // ── Pending Contact Bridge (form page → confirmation page) ───────────────────
  // Stores captured contact data so the confirmation page can fire form_submit
  // even if the form page's sendBeacon failed or the submit wasn't intercepted.
  // Uses sessionStorage (primary) + a short-lived cookie (fallback for new tabs).
  var PENDING_KEY = "_ff_pc";
  var PENDING_TTL = 30 * 60 * 1000; // 30 minutes

  function savePendingContact(contact, fromUrl, fromPath) {
    var data = JSON.stringify({ contact: contact, fromUrl: fromUrl, fromPath: fromPath, ts: Date.now() });
    try { sessionStorage.setItem(PENDING_KEY, data); } catch (e) {}
    try {
      var expires = new Date(Date.now() + PENDING_TTL).toUTCString();
      document.cookie = PENDING_KEY + "=" + encodeURIComponent(data) + "; expires=" + expires + "; path=/; SameSite=Lax";
    } catch (e) {}
    log("Pending contact saved:", contact.email || contact.phone);
  }

  function clearPendingContact() {
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
    try { document.cookie = PENDING_KEY + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; } catch (e) {}
  }

  function getPendingContact() {
    try {
      var raw = sessionStorage.getItem(PENDING_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    try {
      var match = document.cookie.match(new RegExp("(?:^|; )" + PENDING_KEY + "=([^;]*)"));
      if (match) return JSON.parse(decodeURIComponent(match[1]));
    } catch (e) {}
    return null;
  }

  function checkPendingContact() {
    var pending = getPendingContact();
    if (!pending) return;
    if (Date.now() - pending.ts > PENDING_TTL) { clearPendingContact(); return; }
    // Same page = form page reloaded, not a confirmation page — don't re-fire
    if (pending.fromPath === window.location.pathname) return;
    clearPendingContact();
    log("Confirmation page detected — firing form_submit from pending contact");
    send("form_submit", {
      contact: pending.contact,
      formAction: pending.fromUrl,
      formId: null,
      formPath: pending.fromPath, // tells server to use this path for dedup key
    });
  }

  // ── Device Fingerprint ───────────────────────────────────────────────────────
  // Not used for cross-site tracking — only for stitching sessions within our system
  function getFingerprint() {
    var components = [
      navigator.userAgent || "",
      navigator.language || "",
      (screen.width || 0) + "x" + (screen.height || 0),
      String(new Date().getTimezoneOffset()),
      navigator.platform || "",
      String(!!navigator.cookieEnabled),
      String(!!window.indexedDB),
      String(window.devicePixelRatio || 1),
    ];

    // Canvas fingerprint (subtle, degrades gracefully)
    try {
      var c = document.createElement("canvas");
      var ctx = c.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("FunnelFuel", 2, 15);
        components.push(c.toDataURL().slice(-50));
      }
    } catch (e) {}

    var str = components.join("|");
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return "fp_" + Math.abs(hash).toString(36);
  }

  // ── Form Interception ────────────────────────────────────────────────────────
  var EMAIL_FIELDS = [
    "email", "email_address", "your-email", "user_email", "Email", "EMAIL",
    "subscriber[email]", "contact[email]", "lead[email]",
    "inf_field_Email",          // ClickFunnels Classic + Infusionsoft
    "cf_order_email",           // ClickFunnels Classic order forms
  ];
  var PHONE_FIELDS = [
    "phone", "phone_number", "mobile", "cell", "telephone", "Phone", "PHONE",
    "contact[phone]",
    "contact[phone_number]",    // ClickFunnels 2.0
    "inf_field_Phone1",         // ClickFunnels Classic + Infusionsoft
    "cf_order_phone",           // ClickFunnels Classic order forms
  ];
  var FIRST_NAME_FIELDS = [
    "first_name", "firstName", "fname", "given_name", "FirstName",
    "contact[first_name]",      // ClickFunnels 2.0
    "inf_field_FirstName",      // ClickFunnels Classic + Infusionsoft
    "cf_order_first_name",      // ClickFunnels Classic order forms
  ];
  var LAST_NAME_FIELDS = [
    "last_name", "lastName", "lname", "family_name", "LastName",
    "contact[last_name]",       // ClickFunnels 2.0
    "inf_field_LastName",       // ClickFunnels Classic + Infusionsoft
    "cf_order_last_name",       // ClickFunnels Classic order forms
  ];
  // CF Classic often uses a single "name" field — we split it into first/last
  var FULL_NAME_FIELDS = ["name", "full_name", "fullName", "your-name"];
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function extractFromFormData(formData) {
    var result = {};

    function tryFields(fields, key) {
      for (var i = 0; i < fields.length; i++) {
        var val = formData.get(fields[i]);
        if (val && String(val).trim()) {
          result[key] = String(val).trim();
          return;
        }
      }
    }

    tryFields(EMAIL_FIELDS, "email");
    tryFields(PHONE_FIELDS, "phone");
    tryFields(FIRST_NAME_FIELDS, "firstName");
    tryFields(LAST_NAME_FIELDS, "lastName");

    // CF Classic full-name field → split into first / last
    if (!result.firstName) {
      for (var n = 0; n < FULL_NAME_FIELDS.length; n++) {
        var fullName = formData.get(FULL_NAME_FIELDS[n]);
        if (fullName && String(fullName).trim()) {
          var parts = String(fullName).trim().split(/\s+/);
          result.firstName = parts[0];
          if (parts.length > 1) result.lastName = parts.slice(1).join(" ");
          break;
        }
      }
    }

    // Fallback: scan all values for email pattern
    if (!result.email) {
      formData.forEach(function (value) {
        if (!result.email && EMAIL_PATTERN.test(String(value))) {
          result.email = String(value).trim();
        }
      });
    }

    return result;
  }

  // Tracks forms we've already captured this page load to prevent double-firing
  var _capturedForms = new WeakSet();

  function captureForm(form) {
    if (!form || _capturedForms.has(form)) return;
    try {
      var formData = new FormData(form);
      // Log all field names in debug mode so you can see what the form contains
      if (DEBUG) {
        var fields = [];
        formData.forEach(function(v, k) { fields.push(k + "=" + (EMAIL_PATTERN.test(String(v)) ? "***@***" : String(v).slice(0, 20))); });
        log("Form fields found:", fields.join(", ") || "(none)");
      }
      var contact = extractFromFormData(formData);
      log("Extracted contact:", JSON.stringify(contact));
      if (contact.email || contact.phone) {
        _capturedForms.add(form);
        savePendingContact(contact, form.action || window.location.href, window.location.pathname);
        log("Sending form_submit →", ENDPOINT);
        send("form_submit", {
          contact: contact,
          formAction: form.action || window.location.href,
          formId: form.id || null,
        });
      } else {
        log("No email or phone found — form_submit NOT sent. Check field names above.");
      }
    } catch (err) {
      log("Error capturing form:", err);
    }
  }

  function interceptForms() {
    // Standard submit event (traditional forms)
    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (form && form.tagName === "FORM") {
        log("submit event fired on form#" + (form.id || "(no id)"));
        captureForm(form);
      }
    }, true);

    // Button click interceptor — catches AJAX-based builders (ClickFunnels 2.0,
    // Kartra, etc.) that intercept clicks and submit via fetch without firing submit.
    // Also catches ClickFunnels Classic <a href="#submit-form"> links.
    document.addEventListener("click", function (e) {
      var el = e.target;
      // Walk up the DOM in case the click landed on an icon inside the button
      for (var i = 0; i < 5 && el && el !== document.body; i++) {
        var tag = el.tagName;
        var type = (el.type || "").toLowerCase();
        var href = el.getAttribute ? (el.getAttribute("href") || "") : "";
        var isCFClassicLink = tag === "A" && href.indexOf("#submit") !== -1;
        if (
          (tag === "BUTTON" && (type === "submit" || type === "" || !el.type)) ||
          (tag === "INPUT" && type === "submit") ||
          isCFClassicLink
        ) {
          var form = el.form || el.closest("form");
          log("Submit button click detected, form#" + (form ? form.id || "(no id)" : "not found"));
          if (form) {
            captureForm(form);
          } else {
            // ClickFunnels Classic: no <form> wrapper — scan all named inputs on the page
            captureInputsFromPage();
          }
          break;
        }
        el = el.parentElement;
      }
    }, true);
  }

  // Fallback for builders with no <form> element (ClickFunnels Classic)
  // Scans ALL visible inputs using name, type, placeholder, id, and value pattern —
  // matching the same multi-signal approach Hyros uses.
  function captureInputsFromPage() {
    log("No form element found — scanning page inputs (CF Classic mode)");
    var result = {};

    var inputs = document.querySelectorAll(
      "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea"
    );

    if (DEBUG) {
      var dbg = [];
      inputs.forEach(function(i) {
        dbg.push("[type=" + (i.type||"") + " name=" + (i.name||"") + " placeholder=" + (i.placeholder||"") + "]");
      });
      log("All visible inputs:", dbg.join(", ") || "(none)");
    }

    inputs.forEach(function(input) {
      var name        = (input.name        || "").toLowerCase();
      var type        = (input.type        || "").toLowerCase();
      var placeholder = (input.placeholder || "").toLowerCase();
      var id          = (input.id          || "").toLowerCase();
      var value       = (input.value       || "").trim();
      if (!value) return;

      // ── Email ──
      if (!result.email) {
        var isEmail =
          type === "email" ||
          name.indexOf("email") !== -1 ||
          id.indexOf("email") !== -1 ||
          placeholder.indexOf("email") !== -1 ||
          EMAIL_PATTERN.test(value);
        if (isEmail && EMAIL_PATTERN.test(value)) {
          result.email = value;
          log("Email found via", type === "email" ? "type" : placeholder.indexOf("email") !== -1 ? "placeholder" : name.indexOf("email") !== -1 ? "name" : "pattern", ":", value);
          return;
        }
      }

      // ── Phone ──
      if (!result.phone) {
        var isPhone =
          type === "tel" ||
          name.indexOf("phone") !== -1 || name.indexOf("mobile") !== -1 ||
          id.indexOf("phone") !== -1 || id.indexOf("mobile") !== -1 ||
          placeholder.indexOf("phone") !== -1 || placeholder.indexOf("mobile") !== -1;
        if (isPhone && value.replace(/\D/g, "").length >= 7) {
          result.phone = value;
          log("Phone found:", value);
          return;
        }
      }

      // ── First name ──
      if (!result.firstName) {
        var isFirst =
          name === "first_name" || name === "firstname" || name === "fname" ||
          id.indexOf("first_name") !== -1 || id.indexOf("firstname") !== -1 ||
          placeholder === "first name" || placeholder === "first";
        if (isFirst) { result.firstName = value; return; }
      }

      // ── Last name ──
      if (!result.lastName) {
        var isLast =
          name === "last_name" || name === "lastname" || name === "lname" ||
          id.indexOf("last_name") !== -1 || id.indexOf("lastname") !== -1 ||
          placeholder === "last name" || placeholder === "last";
        if (isLast) { result.lastName = value; return; }
      }

      // ── Full name fallback → split into first/last ──
      if (!result.firstName) {
        var isFull =
          name === "name" || name === "full_name" || name === "fullname" ||
          id.indexOf("full_name") !== -1 ||
          placeholder === "name" || placeholder === "full name" || placeholder === "your name";
        if (isFull) {
          var parts = value.split(/\s+/);
          result.firstName = parts[0];
          if (parts.length > 1) result.lastName = parts.slice(1).join(" ");
          return;
        }
      }
    });

    log("Captured from page:", JSON.stringify(result));
    if (result.email || result.phone) {
      savePendingContact(result, window.location.href, window.location.pathname);
      log("Sending form_submit (no-form mode) →", ENDPOINT);
      send("form_submit", {
        contact: result,
        formAction: window.location.href,
        formId: null,
      });
    } else {
      log("No email or phone found in page inputs. Check field names above.");
    }
  }

  // ── SPA Navigation Tracking ──────────────────────────────────────────────────
  function trackNavigation() {
    var lastPath = window.location.pathname + window.location.search;

    function onNavigate() {
      var currentPath = window.location.pathname + window.location.search;
      if (currentPath !== lastPath) {
        lastPath = currentPath;
        // Small delay to let the page title update
        setTimeout(function () {
          send("page_view", { title: document.title });
        }, 100);
      }
    }

    var origPush = history.pushState;
    history.pushState = function () {
      origPush.apply(this, arguments);
      onNavigate();
    };

    var origReplace = history.replaceState;
    history.replaceState = function () {
      origReplace.apply(this, arguments);
      onNavigate();
    };

    window.addEventListener("popstate", onNavigate);
  }

  // ── Event Sending ────────────────────────────────────────────────────────────
  var SESSION_ID = getSessionId();
  var FINGERPRINT = getFingerprint();
  var CONTACT_ID = captureContactId();
  captureAdClicks();

  function send(type, data) {
    var adClicks = getAdClicks();
    var payload = {
      orgKey: orgKey,
      sessionId: SESSION_ID,
      fingerprint: FINGERPRINT,
      contactId: CONTACT_ID || undefined,
      type: type,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || null,
      utms: getMergedUtms(),
      adClicks: Object.keys(adClicks).length ? adClicks : undefined,
      data: data || {},
      ts: Date.now(),
    };

    log("Sending", type, "→", ENDPOINT);

    var body = JSON.stringify(payload);

    // sendBeacon: fire-and-forget, survives page unload
    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: "application/json" });
      var sent = navigator.sendBeacon(ENDPOINT, blob);
      if (sent) { log(type, "sent via sendBeacon"); return; }
    }

    // Fallback to fetch with keepalive
    try {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true,
      }).then(function(r) {
        log(type, "sent via fetch, status:", r.status);
      }).catch(function(err) {
        log("fetch error:", err);
      });
    } catch (e) { log("send error:", e); }
  }

  // ── Initialize ───────────────────────────────────────────────────────────────
  log("Initialized — orgKey:", orgKey, "| sessionId:", SESSION_ID, "| endpoint:", ENDPOINT);
  persistUtms(parseUtms());
  checkPendingContact(); // fire form_submit if arriving from a form page
  send("page_view", { title: document.title });
  interceptForms();
  trackNavigation();
})();
