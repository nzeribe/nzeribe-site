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

  var TYRE_SPEED = 640;
  var SPIN_UP = 1500;
  var VERTEX = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";
  var FRAGMENT = [
    "precision highp float;",
    "uniform sampler2D tex, mask, edge;",
    "uniform vec2 res, hub, c1;",
    "uniform vec4 tbox, cbox;",
    "uniform mat2 mi;",
    "uniform float band, theta, span;",
    "float tyre(float phi) {",
    "  vec2 q0 = mi * (hub - c1);",
    "  vec2 v = mi * vec2(cos(phi), sin(phi));",
    "  float a = dot(v, v), b = dot(q0, v), k = dot(q0, q0) - 1.0;",
    "  float off = (texture2D(edge, vec2(phi / 6.2831853 + 0.5, 0.5)).r * 2.0 - 1.0) * span;",
    "  return (-b + sqrt(max(b * b - a * k, 0.0))) / a + off;",
    "}",
    "void main() {",
    "  vec2 f = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / res;",
    "  float m = texture2D(mask, f).r;",
    "  if (m < 0.004) { gl_FragColor = vec4(0.0); return; }",
    "  vec2 d = cbox.xy + f * cbox.zw - hub;",
    "  float r = length(d);",
    "  float phi = atan(d.y, d.x);",
    "  float ps = phi - theta;",
    "  float r1 = tyre(phi), s1 = tyre(ps);",
    "  float rs = r <= r1 - band ? r / (r1 - band) * (s1 - band) : s1 - (r1 - r);",
    "  vec3 col = texture2D(tex, (hub + rs * vec2(cos(ps), sin(ps)) - tbox.xy) / tbox.zw).rgb;",
    "  gl_FragColor = vec4(col * m, m);",
    "}"
  ].join("\n");

  var picture = function (src) {
    return new Promise(function (ok, no) {
      var img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = no;
      img.src = src;
    });
  };
  var canvasAt = function (cls, box, g, layer) {
    var c = document.createElement("canvas");
    c.className = cls;
    c.style.left = pct(box[0], g.w);
    c.style.top = pct(box[1], g.h);
    c.style.width = pct(box[2], g.w);
    c.style.height = pct(box[3], g.h);
    layer.appendChild(c);
    return c;
  };

  var wheel = function (w, g, layer) {
    var canvas = canvasAt("wheel", w.cbox, g, layer);
    var gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false });
    if (!gl) return null;
    var high = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!high || high.precision < 23) return null;
    var shader = function (type, text) {
      var s = gl.createShader(type);
      gl.shaderSource(s, text);
      gl.compileShader(s);
      return s;
    };
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var at = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    var u = function (name) { return gl.getUniformLocation(prog, name); };
    gl.uniform2f(u("hub"), w.hub[0], w.hub[1]);
    gl.uniform2f(u("c1"), w.c1[0], w.c1[1]);
    gl.uniform4f(u("tbox"), w.tbox[0], w.tbox[1], w.tbox[2], w.tbox[3]);
    gl.uniform4f(u("cbox"), w.cbox[0], w.cbox[1], w.cbox[2], w.cbox[3]);
    gl.uniformMatrix2fv(u("mi"), false, new Float32Array(w.mi1));
    gl.uniform1f(u("band"), w.band);
    gl.uniform1f(u("span"), w.span);
    gl.uniform1i(u("tex"), 0);
    gl.uniform1i(u("mask"), 1);
    gl.uniform1i(u("edge"), 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, w.edge.length, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array(w.edge));
    var lost = false;
    canvas.addEventListener("webglcontextlost", function () { lost = true; });
    var ready = false;
    Promise.all([picture(w.tex), picture(w.mask)]).then(function (imgs) {
      imgs.forEach(function (img, n) {
        gl.activeTexture(gl.TEXTURE0 + n);
        gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      });
      ready = true;
    }).catch(function () {});
    var spin = TYRE_SPEED / w.r;
    return function (turned) {
      if (!ready || lost) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cw = Math.max(1, Math.round(canvas.clientWidth * dpr));
      var ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
        gl.viewport(0, 0, cw, ch);
      }
      gl.uniform2f(u("res"), cw, ch);
      gl.uniform1f(u("theta"), (turned * spin) % (2 * Math.PI));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
  };

  var tie = function (t, g, layer) {
    var canvas = canvasAt("tie", t.box, g, layer);
    var w = t.box[2], h = t.box[3];
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    var imgs = null;
    Promise.all([picture(t.back), picture(t.tie)]).then(function (i) { imgs = i; }).catch(function () {});
    var still = Math.ceil(t.anchor);
    return function (time, amp) {
      if (!imgs) return;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(imgs[0], 0, 0);
      for (var x = 0; x < still; x++) {
        var s = Math.min(1, Math.max(0, (t.anchor - x - 0.5) / (t.anchor - t.tip)));
        var dy = amp * (8.5 * Math.pow(s, 1.6) * Math.sin(2 * Math.PI * (0.8 * s - time / 1.5)) +
          2.4 * Math.pow(s, 2.2) * Math.sin(2 * Math.PI * (1.7 * s - time / 0.62) + 1.3));
        ctx.drawImage(imgs[1], x, 0, 1, h, x, dy, 1, h);
      }
      ctx.drawImage(imgs[1], still, 0, w - still, h, still, 0, w - still, h);
    };
  };

  var ride = function (frame, g) {
    var built = false;
    var visible = false;
    var parts = [];
    var flap = null;
    var clock = 0, last = 0, raf = 0;
    var step = function (now) {
      raf = 0;
      if (!visible) return;
      clock += Math.min(now - (last || now), 100);
      last = now;
      var ramp = Math.min(1, clock / SPIN_UP);
      var eased = ramp * ramp * (3 - 2 * ramp);
      var turned = clock < SPIN_UP ? clock * clock / (2 * SPIN_UP) / 1000 : (clock - SPIN_UP / 2) / 1000;
      parts.forEach(function (draw) { draw(turned); });
      if (flap) flap(clock / 1000, eased);
      raf = requestAnimationFrame(step);
    };
    var build = function () {
      built = true;
      var layer = document.createElement("div");
      layer.className = "ride";
      layer.setAttribute("aria-hidden", "true");
      frame.appendChild(layer);
      g.wheels.forEach(function (w) {
        var draw = wheel(w, g, layer);
        if (draw) parts.push(draw);
      });
      if (g.tie) flap = tie(g.tie, g, layer);
    };
    if (!window.IntersectionObserver) { build(); visible = true; raf = requestAnimationFrame(step); return; }
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      if (e.isIntersecting && !built) build();
      visible = e.isIntersecting;
      last = 0;
      if (visible && !raf) raf = requestAnimationFrame(step);
    }, { rootMargin: "200px 0px" }).observe(frame);
  };

  if (moving && window.fetch && Element.prototype.animate) {
    fetch("motion.json")
      .then(function (r) { return r.json(); })
      .then(function (m) {
        var hero = document.querySelector(".hero .frame");
        var board = document.querySelector(".dissolve");
        var racer = document.querySelector(".racer .frame");
        if (hero && m.hero) machine(hero, m.hero);
        if (board && m.switchboard) calls(board, m.switchboard);
        if (racer && m.racer) ride(racer, m.racer);
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
