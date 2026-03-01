const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const qs = require("querystring");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

const [, , startPage, endPage] = process.argv;

// CONFIG
const baseUrl = "http://example.com/showthread.php?tid=43";
const threadId = 221;
const forumPassword = "g6D7#55@As5jk+3/tr2w";
const outputDir = "./downloaded_images_43";

// Create cookie jar session
const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function getUniqueFilePath(baseName, extension) {
    let counter = 1;
    let filePath = path.join(outputDir, `${baseName}${extension}`);

    while (fs.existsSync(filePath)) {
        counter++;
        filePath = path.join(outputDir, `${baseName}_${counter}${extension}`);
    }

    return filePath;
}

async function verifyForumPassword() {
    console.log("Submitting forum password...");

    await client.post(
        `${baseUrl}`,
        qs.stringify({
            pwverify: forumPassword,
            submit: "Verify Forum Password"
        }),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                Referer: `${baseUrl}`
            }
        }
    );

    console.log("Password submitted successfully.\n");
}

async function downloadImage(imageUrl, referer, baseName) {
    try {
        const extension =
            path.extname(imageUrl.split("?")[0]) || ".jpg";

        const filePath = getUniqueFilePath(baseName, extension);
        const fileName = path.basename(filePath);

        const response = await client.get(imageUrl, {
            responseType: "stream",
            headers: {
                Referer: referer,
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        });

        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        console.log(`Downloaded: ${fileName}`);
    } catch (error) {
        console.log(error);
        console.error(`Failed: ${imageUrl}`);
    }
}

async function scrapeImages() {
    // Step 1: Verify password first
    await verifyForumPassword();

    for (let page = Number(startPage); page <= Number(endPage); page++) {
        const url = `${baseUrl}&page=${page}`;
        console.log(`Fetching page: ${url}`);

        try {
            const { data: html } = await client.get(url, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                }
            });

            const $ = cheerio.load(html);
            const downloadTasks = [];

            $("div.post_body").each((_, post) => {
                const postBlock = $(post);

                const image = postBlock
                    .find("img.mycode_img")
                    .first();
                const anchor = postBlock
                    .find("a.mycode_url")
                    .first();

                const imageUrl = image.attr("src");
                const anchorHref = anchor.attr("href");

                if (
                    imageUrl &&
                    anchorHref &&
                    !imageUrl.endsWith(".gif")
                ) {
                    const anchorFileName =
                        anchorHref.split("/").pop();
                    const baseName = anchorFileName.replace(
                        /\.[^/.]+$/,
                        ""
                    );

                    downloadTasks.push(
                        downloadImage(imageUrl, url, baseName)
                    );
                }
            });

            await Promise.all(downloadTasks);
        } catch (error) {
            console.log(error);
            console.error(`Failed page ${page}`);
        }
    }
}

scrapeImages();