const axios = require("axios");
require("dotenv").config();

const { parseVimeoUrl } = require("../utils/vimeoParser");

const VIMEO_API_BASE = "https://api.vimeo.com";

async function getVideoInfo(url) {
    try {
        const parsed = parseVimeoUrl(url);

        if (!parsed || !parsed.videoId) {
            throw new Error("Invalid Vimeo URL");
        }

        const { videoId, hash } = parsed;

        const videoIdentifier = hash
            ? `${videoId}:${hash}`
            : videoId;

        const response = await axios.get(
            `${VIMEO_API_BASE}/videos/${videoIdentifier}`,
            {
                headers: {
                    Authorization:
                        `bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
                    Accept:
                        "application/vnd.vimeo.*+json;version=3.4"
                },

                params: {
                    fields: [
                        "uri",
                        "name",
                        "description",
                        "duration",
                        "width",
                        "height",
                        "link",
                        "privacy",
                        "pictures",
                        "user",
                        "download"
                    ].join(",")
                }
            }
        );

        const data = response.data;

        const returnedVideoId =
            data.uri
                ? data.uri.split("/").pop().split(":")[0]
                : videoId;

        /*
         * Official downloadable files
         */
        const downloads = Array.isArray(data.download)
            ? data.download
            : [];

        const downloadAvailable = downloads.some(file => file && file.link);

        /*
         * Thumbnail
         */
        const thumbnailUrl =
            data.pictures?.sizes?.length
                ? data.pictures.sizes[
                      data.pictures.sizes.length - 1
                  ].link
                : null;

        return {
            video_id: Number(returnedVideoId),

            uri: data.uri || null,

            title: data.name || null,

            description: data.description || "",

            duration: data.duration || 0,

            width: data.width || null,

            height: data.height || null,

            thumbnail_url: thumbnailUrl,

            author_name: data.user?.name || null,

            author_url: data.user?.link || null,

            privacy: data.privacy || null,

            download_available:
                downloadAvailable,

            /*
             * Official Vimeo download files
             */
            download: downloads,

            player_url: hash
                ? `https://player.vimeo.com/video/${returnedVideoId}?h=${encodeURIComponent(hash)}`
                : `https://player.vimeo.com/video/${returnedVideoId}`
        };

    } catch (error) {
        console.error(
            "Vimeo API Error:",
            error.response?.status,
            error.response?.data || error.message
        );

        throw error;
    }
}

module.exports = {
    getVideoInfo
};
