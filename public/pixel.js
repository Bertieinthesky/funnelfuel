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
    // Kartra, etc.) that intercept clicks and submit via fetch without firing submit
    document.addEventListener("click", function (e) {
      var el = e.target;
      // Walk up the DOM in case the click landed on an icon inside the button
      for (var i = 0; i < 5 && el && el !== document.body; i++) {
        var tag = el.tagName;
        var type = (el.type || "").toLowerCase();
        if (
          (tag === "BUTTON" && (type === "submit" || type === "" || !el.type)) ||
          (tag === "INPUT" && type === "submit")
        ) {
          var form = el.form || el.closest("form");
          log("Submit button click detected, form#" + (form ? form.id || "(no id)" : "not found"));
          if (form) captureForm(form);
          break;
        }
        el = el.parentElement;
      }
    }, true);
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

  function send(type, data) {
    var payload = {
      orgKey: orgKey,
      sessionId: SESSION_ID,
      fingerprint: FINGERPRINT,
      type: type,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || null,
      utms: getMergedUtms(),
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
  send("page_view", { title: document.title });
  interceptForms();
  trackNavigation();
})();
