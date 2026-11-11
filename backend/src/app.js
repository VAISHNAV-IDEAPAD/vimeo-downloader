require("dotenv").config();

const express = require("express");
const cors = require("cors");

const vimeoRoutes = require("./routes/vimeoRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Vimeo Downloader API is running"
    });
});

app.use("/api/vimeo", vimeoRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
