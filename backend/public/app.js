const form = document.querySelector("#video-form");
const input = document.querySelector("#url");
const result = document.querySelector("#result");
const accountLink = document.querySelector("#account-link");

const escapeHtml = (text = "") => String(text).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));

form.addEventListener("submit", async event => {
  event.preventDefault();
  const url = input.value.trim();
  if (!url) return;
  const button = form.querySelector("button");
  button.disabled = true;
  button.textContent = "Checking…";
  result.hidden = false;
  result.innerHTML = '<p class="status">Looking for creator-enabled downloads…</p>';
  try {
    const response = await fetch("/api/vimeo/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || "We couldn’t find that video.");
    const video = payload.data;
    if (!video.download_available || !video.download.length) throw new Error("This video doesn’t have downloads enabled by its creator.");
    const rows = video.download.map(file => `<a class="download" href="${file.link}" target="_blank" rel="noopener"><span>${escapeHtml(file.quality || "Video")} <small>${file.width ? `${file.width} × ${file.height}` : ""}</small></span><strong>Download ↗</strong></a>`).join("");
    result.innerHTML = `<article class="video">${video.thumbnail_url ? `<img src="${video.thumbnail_url}" alt="" />` : ""}<div><p class="eyebrow">READY TO DOWNLOAD</p><h2>${escapeHtml(video.title || "Vimeo video")}</h2><p>${escapeHtml(video.author_name || "Vimeo creator")}${video.duration ? ` · ${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, "0")}` : ""}</p></div></article><div class="downloads">${rows}</div>`;
  } catch (error) {
    result.innerHTML = `<p class="error">${escapeHtml(error.message)}</p>`;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Find downloads <span>→</span>';
  }
});

fetch("/api/auth/status")
  .then(response => response.json())
  .then(({ signedIn }) => {
    if (signedIn) {
      accountLink.textContent = "Vimeo connected · Sign out";
      accountLink.href = "/auth/logout";
    }
  })
  .catch(() => {});
