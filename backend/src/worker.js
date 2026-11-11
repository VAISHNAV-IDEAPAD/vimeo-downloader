const VIMEO_API_BASE = "https://api.vimeo.com";

function readCookie(request, name) {
  const value = request.headers.get("Cookie") || "";
  const match = value.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function redirect(location, cookies = []) {
  const headers = new Headers({ Location: location });

  for (const value of cookies) {
    headers.append("Set-Cookie", value);
  }

  return new Response(null, {
    status: 302,
    headers,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "access-control-allow-origin": "*",
    },
  });
}

function parseVimeoUrl(input) {
  if (!input || typeof input !== "string") {
    throw new Error("Vimeo URL is required");
  }

  let url;

  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Invalid Vimeo URL");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname !== "vimeo.com" &&
    !hostname.endsWith(".vimeo.com")
  ) {
    throw new Error("Invalid Vimeo URL");
  }

  const parts = url.pathname.split("/").filter(Boolean);

  let videoId = /^\d+$/.test(parts[0] || "")
    ? parts[0]
    : null;

  let hash =
    videoId && /^[a-zA-Z0-9]+$/.test(parts[1] || "")
      ? parts[1]
      : null;

  if (
    hostname === "player.vimeo.com" &&
    parts[0] === "video" &&
    /^\d+$/.test(parts[1] || "")
  ) {
    videoId = parts[1];
    hash = url.searchParams.get("h") || null;
  }

  if (!videoId) {
    throw new Error("Could not find Vimeo video ID");
  }

  return {
    videoId,
    hash,
  };
}

async function getVideoInfo(url, accessToken) {
  if (!accessToken) {
    throw new Error("Vimeo access token is not configured");
  }

  const { videoId, hash } = parseVimeoUrl(url);

  const identifier = hash
    ? `${videoId}:${hash}`
    : videoId;

  const fields = [
    "uri",
    "name",
    "duration",
    "width",
    "height",
    "pictures",
    "user",
    "download",
  ].join(",");

  const response = await fetch(
    `${VIMEO_API_BASE}/videos/${identifier}?fields=${encodeURIComponent(fields)}`,
    {
      headers: {
        Authorization: `bearer ${accessToken}`,
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Vimeo API request failed (${response.status}): ${errorText}`
    );
  }

  const video = await response.json();

  const downloads = Array.isArray(video.download)
    ? video.download.filter(
        file => file && file.link
      )
    : [];

  const returnedId = video.uri
    ? video.uri.split("/").pop().split(":")[0]
    : videoId;

  const thumbnailSizes =
    video.pictures?.sizes || [];

  return {
    video_id: Number(returnedId),

    title:
      video.name ||
      "Vimeo video",

    duration:
      video.duration ||
      0,

    width:
      video.width ||
      null,

    height:
      video.height ||
      null,

    thumbnail_url:
      thumbnailSizes.at(-1)?.link ||
      null,

    author_name:
      video.user?.name ||
      null,

    download_available:
      downloads.length > 0,

    download:
      downloads,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods":
            "POST, OPTIONS",
          "access-control-allow-headers":
            "content-type",
        },
      });
    }

    // ----------------------------------------
    // Vimeo OAuth
    // ----------------------------------------

    if (
      url.pathname === "/auth/vimeo" &&
      request.method === "GET"
    ) {
      if (
        !env.VIMEO_CLIENT_ID ||
        !env.VIMEO_CLIENT_SECRET
      ) {
        return new Response(
          "Vimeo OAuth has not been configured yet.",
          { status: 503 }
        );
      }

      const state = crypto.randomUUID();

      const redirectUri =
        `${url.origin}/auth/vimeo/callback`;

      const authorizationUrl =
        new URL(
          `${VIMEO_API_BASE}/oauth/authorize`
        );

      authorizationUrl.search =
        new URLSearchParams({
          response_type: "code",
          client_id: env.VIMEO_CLIENT_ID,
          redirect_uri: redirectUri,
          state,

          // Required scopes for this project
          scope:
            "public private video_files",
        }).toString();

      return redirect(
        authorizationUrl.toString(),
        [
          cookie(
            "vimeo_oauth_state",
            state,
            600
          ),
        ]
      );
    }

    // ----------------------------------------
    // Vimeo OAuth callback
    // ----------------------------------------

    if (
      url.pathname === "/auth/vimeo/callback" &&
      request.method === "GET"
    ) {
      const code =
        url.searchParams.get("code");

      const state =
        url.searchParams.get("state");

      const expectedState =
        readCookie(
          request,
          "vimeo_oauth_state"
        );

      if (
        !code ||
        !state ||
        !expectedState ||
        state !== expectedState
      ) {
        return redirect(
          "/?auth=failed",
          [
            cookie(
              "vimeo_oauth_state",
              "",
              0
            ),
          ]
        );
      }

      try {
        const redirectUri =
          `${url.origin}/auth/vimeo/callback`;

        const credentials = btoa(
          `${env.VIMEO_CLIENT_ID}:${env.VIMEO_CLIENT_SECRET}`
        );

        const tokenResponse =
          await fetch(
            `${VIMEO_API_BASE}/oauth/access_token`,
            {
              method: "POST",

              headers: {
                Authorization:
                  `basic ${credentials}`,

                "Content-Type":
                  "application/json",

                Accept:
                  "application/vnd.vimeo.*+json;version=3.4",
              },

              body: JSON.stringify({
                grant_type:
                  "authorization_code",

                code,

                redirect_uri:
                  redirectUri,
              }),
            }
          );

        if (!tokenResponse.ok) {
          const errorText =
            await tokenResponse.text();

          throw new Error(
            `Vimeo OAuth failed (${tokenResponse.status}): ${errorText}`
          );
        }

        const token =
          await tokenResponse.json();

        if (!token.access_token) {
          throw new Error(
            "Vimeo returned no access token"
          );
        }

        return redirect(
          "/?auth=success",
          [
            cookie(
              "vimeo_token",
              token.access_token,
              604800
            ),

            cookie(
              "vimeo_oauth_state",
              "",
              0
            ),
          ]
        );

      } catch (error) {
        console.error(
          "Vimeo OAuth error:",
          error
        );

        return redirect(
          "/?auth=failed",
          [
            cookie(
              "vimeo_oauth_state",
              "",
              0
            ),
          ]
        );
      }
    }

    // ----------------------------------------
    // Logout
    // ----------------------------------------

    if (
      url.pathname === "/auth/logout" &&
      request.method === "GET"
    ) {
      return redirect(
        "/",
        [
          cookie(
            "vimeo_token",
            "",
            0
          ),
        ]
      );
    }

    // ----------------------------------------
    // Authentication status
    // ----------------------------------------

    if (
      url.pathname === "/api/auth/status" &&
      request.method === "GET"
    ) {
      return json({
        success: true,
        signedIn:
          Boolean(
            readCookie(
              request,
              "vimeo_token"
            )
          ),
      });
    }

    // ----------------------------------------
    // Vimeo video information
    // ----------------------------------------

    if (
      url.pathname === "/api/vimeo/info" &&
      request.method === "POST"
    ) {
      try {
        const body =
          await request.json();

        const accessToken =
          readCookie(
            request,
            "vimeo_token"
          ) ||
          env.VIMEO_ACCESS_TOKEN;

        const video =
          await getVideoInfo(
            body.url,
            accessToken
          );

        return json({
          success: true,
          message:
            "Vimeo video retrieved successfully",
          data: video,
        });

      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to retrieve Vimeo video";

        const status =
          message.includes("URL") ||
          message.includes("video ID")
            ? 400
            : 502;

        return json(
          {
            success: false,
            message:
              "Unable to retrieve Vimeo video",
            error: message,
          },
          status
        );
      }
    }

    // ----------------------------------------
    // Static frontend assets
    // ----------------------------------------

    return env.ASSETS.fetch(request);
  },
};