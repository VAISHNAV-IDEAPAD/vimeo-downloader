const { getVideoInfo } = require("../services/vimeoService");

const downloadVimeoVideo = async (req, res) => {
  try {
    const { url, quality = "best" } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "Vimeo URL is required"
      });
    }

    const video = await getVideoInfo(url);

    // Vimeo has no downloadable files for this video
    if (!video.download_available) {
      return res.status(404).json({
        success: false,
        message: "No downloadable video files are available from Vimeo for this video.",
        video_id: video.video_id,
        available: false
      });
    }

    const downloads = video.download || [];

    // Prefer official download links
    if (downloads.length > 0) {
      const selected =
        downloads.find(file => file.quality === quality) ||
        downloads[0];

      return res.json({
        success: true,
        message: "Vimeo download link retrieved successfully",
        data: {
          video_id: video.video_id,
          title: video.title,
          quality: selected.quality || null,
          width: selected.width || null,
          height: selected.height || null,
          size: selected.size || null,
          link: selected.link
        }
      });
    }

    return res.status(404).json({
      success: false,
      message: "Vimeo did not provide a downloadable file.",
      video_id: video.video_id,
      available: false
    });

  } catch (error) {
    console.error("Vimeo download controller error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve Vimeo download information",
      error: error.message
    });
  }
};

module.exports = {
  downloadVimeoVideo
};
