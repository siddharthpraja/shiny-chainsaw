const express = require("express");
const multer = require("multer");

const authMiddleware = require("../middleware/authMiddleware");

const driveService = require("../services/googleDriveService");

const router = express.Router();

// Files are held in memory just long enough to stream them to the
// user's Google Drive - nothing is written to local disk anymore.
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WEBP and GIF images are allowed"));
    }
  },
});

router.post(
  "/image",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No image uploaded",
        });
      }

      const uploaded = await driveService.uploadFile(
        req.userId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );

      res.status(201).json({
        success: true,
        message: "Image uploaded successfully to Google Drive",

        file: {
          originalName: uploaded.originalName,
          fileName: uploaded.fileName,
          size: uploaded.size,
          mimeType: uploaded.mimeType,

          url: uploaded.url,
          viewUrl: uploaded.viewUrl,
          driveFileId: uploaded.fileId,
        },
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        error: error.message || "Image upload failed",
      });
    }
  },
);

module.exports = router;
