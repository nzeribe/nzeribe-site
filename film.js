(function () {
  var arrows = document.querySelectorAll(".thread");
  if (!arrows.length || !window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  arrows.forEach(function (svg) {
    svg.querySelectorAll("path").forEach(function (p) {
      var n = Math.ceil(p.getTotalLength()) + 2;
      p.style.strokeDasharray = n + " " + n;
      p.style.strokeDashoffset = n;
    });
    svg.classList.add("armed");
  });
  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("drawn");
      seen.unobserve(e.target);
    });
  }, { threshold: 0.4 });
  arrows.forEach(function (svg) { seen.observe(svg); });
})();
