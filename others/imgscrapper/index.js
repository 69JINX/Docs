const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const [, , startPage, endPage] = process.argv;

// CONFIGURABLE VARIABLES
const baseUrl = "https://example.com/showthread.php?tid=742";
const outputDir = "./downloaded_images_742";

// Ensure output folder exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Helper function to download an image with a custom name
async function downloadImage(imageUrl, referer, newFileName) {
    const extension = path.extname(imageUrl).split("?")[0] || ".jpg"; // default to .jpg
    const fileName = `${newFileName}${extension}`;
    const filePath = path.join(outputDir, fileName);

    try {
        const response = await axios.get(imageUrl, {
            responseType: "stream",
            headers: {
                "Referer": referer,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on("finish", () => {
                console.log(`Downloaded: ${fileName}`);
                resolve();
            });
            writer.on("error", reject);
        });
    } catch (error) {
        console.error(`Failed to download ${imageUrl}:`, error.message);
    }
}

// Main function to process each page
async function scrapeImages() {
    for (let page = Number(startPage); page <= Number(endPage); page++) {
        const url = `${baseUrl}&page=${page}`;
        console.log(`Fetching page: ${url}`);

        try {
            const { data: html } = await axios.get(url);
            const $ = cheerio.load(html);

            $("div.post_body").each((_, post) => {
                const postBlock = $(post);

                const image = postBlock.find("img.mycode_img").first();
                const anchor = postBlock.find("a.mycode_url").first();

                const imageUrl = image.attr("src");
                const anchorHref = anchor.attr("href");

                if (
                    imageUrl &&
                    anchorHref &&
                    !imageUrl.endsWith(".gif") &&
                    anchorHref.includes("/")
                ) {
                    const anchorFileName = anchorHref.split("/").pop(); // e.g. kkGM4176.mp4
                    const newName = anchorFileName.replace(/\.[^/.]+$/, ""); // remove .mp4

                    downloadImage(imageUrl, url, newName);
                }
            });
        } catch (error) {
            console.error(`Failed to fetch page ${page}:`, error.message);
        }
    }
}

// Start
scrapeImages();
