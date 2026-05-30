const express = require('express');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const upload = require('../middleware/upload');
const metrics = require('../utils/metrics');
const { THUMBNAIL_SIZES } = require('../config/constants');

const router = express.Router();

router.post('/', upload.single('image'), async (req, res) => {
    try {
        // 1. Check if the user actually uploaded a file
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an image file.' });
        }

        metrics.increment();

        // 2. Parse and validate parameters
        let format = String(req.body.format || 'webp').toLowerCase();
        if (format === 'jpg') format = 'jpeg';

        const quality = parseInt(req.body.quality) || 80;
        const sizePreset = String(req.body.size || 'medium').toLowerCase();

        const allowedFormats = ['jpeg', 'png', 'webp', 'avif'];
        if (!allowedFormats.includes(format)) {
            return res.status(400).json({ error: `Unsupported format. Choose from: ${allowedFormats.join(', ')}` });
        }

        if (quality < 1 || quality > 100) {
            return res.status(400).json({ error: 'Quality must be a number between 1 and 100.' });
        }

        // 3. Determine thumbnail dimensions
        let width = req.body.width ? parseInt(req.body.width) : null;
        let height = req.body.height ? parseInt(req.body.height) : null;

        if (req.body.width && (isNaN(width) || width <= 0)) {
            return res.status(400).json({ error: 'Width must be a positive integer.' });
        }
        if (req.body.height && (isNaN(height) || height <= 0)) {
            return res.status(400).json({ error: 'Height must be a positive integer.' });
        }

        if (width && !height) height = width;
        if (height && !width) width = height;

        if (!width && !height) {
            if (!THUMBNAIL_SIZES[sizePreset]) {
                return res.status(400).json({ error: `Invalid size preset. Choose from: ${Object.keys(THUMBNAIL_SIZES).join(', ')}` });
            }
            width = THUMBNAIL_SIZES[sizePreset].width;
            height = THUMBNAIL_SIZES[sizePreset].height;
        }

        // 4. Build the Sharp pipeline
        // .rotate() auto-corrects EXIF orientation (required since Sharp v0.32 — not applied automatically)
        // .flatten() must run before .resize() so anti-aliased transparent edges are filled cleanly
        let pipeline = sharp(req.file.path).rotate();

        if (format === 'jpeg') {
            pipeline = pipeline.flatten({ background: '#ffffff' });
        }

        pipeline = pipeline.resize({
            width: width,
            height: height,
            fit: 'inside',
        });

        const { data: thumbnailBuffer, info: thumbMeta } = await pipeline
            .toFormat(format, { quality: quality })
            .toBuffer({ resolveWithObject: true });

        // 6. Send the thumbnail back to the user
        const originalName = path.parse(req.file.originalname).name;
        res.set('Content-Type', `image/${format}`);
        res.set('Content-Disposition', `attachment; filename="${originalName}_thumbnail.${format}"`);
        res.set('X-Original-Size', req.file.size.toString());
        res.set('X-Thumbnail-Size', thumbnailBuffer.length.toString());
        res.set('X-Thumbnail-Width', thumbMeta.width.toString());
        res.set('X-Thumbnail-Height', thumbMeta.height.toString());
        res.send(thumbnailBuffer);

        // 7. Clean up the temporary file from disk
        fs.unlink(req.file.path, (err) => { if (err) console.error('Failed to delete temp file:', err); });
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        if (req.file && req.file.path) fs.unlink(req.file.path, () => { });
        res.status(500).json({ error: 'Failed to generate thumbnail.' });
    }
});

module.exports = router;
