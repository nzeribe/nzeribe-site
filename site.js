(function () {
  var moving = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var el = document.querySelector("[data-caption]");
  if (el && moving) {
    var chunks = [
      "The Public Computer",
      "is a new kind",
      "of social technology,",
      "designed to bring",
      "people and the things",
      "they know together",
      "for the common good."
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

  var DRIVES = [
    {
      speeds: [1, 0.86],
      program: [[1600, 0], [3800, 300], [1200, 0], [2600, 200], [900, 0], [3000, 250], [1800, 0], [4200, -750], [1400, 0]]
    },
    {
      speeds: [1, 1.12],
      program: [[2600, 0], [3000, 240], [1500, 0], [4200, 420], [1100, 0], [2400, -150], [900, 0], [2600, 210], [1600, 0], [3600, -720], [1000, 0]]
    }
  ];
  var EASE = "cubic-bezier(.45, 0, .55, 1)";

  var pct = function (v, of) { return (v / of * 100).toFixed(4) + "%"; };
  var place = function (node, x, y, r, g) {
    node.style.left = pct(x - r, g.w);
    node.style.top = pct(y - r, g.h);
    node.style.width = pct(2 * r, g.w);
    node.style.height = pct(2 * r, g.h);
  };
  var span = function (cls, parent) {
    var s = document.createElement("span");
    s.className = cls;
    parent.appendChild(s);
    return s;
  };
  var watch = function (target, fn) {
    if (!window.IntersectionObserver) { fn(true); return; }
    new IntersectionObserver(function (entries) { fn(entries[0].isIntersecting); }).observe(target);
  };
  var turns = function (program, speed) {
    var total = 0, t = 0, angle = 0, frames = [];
    program.forEach(function (s) { total += s[0]; });
    program.forEach(function (s) {
      frames.push({ offset: t / total, transform: "rotate(" + angle * speed + "deg)", easing: s[1] ? EASE : "linear" });
      t += s[0];
      angle += s[1];
    });
    frames.push({ offset: 1, transform: "rotate(" + angle * speed + "deg)" });
    return { frames: frames, total: total };
  };
  var running = function (program, t) {
    for (var k = 0; k < program.length; k++) {
      if (t < program[k][0]) return program[k][1] !== 0;
      t -= program[k][0];
    }
    return false;
  };
  var lamp = function (p, g, layer) {
    var l = span("lamp", layer);
    place(l, p[0], p[1], p[2] * 2.4, g);
    span("shade", l);
    span("glow", l);
    return l;
  };
  var light = function (l, on) {
    l.classList.toggle("on", on);
    l.classList.toggle("off", !on);
  };

  var machine = function (frame, g) {
    var layer = document.createElement("div");
    layer.className = "machine";
    layer.setAttribute("aria-hidden", "true");
    frame.insertBefore(layer, frame.querySelector(".caption"));

    var drives = g.drives.map(function (d, n) {
      var plan = DRIVES[n % DRIVES.length];
      var drive = { plan: plan, lamp: lamp(d.lamp, g, layer), reels: [], anims: [] };
      d.reels.forEach(function (r, k) {
        var clip = document.createElement("div");
        clip.className = "clip";
        if (r.clip) clip.style.clipPath = "inset(0 " + pct(g.w - r.clip, g.w) + " 0 0)";
        var reel = document.createElement("div");
        reel.className = "reel";
        place(reel, r.c[0], r.c[1], r.r, g);
        reel.style.transform = "matrix(" + r.t.join(", ") + ", 0, 0)";
        var img = new Image();
        img.alt = "";
        img.src = r.src;
        reel.appendChild(img);
        clip.appendChild(reel);
        layer.appendChild(clip);
        drive.reels.push({ img: img, speed: plan.speeds[k % plan.speeds.length] });
      });
      return drive;
    });

    var lamps = g.lamps.map(function (p) {
      return { el: lamp(p, g, layer), on: null, next: performance.now() + Math.random() * 2400 };
    });

    var visible = false;
    var started = false;
    var start = function () {
      started = true;
      drives.forEach(function (d) {
        d.anims = d.reels.map(function (r) {
          var t = turns(d.plan.program, r.speed);
          d.total = t.total;
          return r.img.animate(t.frames, { duration: t.total, iterations: Infinity });
        });
        if (!visible) d.anims.forEach(function (a) { a.pause(); });
      });
    };
    var loads = [];
    drives.forEach(function (d) {
      d.reels.forEach(function (r) {
        loads.push(new Promise(function (ok, no) {
          if (r.img.complete && r.img.naturalWidth) ok();
          else { r.img.onload = ok; r.img.onerror = no; }
        }));
      });
    });
    Promise.all(loads).then(start).catch(function () {});

    watch(frame, function (v) {
      visible = v;
      drives.forEach(function (d) {
        d.anims.forEach(function (a) { if (v) a.play(); else a.pause(); });
      });
    });

    setInterval(function () {
      if (!visible) return;
      var now = performance.now();
      lamps.forEach(function (l) {
        if (now < l.next) return;
        l.on = l.on === null ? Math.random() < 0.6 : !l.on;
        light(l.el, l.on);
        l.next = now + (l.on ? 900 + Math.random() * 3200 : 600 + Math.random() * 3600);
      });
      if (!started) return;
      drives.forEach(function (d) {
        if (d.anims.length) light(d.lamp, running(d.plan.program, d.anims[0].currentTime % d.total));
      });
    }, 100);
  };

  var calls = function (figure, g) {
    var layer = document.createElement("div");
    layer.className = "calls";
    layer.setAttribute("aria-hidden", "true");
    figure.appendChild(layer);
    var jacks = g.jacks.map(function (p) {
      var j = span("jack", layer);
      place(j, p[0], p[1], p[2] * 3.2, g);
      return { el: j, busy: false };
    });
    var visible = false, live = 0, next = 0;
    var ring = function (j) {
      j.busy = true;
      live += 1;
      var beats = [420, 320, 420, 320, 420, 320];
      var b = 0;
      var beat = function () {
        if (b < beats.length) {
          j.el.classList.toggle("on", b % 2 === 0);
          setTimeout(beat, beats[b]);
          b += 1;
        } else {
          j.el.classList.add("on");
          setTimeout(function () {
            j.el.classList.remove("on");
            j.busy = false;
            live -= 1;
          }, 2000 + Math.random() * 2600);
        }
      };
      beat();
    };
    watch(figure, function (v) { visible = v; });
    setInterval(function () {
      var now = performance.now();
      if (!visible || live >= 3 || now < next) return;
      var free = jacks.filter(function (j) { return !j.busy; });
      if (free.length) ring(free[Math.floor(Math.random() * free.length)]);
      next = now + 1200 + Math.random() * 2800;
    }, 100);
  };

  if (moving && window.fetch && Element.prototype.animate) {
    fetch("motion.json")
      .then(function (r) { return r.json(); })
      .then(function (m) {
        var hero = document.querySelector(".hero .frame");
        var board = document.querySelector(".dissolve");
        if (hero && m.hero) machine(hero, m.hero);
        if (board && m.switchboard) calls(board, m.switchboard);
      })
      .catch(function () {});
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
