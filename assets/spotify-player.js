/* Official artist embeds are opt-in; no third-party frame before the visitor asks. */
(() => {
  document
    .querySelectorAll(".spotify-player-gate[data-spotify-artist]")
    .forEach((gate) => {
      const id = gate.dataset.spotifyArtist;
      const button = gate.querySelector(".spotify-player-load");
      const frameArea = gate.querySelector(".spotify-player-frame");
      if (!/^[A-Za-z0-9]{22}$/.test(id || "") || !button || !frameArea) return;
      const status = document.createElement("p");
      status.className = "spotify-player-status";
      status.setAttribute("role", "status");
      gate.querySelector(".spotify-player-copy").append(status);
      const placeholder = frameArea.firstElementChild?.cloneNode(true);
      // Withdrawing consent: the frame is removed, so no further connection to Spotify exists.
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "spotify-player-remove";
      remove.textContent = "REMOVE SPOTIFY PLAYER";
      remove.hidden = true;
      button.after(remove);
      let timer;
      remove.addEventListener("click", () => {
        clearTimeout(timer);
        if (placeholder) frameArea.replaceChildren(placeholder.cloneNode(true));
        else frameArea.replaceChildren();
        gate.classList.remove("is-loaded");
        remove.hidden = true;
        button.disabled = false;
        button.textContent = "LOAD SPOTIFY PLAYER";
        status.textContent =
          "The Spotify player has been removed. This page no longer connects to Spotify.";
        button.focus();
      });
      button.addEventListener("click", () => {
        clearTimeout(timer);
        const player = document.createElement("iframe");
        player.title = `Spotify player for ${gate.dataset.spotifyName || "Artist"}`;
        player.src = `https://open.spotify.com/embed/artist/${id}?utm_source=generator`;
        player.allow =
          "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        player.referrerPolicy = "strict-origin-when-cross-origin";
        player.allowFullscreen = true;
        button.disabled = true;
        status.textContent = "Loading the official Spotify player…";
        const finish = (message) => {
          clearTimeout(timer);
          // A late event from a frame that was already removed must not revive the loaded state.
          if (!player.isConnected) return;
          button.disabled = false;
          button.textContent = "RELOAD SPOTIFY PLAYER";
          status.textContent = message;
        };
        player.addEventListener(
          "load",
          () =>
            finish(
              "Spotify controls playback and regional availability. If playback is unavailable, open the artist directly on Spotify.",
            ),
          { once: true },
        );
        player.addEventListener(
          "error",
          () =>
            finish(
              "The player could not connect. Retry or use the direct Spotify artist link.",
            ),
          { once: true },
        );
        timer = setTimeout(
          () =>
            finish(
              "The player is taking longer to load. Retry or open the artist directly on Spotify.",
            ),
          12000,
        );
        frameArea.replaceChildren(player);
        gate.classList.add("is-loaded");
        remove.hidden = false;
      });
    });
})();
