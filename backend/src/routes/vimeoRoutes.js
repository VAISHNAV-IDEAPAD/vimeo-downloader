const express = require("express");

const {
    getVimeoVideo
} = require("../controllers/vimeoController");

const {
    downloadVimeoVideo
} = require("../controllers/vimeoDownloadController");

const router = express.Router();

// Get Vimeo video information
router.post("/info", getVimeoVideo);

// Get Vimeo downloadable video link
router.post("/download", downloadVimeoVideo);

module.exports = router;