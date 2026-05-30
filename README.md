# PixelSqueez Image Optimizer API

A fast and efficient RESTful API built with Node.js and Express for uploading, converting, compressing, resizing, and generating thumbnails from images on the fly. Powered by the high-performance [Sharp](https://sharp.pixelplumbing.com/) library.

## Features

- **Format Conversion**: Convert images to `jpeg`, `png`, `webp`, or `avif`.
- **Compression**: Adjust quality (1–100) to reduce file size.
- **Resizing**: Scale images by width and/or height while preserving aspect ratio (`fit: inside`).
- **Thumbnail Generation**: Centre-crop images to exact dimensions using presets (`small`, `medium`, `large`) or custom pixel values.
- **Batch Thumbnails**: Generate thumbnails for up to 5 images at once, returned as a ZIP archive.
- **Security**: File size limit (max 10MB), strict MIME type validation (images only), and per-IP rate limiting (10 requests/min).
- **Logging & Metrics**: Logs all requests to `api-requests.log` and tracks total API call count via `/usage`.
- **Interactive Docs**: Swagger UI available at `/api-docs`.

## Prerequisites

- Node.js v18.17.0 or higher
- npm

## Installation

1. Clone the repository and navigate to the project directory:

   ```bash
   cd image-optimizer-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

## Running the Server

```bash
npm start
```

The server starts on `http://localhost:7187` by default, or the port set in the `PORT` environment variable.

## Interactive API Docs

Swagger UI is available at:

```
http://localhost:7187/api-docs
```

## Running Tests

```bash
npm test
```

> Ensure `test-image.jpeg` exists in the project root before running the test suite.

---

## API Reference

### `POST /optimize`

Optimizes a single uploaded image — converts format, adjusts quality, and optionally resizes.

**Content-Type:** `multipart/form-data`

| Parameter | Type   | Required | Default | Description                                               |
| :-------- | :----- | :------- | :------ | :-------------------------------------------------------- |
| `image`   | File   | **Yes**  | —       | Image file to optimize (max 10MB).                        |
| `format`  | String | No       | `webp`  | Output format: `jpeg`, `png`, `webp`, `avif`.             |
| `quality` | Number | No       | `80`    | Compression quality between `1` and `100`.                |
| `width`   | Number | No       | —       | Max output width in pixels (preserves aspect ratio).      |
| `height`  | Number | No       | —       | Max output height in pixels (preserves aspect ratio).     |

**Response Headers**

| Header             | Description                          |
| :----------------- | :----------------------------------- |
| `X-Original-Size`  | Uploaded file size in bytes.         |
| `X-Optimized-Size` | Processed file size in bytes.        |

**Example**

```bash
curl -X POST http://localhost:7187/optimize \
  -F "image=@photo.jpg" \
  -F "format=webp" \
  -F "quality=75" \
  -F "width=800" \
  --output optimized.webp
```

---

### `POST /thumbnail`

Generates a single centre-cropped thumbnail from an uploaded image.

**Content-Type:** `multipart/form-data`

| Parameter | Type   | Required | Default  | Description                                                                  |
| :-------- | :----- | :------- | :------- | :--------------------------------------------------------------------------- |
| `image`   | File   | **Yes**  | —        | Image file to thumbnail (max 10MB).                                          |
| `size`    | String | No       | `medium` | Preset: `small` (150×150), `medium` (300×300), `large` (600×600).           |
| `width`   | Number | No       | —        | Custom width in pixels (overrides `size`). If only one is given, both match. |
| `height`  | Number | No       | —        | Custom height in pixels (overrides `size`).                                  |
| `format`  | String | No       | `webp`   | Output format: `jpeg`, `png`, `webp`, `avif`.                                |
| `quality` | Number | No       | `80`     | Compression quality between `1` and `100`.                                   |

**Response Headers**

| Header               | Description                          |
| :------------------- | :----------------------------------- |
| `X-Original-Size`    | Uploaded file size in bytes.         |
| `X-Thumbnail-Size`   | Thumbnail file size in bytes.        |
| `X-Thumbnail-Width`  | Thumbnail width in pixels.           |
| `X-Thumbnail-Height` | Thumbnail height in pixels.          |

**Example**

```bash
curl -X POST http://localhost:7187/thumbnail \
  -F "image=@photo.jpg" \
  -F "size=large" \
  -F "format=jpeg" \
  --output thumb.jpg
```

---

### `POST /thumbnails`

Generates thumbnails for up to 5 images in a single request. Returns a `thumbnails.zip` archive. All images share the same size, format, and quality settings.

**Content-Type:** `multipart/form-data`

| Parameter | Type   | Required | Default  | Description                                                        |
| :-------- | :----- | :------- | :------- | :----------------------------------------------------------------- |
| `images`  | File[] | **Yes**  | —        | Up to 5 image files (max 10MB each).                               |
| `size`    | String | No       | `medium` | Preset: `small` (150×150), `medium` (300×300), `large` (600×600). |
| `width`   | Number | No       | —        | Custom width in pixels (overrides `size`).                         |
| `height`  | Number | No       | —        | Custom height in pixels (overrides `size`).                        |
| `format`  | String | No       | `webp`   | Output format: `jpeg`, `png`, `webp`, `avif`.                      |
| `quality` | Number | No       | `80`     | Compression quality between `1` and `100`.                         |

**Example**

```bash
curl -X POST http://localhost:7187/thumbnails \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.png" \
  -F "size=small" \
  -F "format=webp" \
  --output thumbnails.zip
```

---

### `GET /usage`

Returns the total number of image processing API calls made across all endpoints since the server was last started.

**Example**

```bash
curl http://localhost:7187/usage
```

```json
{
  "totalOptimizations": 12
}
```

---

## Rate Limiting

Each IP is limited to **10 requests per minute** across all API endpoints. Exceeding the limit returns:

```json
{
  "error": "Too many requests from this IP, please try again after a minute."
}
```

## Environment Variables

| Variable       | Default | Description                                         |
| :------------- | :------ | :-------------------------------------------------- |
| `PORT`         | `7187`  | Port the server listens on.                         |
| `FRONTEND_URL` | `*`     | Allowed CORS origin. Set to your frontend URL in production. |
