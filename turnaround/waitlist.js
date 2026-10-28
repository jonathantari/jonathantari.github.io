/* ---------- Turnaround — region waitlist ----------
   Opens the waitlist modal, guesses the visitor's region from their IP,
   and sends { region, email, ip, detected region } to a Google Apps Script
   web app that appends a row to a Google Sheet (see waitlist/README.md).
---------------------------------------------------- */

(function () {
  "use strict";

  // Paste the Apps Script web app URL here once it is deployed.
  // Until then the form still works on the page but nothing is stored.
  var WAITLIST_ENDPOINT = "https://script.google.com/macros/s/AKfycbxRDSO56FPQFuyfT9CL1baRjSljwiJWhM8kOaiDUqJvvilsWm8kg6TTzR4wXRcZhrG5/exec";

  var modal = document.getElementById("waitlist");
  if (!modal) return;

  var dialog = modal.querySelector(".modal__dialog");
  var form = modal.querySelector('[data-view="form"]');
  var done = modal.querySelector('[data-view="done"]');
  var regionInput = modal.querySelector("#wl-region");
  var emailInput = modal.querySelector("#wl-email");
  var errorBox = modal.querySelector("[data-error]");
  var submitBtn = modal.querySelector(".modal__submit");
  var doneRegion = modal.querySelector("[data-done-region]");
  var doneTitle = modal.querySelector("[data-done-title]");

  var geo = { ip: "", region: "", lookedUp: false };
  var lastFocus = null;
  var closeTimer = null;

  /* ---------- Location from IP ---------- */

  function formatRegion(city, country) {
    return [city, country].filter(Boolean).join(", ");
  }

  function fetchJSON(url) {
    var ctrl = "AbortController" in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .finally(function () { clearTimeout(timer); });
  }

  function lookUpLocation() {
    if (geo.lookedUp) return Promise.resolve(geo);
    geo.lookedUp = true;
    return fetchJSON("https://ipapi.co/json/")
      .then(function (d) {
        if (d.error) throw new Error("ipapi");
        return { ip: d.ip, region: formatRegion(d.city, d.country_name) };
      })
      .catch(function () {
        return fetchJSON("https://ipwho.is/").then(function (d) {
          if (d.success === false) throw new Error("ipwho");
          return { ip: d.ip, region: formatRegion(d.city, d.country) };
        });
      })
      .then(function (r) { geo.ip = r.ip || ""; geo.region = r.region || ""; return geo; })
      .catch(function () { return geo; });
  }

  function prefillRegion() {
    lookUpLocation().then(function () {
      if (geo.region && !regionInput.value) regionInput.value = geo.region;
    });
  }

  /* ---------- Open / close ---------- */

  function focusables() {
    return Array.prototype.filter.call(
      dialog.querySelectorAll("button, input, [href], [tabindex]:not([tabindex='-1'])"),
      function (el) { return !el.disabled && el.offsetParent !== null; }
    );
  }

  function open(trigger) {
    clearTimeout(closeTimer);
    lastFocus = trigger || document.activeElement;
    showView("form");
    errorBox.hidden = true;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    // next frame so the transition runs from the hidden state
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { modal.classList.add("is-open"); });
    });
    prefillRegion();
    setTimeout(function () { (regionInput.value ? emailInput : regionInput).focus(); }, 60);
    document.addEventListener("keydown", onKey);
  }

  function close() {
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", onKey);
    closeTimer = setTimeout(function () { modal.hidden = true; }, 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    var items = focusables();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function showView(name) {
    form.hidden = name !== "form";
    done.hidden = name !== "done";
  }

  /* ---------- Submit ---------- */

  function send(payload) {
    if (!WAITLIST_ENDPOINT) {
      console.warn("[waitlist] No endpoint set in waitlist.js, so this entry was not stored:", payload);
      return Promise.resolve();
    }
    // text/plain keeps this a "simple" request, which Apps Script accepts without a CORS preflight
    return fetch(WAITLIST_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var region = regionInput.value.trim();
    var email = emailInput.value.trim();

    if (!region) {
      errorBox.textContent = "Add the city you’d like us to open in.";
      errorBox.hidden = false;
      regionInput.focus();
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorBox.textContent = "That email doesn’t look right. Fix it or leave it blank.";
      errorBox.hidden = false;
      emailInput.focus();
      return;
    }
    errorBox.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Adding…";

    lookUpLocation()
      .then(function () {
        return send({
          region: region,
          email: email,
          ip: geo.ip,
          detectedRegion: geo.region,
          page: location.href,
          submittedAt: new Date().toISOString()
        });
      })
      .then(function () {
        doneRegion.textContent = region;
        showView("done");
        doneTitle.focus();
      })
      .catch(function () {
        errorBox.textContent = "Something went wrong. Please try again in a moment.";
        errorBox.hidden = false;
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Add my city";
      });
  });

  /* ---------- Wire up triggers ---------- */

  document.querySelectorAll("[data-waitlist-open]").forEach(function (btn) {
    btn.addEventListener("click", function () { open(btn); });
  });
  modal.querySelectorAll("[data-waitlist-close]").forEach(function (el) {
    el.addEventListener("click", close);
  });
})();
