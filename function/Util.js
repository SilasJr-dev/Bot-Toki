"use strict";

const path = require("path");
const Crypto = require("crypto");
const { tmpdir } = require("os");
const ffmpeg = require("fluent-ffmpeg");
const webp = require("node-webpmux");
const sharp = require("sharp");
const fs = require("fs").promises;

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * Utility methods
 */
class Util {
  constructor() {
    throw new Error(
      `The ${this.constructor.name} class may not be instantiated.`
    );
  }

  static generateHash(length) {
    var result = "";
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  /**
   * Sets default properties on an object that aren't already specified.
   * @param {Object} def Default properties
   * @param {Object} given Object to assign defaults to
   * @returns {Object}
   * @private
   */
  static mergeDefault(def, given) {
    if (!given) return def;
    for (const key in def) {
      if (!has(given, key) || given[key] === undefined) {
        given[key] = def[key];
      } else if (given[key] === Object(given[key])) {
        given[key] = Util.mergeDefault(def[key], given[key]);
      }
    }

    return given;
  }

  /**
   * Formats a image to webp
   * @param {MessageMedia} media
   *
   * @returns {Promise<MessageMedia>} media in webp format
   */
  static async formatImageToWebpSticker(media, crop) {
    if (!media.mimetype.includes("image"))
      throw new Error("media is not a image");

    if (media.mimetype.includes("webp")) {
      return media;
    }

    // 1 - Make a Buffer with the image data
    const buffer = Buffer.from(
      media.data.replace(`data:${media.mimetype};base64,`, ""),
      "base64"
    );

    // 2 - Using the Sharp library, convert the image to webp
    let resizeObj = {
      width: 512,
      height: 512,
    };
    if (!crop) {
      resizeObj.fit = "contain";
      resizeObj.background = { r: 0, g: 0, b: 0, alpha: 0 };
    }
    const data = (
      await sharp(buffer).resize(resizeObj).webp().toBuffer()
    ).toString("base64");

    // 3 - Return the webp image
    return {
      mimetype: "image/webp",
      data: data,
      filename: `${new Date().getTime()}.webp`,
    };
  }

  /**
   * Formats a video to webp
   * @param {MessageMedia} media
   *
   * @returns {Promise<MessageMedia>} media in webp format
   */
  static async formatVideoToWebpSticker(media, crop, fps) {
    if (!media.mimetype.includes("video"))
      throw new Error("media is not a video");

    const videoType = media.mimetype.split("/")[1];

    const tempFile = path.join(
      tmpdir(),
      `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
    );

    const stream = new (require("stream").Readable)();
    const buffer = Buffer.from(
      media.data.replace(`data:${media.mimetype};base64,`, ""),
      "base64"
    );
    stream.push(buffer);
    stream.push(null);

    let ffmpegConfig = null;
    if (crop) {
      ffmpegConfig = `crop=w='min(iw\,ih)':h='min(iw\,ih)',scale=300:300,setsar=1,fps=${fps}`;
    } else {
      ffmpegConfig =
        `scale='iw*min(300/iw,300/ih)':'ih*min(300/iw,300/ih)',format=rgba,pad=300:300:'(300-iw)/2':'(300-ih)/2':'#00000000',setsar=1,fps=${fps}`;
    }
    await new Promise((resolve, reject) => {
      ffmpeg(stream)
        .inputFormat(videoType)
        .on("error", reject)
        .on("end", () => resolve(true))
        .addOutputOptions([
          "-vcodec",
          "libwebp",
          "-vf",
          ffmpegConfig,
          "-loop",
          "0",
          "-ss",
          "00:00:00.0",
          "-t",
          "00:00:05.0",
          "-preset",
          "default",
          "-an",
          "-vsync",
          "0",
          "-s",
          "512:512",
        ])
        .toFormat("webp")
        .save(tempFile);
    });

    const data = await fs.readFile(tempFile, "base64");
    await fs.unlink(tempFile);

    return {
      mimetype: "image/webp",
      data: data,
      filename: media.filename,
    };
  }

  /**
   * Sticker metadata.
   * @typedef {Object} StickerMetadata
   * @property {string} [name]
   * @property {string} [author]
   * @property {string[]} [categories]
   */

  /**
   * Formats a media to webp
   * @param {MessageMedia} media
   * @param {StickerMetadata} metadata
   *
   * @returns {Promise<MessageMedia>} media in webp format
   */
  static async formatToWebpSticker(media, metadata, crop = false, fps = '10') {
    let webpMedia;

    if (media.mimetype.includes("image"))
      webpMedia = await this.formatImageToWebpSticker(media, crop);
    else if (media.mimetype.includes("video"))
      webpMedia = await this.formatVideoToWebpSticker(media, crop, fps);
    else throw new Error("Invalid media format");

    if (metadata.name || metadata.author) {
      const img = new webp.Image();
      const hash = this.generateHash(32);
      const stickerPackId = hash;
      const packname = metadata.name;
      const author = metadata.author;
      const categories = metadata.categories || [""];
      const json = {
        "sticker-pack-id": stickerPackId,
        "sticker-pack-name": packname,
        "sticker-pack-publisher": author,
        emojis: categories,
      };
      let exifAttr = Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
      ]);
      let jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
      let exif = Buffer.concat([exifAttr, jsonBuffer]);
      exif.writeUIntLE(jsonBuffer.length, 14, 4);
      await img.load(Buffer.from(webpMedia.data, "base64"));
      img.exif = exif;
      webpMedia.data = (await img.save(null)).toString("base64");
    }

    return webpMedia;
  }

  /**
   * Configure ffmpeg path
   * @param {string} path
   */
  static setFfmpegPath(path) {
    ffmpeg.setFfmpegPath(path);
  }
}

module.exports = Util;
