/* sembl-stack site — reveal, progress beam, copy, and the scripted run demo. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Scroll progress beam */
  var progress = document.getElementById("progress");
  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    progress.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Reveal on scroll */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("revealed");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll("[data-reveal], [data-reveal-stagger]").forEach(function (el) {
    io.observe(el);
  });

  /* Copy install command */
  var copyBtn = document.getElementById("copyInstall");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      navigator.clipboard.writeText("pip install sembl-stack").then(function () {
        copyBtn.classList.add("copied");
        copyBtn.querySelector(".hint").textContent = "copied";
        setTimeout(function () {
          copyBtn.classList.remove("copied");
          copyBtn.querySelector(".hint").textContent = "click to copy";
        }, 1800);
      });
    });
  }

  /* ── The scripted run demo ──────────────────────────────────────────────
     A replay of a real loop: first attempt BLOCKED (forbidden edit),
     retried, PASS, bound merge, deploy, verified in prod. */

  var term = document.getElementById("demoTerm");
  var verdictBox = document.getElementById("railVerdict");
  var replayBtn = document.getElementById("replayBtn");
  if (!term) return;

  function stageEl(id) {
    return document.querySelector('.stage[data-stage="' + id + '"]');
  }
  function setStage(id, state) {
    var el = stageEl(id);
    if (!el) return;
    el.classList.remove("running", "done", "blocked");
    if (state) el.classList.add(state);
  }
  function setVerdict(kind, label) {
    verdictBox.classList.remove("pass", "block");
    if (kind) verdictBox.classList.add(kind);
    verdictBox.innerHTML = "VERDICT<b>" + label + "</b>";
  }

  /* Script steps: t = ms delay from previous step. */
  var SCRIPT = [
    { t: 0,    html: '<span class="c-prompt">$</span> <span class="c-cmd">sembl-stack loop task.yaml</span>' },
    { t: 700,  html: '<span class="c-dim">task: "add rate limiting to the login endpoint"</span>' },

    { t: 600,  stage: ["l2", "running"], html: '<span class="c-cyan">[L2 bounds]</span> <span class="c-dim">editable src/auth/ tests/ &middot; forbidden infra/ migrations/</span>' },
    { t: 700,  stage: ["l2", "done"] },

    { t: 200,  stage: ["l3", "running"], html: '<span class="c-cyan">[L3 execute]</span> <span class="c-dim">claude &middot; iteration 1&hellip;</span>' },
    { t: 1600, stage: ["l3", "done"], html: '<span class="c-dim">           diff: 5 files &middot; +142 &minus;9</span>' },

    { t: 300,  stage: ["l4", "running"], html: '<span class="c-cyan">[L4 sandbox]</span> <span class="c-dim">disposable clone &middot; tests: 38 passed</span>' },
    { t: 900,  stage: ["l4", "done"] },

    { t: 250,  stage: ["l5", "running"], html: '<span class="c-cyan">[L5 gate]</span> <span class="c-dim">sembl verify &mdash; judging the real diff</span>' },
    { t: 1000, html: '<span class="c-err">           forbidden hit: infra/rate-limits.tf</span>' },
    { t: 500,  stage: ["l5", "blocked"], verdict: ["block", "BLOCK"], html: '<span class="c-err">           verdict: BLOCK</span> <span class="c-dim">&mdash; nothing applied, nothing merged</span>' },

    { t: 1100, html: '&nbsp;' },
    { t: 0,    html: '<span class="c-warn">[L6 loop]</span> <span class="c-dim">retry with the verdict\'s reasons in the prompt</span>' },
    { t: 500,  stage: ["l5", null], verdict: [null, "&mdash;"], stage2: ["l3", "running"], html: '<span class="c-cyan">[L3 execute]</span> <span class="c-dim">claude &middot; iteration 2&hellip;</span>' },
    { t: 1500, stage: ["l3", "done"], html: '<span class="c-dim">           diff: 4 files &middot; +128 &minus;9 &middot; infra/ untouched</span>' },

    { t: 300,  stage: ["l4", "running"], html: '<span class="c-cyan">[L4 sandbox]</span> <span class="c-dim">tests: 41 passed</span>' },
    { t: 800,  stage: ["l4", "done"] },

    { t: 250,  stage: ["l5", "running"], html: '<span class="c-cyan">[L5 gate]</span> <span class="c-dim">scope clean &middot; no forbidden hits &middot; claims match the diff</span>' },
    { t: 900,  stage: ["l5", "done"], verdict: ["pass", "PASS"], html: '<span class="c-ok">           verdict: PASS</span> <span class="c-dim">&middot; bound to sha256 9f2ce1&hellip;</span>' },

    { t: 500,  stage: ["l65", "running"], html: '<span class="c-cyan">[L6.5 merge]</span> <span class="c-dim">judged file set == merged file set &middot; MergeRecord written</span>' },
    { t: 800,  stage: ["l65", "done"] },

    { t: 250,  stage: ["l7", "running"], html: '<span class="c-cyan">[L7 deploy]</span> <span class="c-dim">vercel &middot; live</span>' },
    { t: 900,  stage: ["l7", "done"] },

    { t: 250,  stage: ["l8", "running"], html: '<span class="c-cyan">[L8 prod gate]</span> <span class="c-dim">health 200 &middot; payload ok</span>' },
    { t: 900,  stage: ["l8", "done"], html: '<span class="c-ok">confirmed in production.</span> <span class="c-dim">full paper trail: .sembl/runs/2ca41f/</span>' },
    { t: 400,  html: '<span class="c-prompt">$</span> <span class="cursor"></span>', end: true }
  ];

  var timer = null;
  var started = false;

  function resetDemo() {
    if (timer) clearTimeout(timer);
    term.innerHTML = "";
    ["l2", "l3", "l4", "l5", "l65", "l7", "l8"].forEach(function (id) { setStage(id, null); });
    setVerdict(null, "&mdash;");
  }

  function playDemo() {
    resetDemo();
    var i = 0;
    function step() {
      if (i >= SCRIPT.length) return;
      var s = SCRIPT[i];
      timer = setTimeout(function () {
        if (s.stage) setStage(s.stage[0], s.stage[1]);
        if (s.stage2) setStage(s.stage2[0], s.stage2[1]);
        if (s.verdict) setVerdict(s.verdict[0], s.verdict[1]);
        if (s.html) {
          var line = document.createElement("span");
          line.className = "line";
          line.innerHTML = s.html;
          term.appendChild(line);
          term.scrollTop = term.scrollHeight;
        }
        i++;
        step();
      }, reduced ? 0 : s.t);
    }
    step();
  }

  /* Start when the demo scrolls into view; replay on demand. */
  var demoIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting && !started) {
        started = true;
        playDemo();
        demoIo.disconnect();
      }
    });
  }, { threshold: 0.35 });
  demoIo.observe(term);

  if (replayBtn) replayBtn.addEventListener("click", playDemo);
})();
