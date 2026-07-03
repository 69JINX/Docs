const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const [, , startPage, endPage] = process.argv;

// CONFIG
const baseUrl = "https://example.com/showthread.php?tid=276";
const outputDir = "./downloaded_images_276";
const fileProvider = "jumploads.com";

const REQUEST_TIMEOUT = 30000;
const PAGE_DELAY_MS = 2000;
const MAX_RETRIES = 5;

// Ensure output folder exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, config = {}) {
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await axios.get(url, {
                timeout: REQUEST_TIMEOUT,
                ...config
            });
        } catch (error) {
            lastError = error;

            console.log(
                `⚠️ Retry ${attempt}/${MAX_RETRIES}: ${url}`
            );

            if (attempt < MAX_RETRIES) {
                await sleep(3000);
            }
        }
    }

    throw lastError;
}

function getExtensionFromContentType(contentType) {
    const map = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "image/avif": ".avif",
        "image/bmp": ".bmp"
    };

    return map[contentType?.split(";")[0]?.toLowerCase()] || ".jpg";
}

async function downloadImage(imageUrl, referer, baseName) {
    try {
        let extension = "";

        try {
            extension = path.extname(
                new URL(imageUrl).pathname
            );
        } catch {
            extension = path.extname(
                imageUrl.split("?")[0]
            );
        }

        const response = await fetchWithRetry(imageUrl, {
            responseType: "stream",
            headers: {
                Referer: referer,
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",

                Accept:
                    "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",

                "Sec-Fetch-Dest": "image",
                "Sec-Fetch-Mode": "no-cors",
                "Sec-Fetch-Site": "cross-site"
            },
            validateStatus: () => true
        });

        const contentType = response.headers["content-type"];

        if (
            !contentType ||
            contentType.includes("text/html")
        ) {
            console.log(`❌ Blocked: ${imageUrl}`);
            response.data.destroy();
            return;
        }

        if (!extension) {
            extension =
                getExtensionFromContentType(contentType);
        }

        const filePath = path.join(
            outputDir,
            `${baseName}${extension}`
        );

        const fileName = path.basename(filePath);

        if (fs.existsSync(filePath)) {
            console.log(
                `⏭️ Skipped (already exists): ${fileName}`
            );

            response.data.destroy();
            return;
        }

        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(filePath);

            response.data.pipe(writer);

            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        console.log(`✅ Downloaded: ${fileName}`);
    } catch (error) {
        console.error(
            `❌ Failed: ${imageUrl}: ${error.message}`
        );
    }
}

async function scrapeImages() {
    for (
        let page = Number(startPage);
        page <= Number(endPage);
        page++
    ) {
        const url = `${baseUrl}&page=${page}`;

        console.log(`\n📄 Fetching page ${page}`);

        try {
            const { data: html } = await fetchWithRetry(
                url,
                {
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
                    }
                }
            );

            const $ = cheerio.load(html);

            const downloadTasks = [];

            $("div.post_body").each((_, post) => {
                const postBlock = $(post);

                const image = postBlock
                    .find("img.mycode_img")
                    .first();

                const anchor = postBlock
                    .find(
                        `a.mycode_url[href*="${fileProvider}"]`
                    )
                    .first();

                // const imageUrl = image.attr("src");
                const imageUrl = normalizeImageUrl(
                    image.attr("src")
                );
                const anchorHref = anchor.attr("href");

                if (
                    !imageUrl ||
                    !anchorHref ||
                    imageUrl.toLowerCase().endsWith(".gif")
                ) {
                    return;
                }

                const anchorFileName =
                    anchorHref.split("/").pop();

                const baseName = anchorFileName.replace(
                    /\.[^/.]+$/,
                    ""
                );

                downloadTasks.push(
                    downloadImage(
                        imageUrl,
                        url,
                        baseName
                    )
                );
            });

            await Promise.all(downloadTasks);

            console.log(
                `✅ Finished page ${page}`
            );
        } catch (error) {
            console.error(
                `❌ Failed to fetch page ${page}: ${error.message}`
            );
        }

        await sleep(PAGE_DELAY_MS);
    }
}

scrapeImages();

function normalizeImageUrl(imageUrl) {
    try {
        const urlObj = new URL(imageUrl);

        if (
            urlObj.hostname ===
            "external-content.duckduckgo.com"
        ) {
            const realUrl =
                urlObj.searchParams.get("u");

            if (realUrl) {
                return decodeURIComponent(realUrl);
            }
        }
    } catch { }

    return imageUrl;
}