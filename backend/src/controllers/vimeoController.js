const vimeoService = require("../services/vimeoService");
const { parseVimeoUrl } = require("../utils/vimeoParser");

async function getVimeoVideo(req, res) {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "Vimeo URL is required"
            });
        }

        // Validate here so malformed URLs receive a client error before the API call.
        parseVimeoUrl(url);

        const video = await vimeoService.getVideoInfo(url);

        return res.status(200).json({
            success: true,
            message: "Vimeo video retrieved successfully",
            data: video
        });

    } catch (error) {
        console.error(
            "Vimeo Controller Error:",
            error.response?.data || error.message
        );

        const status = error.response?.status ||
            (error.message.includes("Vimeo URL") || error.message.includes("Vimeo video ID") ? 400 : 502);

        return res.status(status).json({
            success: false,
            message: "Unable to retrieve Vimeo video",
            error: error.response?.data || error.message
        });
    }
}

module.exports = {
    getVimeoVideo
};
