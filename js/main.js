(function () {
  const data = window.birthdayData || birthdayData;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const imageCache = new Map();

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function versionAsset(src) {
    if (!src) return src;
    const hasVersion = src.includes("?") || src.startsWith("data:");
    if (hasVersion || !data.assetVersion) return src;
    if (src.includes("/music/")) return src;
    return `${src}?v=${encodeURIComponent(data.assetVersion)}`;
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value;
  }

  function createPlaceholder(label) {
    const placeholder = document.createElement("div");
    placeholder.className = "photo-placeholder";
    placeholder.innerHTML = `<span>${label}</span><small>Добавьте фото в assets</small>`;
    return placeholder;
  }

  function createImage(item, className = "") {
    const wrapper = document.createElement("div");
    wrapper.className = `photo ${className}`.trim();

    if (!item.photo) {
      wrapper.classList.add("photo--missing");
      wrapper.append(createPlaceholder(item.caption || item.alt || "Фото"));
      return wrapper;
    }

    const img = document.createElement("img");
    img.src = versionAsset(item.photo);
    img.alt = item.alt || item.caption || "";
    img.loading = item.eager ? "eager" : "lazy";
    img.decoding = "async";
    img.onerror = () => {
      wrapper.classList.add("photo--missing");
      img.remove();
      wrapper.append(createPlaceholder(item.caption || item.alt || "Фото"));
    };
    wrapper.append(img);
    return wrapper;
  }

  function renderHero() {
    setText("#hero-title", data.hero.title.replace("Любимая", data.girlName));
    setText("#hero-subtitle", data.hero.subtitle);
    const slot = $('[data-photo-slot="hero"]');
    const photo = createImage({ ...data.hero, eager: true }, "photo--hero");
    slot.append(photo);
  }

  function renderStory() {
    const timeline = $("#storyTimeline");
    data.story.forEach((item, index) => {
      const article = document.createElement("article");
      article.className = `timeline-card timeline-card--${index % 2 ? "right" : "left"} tilt-${(index % 4) + 1}`;
      article.append(createImage(item, index % 3 === 1 ? "photo--polaroid" : "photo--album"));
      const caption = document.createElement("p");
      caption.textContent = item.caption;
      article.append(caption);
      timeline.append(article);
    });
  }

  function renderReasons() {
    const grid = $("#reasonGrid");
    data.reasons.forEach((reason, index) => {
      const card = document.createElement("button");
      card.className = `reason-card tilt-${(index % 4) + 1}`;
      card.type = "button";
      card.setAttribute("aria-expanded", "false");
      card.setAttribute("aria-label", `${reason.title}. Открыть причину`);
      card.innerHTML = `
        <span class="reason-card__number">${String(index + 1).padStart(2, "0")}</span>
        <strong>${reason.title}</strong>
        <span class="reason-card__text">${reason.text}</span>
      `;
      card.addEventListener("click", () => {
        const isOpen = card.classList.toggle("is-open");
        card.setAttribute("aria-expanded", String(isOpen));
      });
      grid.append(card);
    });
  }

  function renderFriends() {
    const grid = $("#friendGrid");
    const lovedOnes = data.lovedOnes || data.friends || [];
    lovedOnes.forEach((person, index) => {
      const card = document.createElement("button");
      card.className = `friend-card tilt-${(index % 3) + 1}`;
      card.type = "button";
      card.dataset.friend = index;
      card.setAttribute("aria-label", `Посмотреть поздравление от ${person.name || "близкого человека"}`);
      card.innerHTML = `
        <span class="friend-card__avatar">
          <img src="${versionAsset(person.photo)}" alt="" loading="lazy" style="object-position: ${person.photoPosition || "center"}">
          <span class="friend-card__fallback" aria-hidden="true">${person.name ? person.name.slice(0, 1) : "♡"}</span>
        </span>
        <span class="friend-card__name">
          ${person.name || "Поздравление"}
        </span>
      `;
      const image = $("img", card);
      image.addEventListener("error", () => {
        card.classList.add("friend-card--no-photo");
        image.remove();
      }, { once: true });
      grid.append(card);
    });

    grid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-friend]");
      if (!card) return;
      openFriendModal(Number(card.dataset.friend), card);
    });
  }

  let currentFriendVideo = 0;

  function openFriendModal(index, opener) {
    const modal = $("#friendModal");
    const musicAudio = $("#musicAudio");
    const musicToggle = $("#musicToggle");
    if (musicAudio && !musicAudio.paused) {
      musicAudio.pause();
      if (musicToggle) {
        musicToggle.textContent = "▶";
        musicToggle.setAttribute("aria-label", "Включить музыку");
      }
    }
    modal.returnFocusTo = opener || null;
    currentFriendVideo = index;
    updateFriendModal();
    modal.showModal();
    document.body.classList.add("friend-video-open");
  }

  function updateFriendModal(shouldPlay = true) {
    const body = $("#friendModalBody");
    const lovedOnes = data.lovedOnes || data.friends || [];
    const friend = lovedOnes[currentFriendVideo];
    if (!friend) return;

    body.innerHTML = `
      <div class="friend-video">
        <video class="friend-video__player" controls playsinline webkit-playsinline preload="metadata" style="object-position: ${friend.videoPosition || "center"}"></video>
      </div>
      <div class="friend-video__footer">
        <button class="friend-video__nav friend-video__nav--prev" type="button" aria-label="Предыдущее видео">‹</button>
        <p class="friend-video__caption">${friend.name || "Поздравление"}</p>
        <span class="friend-video__count">${currentFriendVideo + 1} / ${lovedOnes.length}</span>
        <button class="friend-video__nav friend-video__nav--next" type="button" aria-label="Следующее видео">›</button>
      </div>
    `;
    const video = $(".friend-video__player", body);
    video.src = versionAsset(friend.video);
    video.addEventListener("ended", () => moveFriendVideo(1), { once: true });
    $(".friend-video__nav--prev", body).addEventListener("click", () => moveFriendVideo(-1));
    $(".friend-video__nav--next", body).addEventListener("click", () => moveFriendVideo(1));
    if (!shouldPlay) return;
    window.setTimeout(() => {
      video.play().catch(() => {
        video.controls = true;
      });
    }, 80);
  }

  function moveFriendVideo(direction) {
    const lovedOnes = data.lovedOnes || data.friends || [];
    if (!lovedOnes.length) return;
    currentFriendVideo = (currentFriendVideo + direction + lovedOnes.length) % lovedOnes.length;
    updateFriendModal();
  }

  function closeFriendModal() {
    const modal = $("#friendModal");
    const video = $(".friend-video__player", modal);
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.removeAttribute("src");
      video.load();
    }
    modal.classList.add("is-closing");
    window.setTimeout(() => {
      modal.close();
      modal.classList.remove("is-closing");
      document.body.classList.remove("friend-video-open");
      modal.returnFocusTo?.focus();
      modal.returnFocusTo = null;
    }, prefersReducedMotion ? 0 : 220);
  }

  function renderGallery() {
    const grid = $("#galleryGrid");
    data.gallery.forEach((item, index) => {
      imageCache.set(index, item);
      const button = document.createElement("button");
      button.className = `gallery-item tilt-${(index % 4) + 1}`;
      button.type = "button";
      button.dataset.index = index;
      button.append(createImage(item));
      const caption = document.createElement("span");
      caption.textContent = item.caption;
      button.append(caption);
      grid.append(button);
    });

    grid.addEventListener("click", (event) => {
      const item = event.target.closest(".gallery-item");
      if (item) openLightbox(Number(item.dataset.index));
    });
  }

  let currentPhoto = 0;

  function openLightbox(index) {
    currentPhoto = index;
    updateLightbox();
    $("#lightbox").showModal();
  }

  function updateLightbox() {
    const item = imageCache.get(currentPhoto);
    const image = $("#lightboxImage");
    const figure = image.closest("figure");
    $(".lightbox-placeholder", figure)?.remove();
    figure.classList.remove("lightbox__figure--missing");
    image.hidden = false;
    image.onerror = () => {
      image.hidden = true;
      figure.classList.add("lightbox__figure--missing");
      if (!$(".lightbox-placeholder", figure)) {
        const placeholder = createPlaceholder(item.caption || "Фото");
        placeholder.classList.add("lightbox-placeholder");
        figure.insertBefore(placeholder, $("#lightboxCaption"));
      }
    };
    image.src = versionAsset(item.photo);
    image.alt = item.alt || item.caption || "";
    $("#lightboxCaption").textContent = item.caption || "";
  }

  function moveLightbox(direction) {
    const total = data.gallery.length;
    currentPhoto = (currentPhoto + direction + total) % total;
    updateLightbox();
  }

  function renderLetter() {
    $("#letterPaper").innerHTML = data.letter.map((paragraph) => `<p>${paragraph}</p>`).join("");
  }

  function setupMusic() {
    const player = $("#musicPlayer");
    const audio = $("#musicAudio");
    const toggle = $("#musicToggle");
    const select = $("#musicSelect");
    const tracks = Array.isArray(data.music?.tracks) && data.music.tracks.length
      ? data.music.tracks
      : data.music?.src
        ? [{ title: data.music.title || "Наша песня", src: data.music.src }]
        : [];

    if (!tracks.length) return;
    select.innerHTML = tracks.map((track, index) => (
      `<option value="${index}">${track.title || `Песня ${index + 1}`}</option>`
    )).join("");
    player.hidden = false;

    async function startPlayback(markMissingOnError = true) {
      try {
        await audio.play();
        toggle.textContent = "❚❚";
        toggle.setAttribute("aria-label", "Поставить музыку на паузу");
        player.classList.remove("music-player--waiting");
        return true;
      } catch {
        if (markMissingOnError) player.classList.add("music-player--missing");
        return false;
      }
    }

    function setTrack(index, shouldKeepPlaying = false) {
      const track = tracks[index];
      player.classList.remove("music-player--missing");
      player.classList.remove("music-player--waiting");
      toggle.disabled = !track?.src;
      toggle.textContent = "▶";
      toggle.setAttribute("aria-label", `Включить: ${track?.title || "песню"}`);
      audio.pause();
      audio.removeAttribute("src");
      if (!track?.src) {
        audio.load();
        return;
      }
      audio.src = versionAsset(track.src);
      if (shouldKeepPlaying) {
        startPlayback();
      }
    }

    const defaultTrackIndex = Math.max(0, tracks.findIndex((track) => (
      track.title === data.music.defaultTrackTitle || track.src === data.music.defaultTrackSrc
    )));
    select.value = String(defaultTrackIndex);
    setTrack(defaultTrackIndex);

    if (data.music.autoplay) {
      const playAfterGesture = async () => {
        const played = await startPlayback(false);
        if (played) {
          document.removeEventListener("pointerdown", playAfterGesture);
          document.removeEventListener("keydown", playAfterGesture);
        }
      };
      document.addEventListener("pointerdown", playAfterGesture);
      document.addEventListener("keydown", playAfterGesture);

      player.classList.add("music-player--waiting");

      if (!data.music.startAfterFirstTap) {
        window.setTimeout(async () => {
          const started = await startPlayback(false);
          if (started) {
            document.removeEventListener("pointerdown", playAfterGesture);
            document.removeEventListener("keydown", playAfterGesture);
          }
        }, 1200);
      }
    }

    audio.addEventListener("error", () => {
      player.classList.add("music-player--missing");
    });

    select.addEventListener("change", () => {
      setTrack(Number(select.value), !audio.paused);
    });

    toggle.addEventListener("click", async () => {
      if (audio.paused) {
        startPlayback();
      } else {
        audio.pause();
        toggle.textContent = "▶";
        toggle.setAttribute("aria-label", "Включить нашу песню");
      }
    });
  }

  function setupIntro() {
    const openGift = () => {
      const intro = $("#intro");
      const gift = $("#gift");
      intro.classList.add("intro--opened");
      gift.setAttribute("aria-hidden", "false");
      gift.classList.add("site-shell--visible");
      setTimeout(() => gift.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" }), 420);
    };
    window.openBirthdayGift = openGift;
    $("#openGift").addEventListener("click", openGift);
    document.addEventListener("click", (event) => {
      if (event.target.closest("#openGift")) openGift();
    });
  }

  function setupLetter() {
    $("#openLetter").addEventListener("click", () => {
      const button = $("#openLetter");
      const paper = $("#letterPaper");
      const isOpen = button.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
      paper.classList.toggle("is-open", isOpen);
    });
  }

  function launchConfetti() {
    const canvas = $("#confettiCanvas");
    const context = canvas.getContext("2d");
    const particles = Array.from({ length: prefersReducedMotion ? 30 : 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight * 0.4,
      size: 4 + Math.random() * 7,
      speed: 1.4 + Math.random() * 3.8,
      spin: Math.random() * Math.PI,
      color: ["#f4d35e", "#ee6c4d", "#5aa9e6", "#8ac926", "#f7aef8"][Math.floor(Math.random() * 5)]
    }));
    let frame = 0;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.classList.add("is-active");

    function draw() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        particle.y += particle.speed;
        particle.x += Math.sin(frame / 12 + particle.spin) * 1.2;
        context.fillStyle = particle.color;
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(frame / 18 + particle.spin);
        context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.55);
        context.restore();
      });
      frame += 1;
      if (frame < 190 && particles.some((particle) => particle.y < canvas.height + 40)) {
        requestAnimationFrame(draw);
      } else {
        canvas.classList.remove("is-active");
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    draw();
  }

  function setupFinale() {
    $("#blowCandles").addEventListener("click", () => {
      $(".cake").classList.add("cake--blown");
      $("#blowCandles").disabled = true;
      launchConfetti();
      const messages = $("#finaleMessages");
      messages.innerHTML = "";
      data.finale.forEach((message, index) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = message.replace("Любимая", data.girlName);
        paragraph.style.animationDelay = `${index * 700}ms`;
        messages.append(paragraph);
      });
      messages.classList.add("is-visible");
    });
  }

  function setupReveal() {
    if (prefersReducedMotion) {
      $$(".reveal").forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    $$(".reveal").forEach((element) => observer.observe(element));
  }

  function setupDialogs() {
    const friendModal = $("#friendModal");
    $("#closeFriendModal").addEventListener("click", closeFriendModal);
    friendModal.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeFriendModal();
    });
    friendModal.addEventListener("click", (event) => {
      if (event.target === friendModal) closeFriendModal();
    });
    $("#closeLightbox").addEventListener("click", () => $("#lightbox").close());
    $("#prevPhoto").addEventListener("click", () => moveLightbox(-1));
    $("#nextPhoto").addEventListener("click", () => moveLightbox(1));

    let touchStart = null;
    $("#lightbox").addEventListener("touchstart", (event) => {
      touchStart = event.changedTouches[0].clientX;
    }, { passive: true });
    $("#lightbox").addEventListener("touchend", (event) => {
      if (touchStart === null) return;
      const diff = event.changedTouches[0].clientX - touchStart;
      if (Math.abs(diff) > 48) moveLightbox(diff > 0 ? -1 : 1);
      touchStart = null;
    }, { passive: true });

    document.addEventListener("keydown", (event) => {
      if (friendModal.open && event.key === "Escape") {
        event.preventDefault();
        closeFriendModal();
        return;
      }
      if (friendModal.open) {
        if (event.key === "ArrowLeft") moveFriendVideo(-1);
        if (event.key === "ArrowRight") moveFriendVideo(1);
        return;
      }
      if (!$("#lightbox").open) return;
      if (event.key === "ArrowLeft") moveLightbox(-1);
      if (event.key === "ArrowRight") moveLightbox(1);
    });
  }

  function boot() {
    document.documentElement.style.setProperty("--girl-name", `"${data.girlName}"`);
    renderHero();
    renderStory();
    renderReasons();
    renderFriends();
    renderGallery();
    renderLetter();
    setupMusic();
    setupIntro();
    setupLetter();
    setupFinale();
    setupDialogs();
    setupReveal();
    setTimeout(() => $("#loader").classList.add("loader--hidden"), 450);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}());
