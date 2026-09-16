(() => {
  const help = document.getElementById("tui-help");
  const switcher = document.getElementById("tui-switcher");
  const switcherInput = document.getElementById("tui-switcher-q");
  const switcherList = document.getElementById("tui-switcher-list");
  const switcherEmpty = document.getElementById("tui-switcher-empty");
  const switcherGhostTyped = document.querySelector(".tui-switcher-ghost-typed");
  const switcherGhostRest = document.querySelector(".tui-switcher-ghost-rest");
  const app = document.querySelector(".tui-app");
  const helpOpeners = document.querySelectorAll("[data-tui-help-open]");
  const helpClosers = document.querySelectorAll("[data-tui-help-close]");
  const switcherOpeners = document.querySelectorAll("[data-tui-switcher-open]");
  const switcherClosers = document.querySelectorAll("[data-tui-switcher-close]");
  let lastFocus = null;
  let matches = [];
  let selected = 0;

  const pages = Array.isArray(window.__TUI_PAGES__) ? window.__TUI_PAGES__ : [];

  const isTypingTarget = (el) => {
    if (!el || el === document.body) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  };

  const visible = (el) => {
    if (!el || el.hasAttribute("hidden")) return false;
    if (el.closest("[hidden]")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    return el.getClientRects().length > 0;
  };

  const focusables = () =>
    [...document.querySelectorAll("a[href], button.tui-focusable")].filter(visible);

  const markCurrent = (el) => {
    document.querySelectorAll(".tui-current").forEach((node) => node.classList.remove("tui-current"));
    if (el && el.matches && el.matches("a[href], button.tui-focusable")) {
      el.classList.add("tui-current");
    }
  };

  const focusAt = (index) => {
    const els = focusables();
    if (!els.length) return;
    const next = ((index % els.length) + els.length) % els.length;
    els[next].focus();
    markCurrent(els[next]);
    els[next].scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const currentIndex = () => {
    const els = focusables();
    const active = document.activeElement;
    const idx = els.indexOf(active);
    return idx === -1 ? -1 : idx;
  };

  const go = (selector) => {
    const el = document.querySelector(selector);
    if (el && el.href) {
      window.location.href = el.href;
    }
  };

  const helpIsOpen = () => help && !help.hasAttribute("hidden");
  const switcherIsOpen = () => switcher && !switcher.hasAttribute("hidden");

  const setAppInert = (inert) => {
    if (!app) return;
    if (inert) app.setAttribute("inert", "");
    else app.removeAttribute("inert");
  };

  const restoreFocus = () => {
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
  };

  const closeHelp = () => {
    if (!help) return;
    help.setAttribute("hidden", "");
    if (!switcherIsOpen()) setAppInert(false);
    restoreFocus();
  };

  const openHelp = () => {
    if (!help) return;
    if (switcherIsOpen()) closeSwitcher();
    lastFocus = document.activeElement;
    help.removeAttribute("hidden");
    setAppInert(true);
    const closeBtn = help.querySelector("[data-tui-help-close]");
    if (closeBtn) closeBtn.focus();
  };

  const toggleHelp = () => {
    if (helpIsOpen()) closeHelp();
    else openHelp();
  };

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[-_/]+/g, " ")
      .replace(/[^\p{L}\p{N}\s]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  const compact = (value) => normalize(value).replace(/\s+/g, "");

  const haystack = (page) =>
    normalize([page.key, page.title, page.section, page.kind].filter(Boolean).join(" "));

  const pageMatches = (query, page) => {
    const q = normalize(query);
    if (!q) return true;
    const hay = haystack(page);
    const compactHay = compact(hay);
    const hayTokens = hay.split(" ").filter(Boolean);
    return q.split(" ").every((token) => {
      if (!token) return true;
      if (compactHay.includes(compact(token))) return true;
      return hayTokens.some((part) => part.startsWith(token) || part.includes(token));
    });
  };

  const scorePage = (query, page) => {
    const q = normalize(query);
    const key = normalize(page.key);
    const compactQ = compact(query);
    const compactKey = compact(page.key);
    const listing = page.kind === "home" || page.kind === "section";
    let score = listing ? 80 : 0;
    if (!q) return score + Math.max(0, 40 - key.length);

    if (key === q) score += 10000;
    if (key.startsWith(q)) score += 5000 - key.length;
    if (compactKey === compactQ) score += 3000;
    if (compactKey.startsWith(compactQ)) score += 1500 - compactKey.length;

    const hay = haystack(page);
    const hayTokens = hay.split(" ").filter(Boolean);
    q.split(" ").forEach((token) => {
      const idx = hayTokens.findIndex((part) => part.startsWith(token));
      if (idx === 0) score += 400;
      else if (idx > 0) score += Math.max(40, 220 - idx * 20);
      else if (hay.includes(token)) score += 20;
    });

    score += Math.max(0, 80 - key.length);
    return score;
  };

  const completionFor = (query, page) => {
    if (!page) return "";
    const q = normalize(query);
    const key = normalize(page.key);
    if (!q) return key;
    if (key.startsWith(q)) return key;
    const tokens = q.split(" ").filter(Boolean);
    const last = tokens[tokens.length - 1];
    const hit = haystack(page)
      .split(" ")
      .find((part) => part.startsWith(last));
    if (!hit) return "";
    return [...tokens.slice(0, -1), hit].join(" ");
  };

  const rankedMatches = (query) =>
    pages
      .filter((page) => pageMatches(query, page))
      .map((page) => ({ page, score: scorePage(query, page) }))
      .sort((a, b) => b.score - a.score || a.page.key.localeCompare(b.page.key))
      .map((entry) => entry.page);

  const selectedPage = () => matches[selected] || null;

  const updateGhost = () => {
    if (!switcherGhostTyped || !switcherGhostRest || !switcherInput) return;
    const query = switcherInput.value;
    const completion = completionFor(query, selectedPage());
    const qn = normalize(query);
    const cn = normalize(completion);
    switcherGhostTyped.textContent = query;
    switcherGhostRest.textContent = cn.startsWith(qn) && qn ? completion.slice(qn.length) : "";
  };

  const renderSwitcher = () => {
    if (!switcherList || !switcherInput) return;
    const query = switcherInput.value;
    matches = rankedMatches(query);
    if (selected >= matches.length) selected = Math.max(0, matches.length - 1);
    if (selected < 0) selected = 0;
    switcherList.replaceChildren();
    matches.forEach((page, index) => {
      const item = document.createElement("li");
      item.id = `tui-switcher-option-${index}`;
      item.className = "tui-switcher-item";
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", index === selected ? "true" : "false");
      const title = document.createElement("span");
      title.className = "tui-switcher-item-title";
      title.textContent = page.title || page.key;
      const url = document.createElement("span");
      url.className = "tui-switcher-item-url";
      url.textContent = `${page.path || page.url}${page.external ? " ↗" : ""}`;
      item.append(title, url);
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        selected = index;
        goSelected();
      });
      switcherList.append(item);
    });
    if (switcherEmpty) {
      switcherEmpty.hidden = matches.length > 0;
    }
    const active = matches.length ? `tui-switcher-option-${selected}` : "";
    switcherInput.setAttribute("aria-activedescendant", active);
    const selectedItem = active ? document.getElementById(active) : null;
    if (selectedItem) selectedItem.scrollIntoView({ block: "nearest" });
    updateGhost();
  };

  const goSelected = () => {
    const page = selectedPage();
    if (!page || !page.url) return;
    window.location.href = page.url;
  };

  const acceptCompletion = () => {
    const completion = completionFor(switcherInput.value, selectedPage());
    if (!completion || !switcherInput) return;
    switcherInput.value = completion;
    renderSwitcher();
  };

  const closeSwitcher = () => {
    if (!switcher) return;
    switcher.setAttribute("hidden", "");
    if (switcherInput) {
      switcherInput.value = "";
      switcherInput.setAttribute("aria-activedescendant", "");
    }
    matches = [];
    selected = 0;
    if (!helpIsOpen()) setAppInert(false);
    restoreFocus();
  };

  const openSwitcher = () => {
    if (!switcher || !switcherInput) return;
    if (helpIsOpen()) closeHelp();
    lastFocus = document.activeElement;
    switcher.removeAttribute("hidden");
    setAppInert(true);
    switcherInput.value = "";
    selected = 0;
    renderSwitcher();
    switcherInput.focus();
  };

  helpOpeners.forEach((btn) => btn.addEventListener("click", toggleHelp));
  helpClosers.forEach((btn) => btn.addEventListener("click", closeHelp));
  switcherOpeners.forEach((btn) => btn.addEventListener("click", openSwitcher));
  switcherClosers.forEach((btn) => btn.addEventListener("click", closeSwitcher));
  document.addEventListener("focusin", (event) => markCurrent(event.target));

  if (help) {
    help.addEventListener("click", (event) => {
      if (event.target === help) closeHelp();
    });
  }

  if (switcher) {
    switcher.addEventListener("click", (event) => {
      if (event.target === switcher) closeSwitcher();
    });
  }

  if (switcherInput) {
    switcherInput.addEventListener("input", () => {
      selected = 0;
      renderSwitcher();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (switcherIsOpen()) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          closeSwitcher();
          break;
        case "Enter":
          event.preventDefault();
          goSelected();
          break;
        case "ArrowDown":
          event.preventDefault();
          if (matches.length) {
            selected = (selected + 1) % matches.length;
            renderSwitcher();
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          if (matches.length) {
            selected = (selected - 1 + matches.length) % matches.length;
            renderSwitcher();
          }
          break;
        case "Tab":
          event.preventDefault();
          acceptCompletion();
          break;
        default:
          break;
      }
      return;
    }

    if (isTypingTarget(event.target)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
      event.preventDefault();
      toggleHelp();
      return;
    }

    if (event.key === ":") {
      event.preventDefault();
      openSwitcher();
      return;
    }

    if (event.key === "Escape") {
      if (helpIsOpen()) {
        event.preventDefault();
        closeHelp();
        return;
      }
      if (!document.body.hasAttribute("data-tui-home")) {
        go('[data-tui-nav="home"]');
      }
      return;
    }

    if (helpIsOpen()) return;

    switch (event.key) {
      case "j":
      case "ArrowDown":
        event.preventDefault();
        focusAt(currentIndex() + 1);
        break;
      case "k":
      case "ArrowUp":
        event.preventDefault();
        focusAt(currentIndex() - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(focusables().length - 1);
        break;
      case "1":
        event.preventDefault();
        go('[data-tui-nav="home"]');
        break;
      case "2":
        event.preventDefault();
        go('[data-tui-key="2"]');
        break;
      case "3":
        event.preventDefault();
        go('[data-tui-key="3"]');
        break;
      case "4":
        event.preventDefault();
        go('[data-tui-key="4"]');
        break;
      case "g":
        event.preventDefault();
        go('[data-tui-nav="github"]');
        break;
      case "l":
        event.preventDefault();
        go('[data-tui-nav="linkedin"]');
        break;
      case "n":
        event.preventDefault();
        go("a[rel='next']");
        break;
      case "p":
        event.preventDefault();
        go("a[rel='prev']");
        break;
      default:
        break;
    }
  });
})();
