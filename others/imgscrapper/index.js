const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const [, , startPage, endPage] = process.argv;

// CONFIG
const baseUrl = "https://example.com/showthread.php?tid=3063";
const outputDir = "./downloaded_images_509";

// Ensure output folder exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Returns a unique file path by appending _2, _3, etc if needed
 */
function getUniqueFilePath(baseName, extension) {
    let counter = 1;
    let filePath = path.join(outputDir, `${baseName}${extension}`);

    while (fs.existsSync(filePath)) {
        counter++;
        filePath = path.join(outputDir, `${baseName}_${counter}${extension}`);
    }

    return filePath;
}

/**
 * Download image with auto-renaming
 */
async function downloadImage(imageUrl, referer, baseName) {
    try {
        const extension = path.extname(imageUrl.split("?")[0]) || ".jpg";

        const filePath = getUniqueFilePath(baseName, extension);
        const fileName = path.basename(filePath);

        const response = await axios.get(imageUrl, {
            responseType: "stream",
            headers: {
                Referer: referer,
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            },
        });

        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        console.log(`Downloaded: ${fileName}`);
    } catch (error) {
        console.error(`Failed to download ${imageUrl}: ${error.message}`);
    }
}

/**
 * Main scraper
 */
async function scrapeImages() {
    for (let page = Number(startPage); page <= Number(endPage); page++) {
        const url = `${baseUrl}&page=${page}`;
        console.log(`Fetching page: ${url}`);

        try {
            const { data: html } = await axios.get(url);
            const $ = cheerio.load(html);

            const downloadTasks = [];

            $("div.post_body").each((_, post) => {
                const postBlock = $(post);

                const image = postBlock.find("img.mycode_img").first();
                const anchor = postBlock.find("a.mycode_url").first();

                const imageUrl = image.attr("src");
                const anchorHref = anchor.attr("href");

                if (
                    imageUrl &&
                    anchorHref &&
                    !imageUrl.endsWith(".gif")
                ) {
                    const anchorFileName = anchorHref.split("/").pop();
                    const baseName = anchorFileName.replace(
                        /\.[^/.]+$/,
                        ""
                    );

                    downloadTasks.push(
                        downloadImage(imageUrl, url, baseName)
                    );
                }
            });

            // Wait for all images on this page to finish downloading
            await Promise.all(downloadTasks);
        } catch (error) {
            console.error(
                `Failed to fetch page ${page}: ${error.message}`
            );
        }
    }
}

// START
scrapeImages();
