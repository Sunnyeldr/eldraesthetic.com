/* ELDR ÆSTHETIC — optional GA4, basic Consent Mode v2.
   No Google Analytics network request is made before an affirmative choice.
   The tag is restricted to the production domain to keep previews out of reports. */
(() => {
  "use strict";

  const MEASUREMENT_ID = "G-7ZNFZ9Y87H";
  const STORAGE_KEY = "eldr.analytics.consent.v1";
  const CONSENT_AGE = 180 * 24 * 60 * 60 * 1000;
  const COOKIE_AGE_SECONDS = 30 * 24 * 60 * 60;
  const production = ["eldraesthetic.com", "www.eldraesthetic.com"].includes(location.hostname);
  const german = document.documentElement.lang.toLowerCase().startsWith("de");
  const copy = german ? {
    settings: "Analyse-Einstellungen",
    title: "Google Analytics: Ihre Entscheidung",
    explanation: "Mit Ihrer Zustimmung laden wir Google Analytics 4 (Google Ireland). Google erhält Nutzungs-, Geräte- und Seitenaufrufdaten, setzt Analyse-Cookies und kann Daten in den USA verarbeiten sowie mit anderen Google-Diensten verknüpfen. Ohne Zustimmung wird Analytics nicht geladen.",
    details: "Mehr dazu in unserer Datenschutzerklärung.",
    decline: "Ablehnen",
    revoke: "Einwilligung widerrufen",
    accept: "Analytics erlauben",
    keep: "Weiterhin erlauben"
  } : {
    settings: "Analytics settings",
    title: "Your choice: Google Analytics",
    explanation: "With your permission, we load Google Analytics 4 (Google Ireland). Google receives usage, device and page-view data, sets analytics cookies and may process data in the US or connect it with other Google services. Without your consent, Analytics does not load.",
    details: "Read our privacy policy for details.",
    decline: "Decline",
    revoke: "Withdraw consent",
    accept: "Allow analytics",
    keep: "Keep enabled"
  };

  const readChoice = () => {
    try {
      const item = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (item && ["granted", "denied"].includes(item.value) &&
          Number.isFinite(item.at) && Date.now() - item.at >= 0 &&
          Date.now() - item.at < CONSENT_AGE) return item.value;
    } catch (_) { /* Storage can be disabled by browser settings. */ }
    return null;
  };

  const saveChoice = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, at: Date.now() }));
    } catch (_) { /* The current-page choice still works without storage. */ }
  };

  const clearAnalyticsCookies = () => {
    const names = document.cookie.split(";").map((entry) => entry.trim().split("=")[0])
      .filter((name) => /^_ga(?:_|$)|^_gid$|^_gat/.test(name));
    const domains = ["", "; domain=" + location.hostname, "; domain=." + location.hostname.replace(/^www\./, "")];
    for (const name of names) {
      for (const domain of domains) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + domain;
      }
    }
  };

  const startAnalytics = () => {
    if (!production || document.querySelector("script[data-eldr-ga4]")) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    // All advertising consent types stay denied, even when analytics is allowed.
    window.gtag("consent", "default", {
      analytics_storage: "denied", ad_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied"
    });
    window.gtag("consent", "update", { analytics_storage: "granted" });
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      cookie_expires: COOKIE_AGE_SECONDS,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const script = document.createElement("script");
    script.dataset.eldrGa4 = "true";
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
  };

  const settings = document.createElement("button");
  settings.type = "button";
  settings.className = "eldr-analytics-settings";
  settings.textContent = copy.settings;
  const footer = document.querySelector("footer .foot-legal, footer .legal-footer-inner, footer");
  if (footer) footer.appendChild(settings);
  else document.body.appendChild(settings);

  const panel = document.createElement("section");
  panel.className = "eldr-consent-panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-labelledby", "eldr-consent-title");
  panel.hidden = true;
  const title = document.createElement("h2");
  title.id = "eldr-consent-title";
  title.textContent = copy.title;
  const description = document.createElement("p");
  description.textContent = copy.explanation;
  const privacy = document.createElement("a");
  privacy.href = location.protocol === "file:" ? "datenschutz.html" : "/datenschutz.html";
  privacy.textContent = copy.details;
  const actions = document.createElement("div");
  actions.className = "eldr-consent-actions";
  const decline = document.createElement("button");
  decline.type = "button";
  decline.className = "eldr-consent-button";
  const accept = document.createElement("button");
  accept.type = "button";
  accept.className = "eldr-consent-button eldr-consent-button--accent";
  actions.append(decline, accept);
  panel.append(title, description, privacy, actions);
  document.body.appendChild(panel);

  const openSettings = () => {
    const enabled = readChoice() === "granted";
    decline.textContent = enabled ? copy.revoke : copy.decline;
    accept.textContent = enabled ? copy.keep : copy.accept;
    panel.hidden = false;
  };
  settings.addEventListener("click", openSettings);

  decline.addEventListener("click", () => {
    const hadAnalytics = readChoice() === "granted" ||
      Boolean(document.querySelector("script[data-eldr-ga4]"));
    saveChoice("denied");
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", { analytics_storage: "denied" });
    }
    clearAnalyticsCookies();
    panel.hidden = true;
    if (hadAnalytics && production) location.reload(); // Unload any active GA tag.
  });

  accept.addEventListener("click", () => {
    saveChoice("granted");
    panel.hidden = true;
    startAnalytics();
  });

  if (readChoice() === "granted") startAnalytics();
  else if (readChoice() === null) openSettings();
})();