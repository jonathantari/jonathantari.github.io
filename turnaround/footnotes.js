/* ---------- Turnaround — footnotes ----------
   An asterisk button (.fn-ref) shows or hides the source note it
   points to (aria-controls), so sources only appear when wanted.
---------------------------------------------------- */

(function () {
  "use strict";

  document.querySelectorAll(".fn-ref").forEach(function (btn) {
    var note = document.getElementById(btn.getAttribute("aria-controls"));
    if (!note) return;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      btn.setAttribute("aria-label", open ? "Show source" : "Hide source");
      note.hidden = open;
    });
  });
})();
