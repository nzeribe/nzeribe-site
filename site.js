(function () {
  var el = document.querySelector("[data-caption]");
  if (el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var chunks = [
      "The Public Computer",
      "is a new kind",
      "of social technology,",
      "designed to bring",
      "people together."
    ];
    var SHOW = 1500, HOLD_LAST = 2400, GAP = 900, START = 1200;
    var i = 0;
    var next = function () {
      if (i < chunks.length) {
        el.textContent = chunks[i];
        var wait = i === chunks.length - 1 ? HOLD_LAST : SHOW;
        i += 1;
        setTimeout(next, wait);
      } else {
        el.textContent = "";
        i = 0;
        setTimeout(next, GAP);
      }
    };
    setTimeout(next, START);
  }

  var form = document.querySelector("[data-form]");
  if (!form || !window.fetch) return;
  var status = form.querySelector("[data-status]");
  var button = form.querySelector("button");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    delete data.redirect;
    button.disabled = true;
    status.textContent = "Sending…";
    fetch(form.action, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success) {
          form.reset();
          status.textContent = "Thank you. Your message is on its way.";
        } else {
          status.textContent = "That didn't go through. Please try again in a moment.";
        }
      })
      .catch(function () {
        status.textContent = "That didn't go through. Please try again in a moment.";
      })
      .then(function () { button.disabled = false; });
  });
})();
