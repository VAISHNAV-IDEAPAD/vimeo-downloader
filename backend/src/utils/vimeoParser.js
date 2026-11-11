function parseVimeoUrl(input) {
    if (!input || typeof input !== "string") {
        throw new Error("Vimeo URL is required");
    }

    const url = new URL(input.trim());

    const hostname = url.hostname.toLowerCase();

    if (
        hostname !== "vimeo.com" &&
        !hostname.endsWith(".vimeo.com")
    ) {
        throw new Error("Invalid Vimeo URL");
    }

    const parts = url.pathname
        .split("/")
        .filter(Boolean);

    let videoId = null;
    let hash = null;

    // Standard Vimeo URL:
    // https://vimeo.com/1171273251
    if (parts.length >= 1 && /^\d+$/.test(parts[0])) {
        videoId = parts[0];
    }

    // Unlisted Vimeo URL:
    // https://vimeo.com/1171273251/7dd84be5a6
    if (
        parts.length >= 2 &&
        /^[a-zA-Z0-9]+$/.test(parts[1])
    ) {
        hash = parts[1];
    }

    // Player URL:
    // https://player.vimeo.com/video/1171273251
    if (
        hostname === "player.vimeo.com" &&
        parts[0] === "video" &&
        /^\d+$/.test(parts[1] || "")
    ) {
        videoId = parts[1];
    }

    if (!videoId) {
        throw new Error("Could not find Vimeo video ID");
    }

    return {
        videoId,
        hash,
        originalUrl: input.trim()
    };
}

module.exports = {
    parseVimeoUrl
};