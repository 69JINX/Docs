const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const qs = require("querystring");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

const [, , startPage, endPage] = process.argv;

// CONFIGURABLE VARIABLES
const baseUrl = "http://example.com/showthread.php?tid=43";
const forumPassword = "g6D7#55@As5jk+3/tr2w";
const outputFile = "./downloaded_urls_43.txt";

const urlSet = new Set();

// Create session with cookie jar
const jar = new CookieJar();
const client = wrapper(
    axios.create({
        jar,
        timeout: 15000,
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
    })
);

// Submit forum password first
async function verifyForumPassword() {
    console.log("Submitting forum password...");

    await client.post(
        baseUrl,
        qs.stringify({
            pwverify: forumPassword,
            submit: "Verify Forum Password"
        }),
        {
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded",
                Referer: baseUrl
            }
        }
    );

    console.log("Password verified.\n");
}

// Main function to scrape anchor tag URLs
async function scrapeUrls() {

    // Step 1: Verify password
    await verifyForumPassword();

    for (let page = Number(startPage); page <= Number(endPage); page++) {
        const url = `${baseUrl}&page=${page}`;
        console.log(`Fetching page: ${url}`);

        try {
            const { data: html } = await client.get(url);
            const $ = cheerio.load(html);

            $("a.mycode_url").each((_, anchor) => {
                const href = $(anchor).attr("href");
                if (href) {
                    urlSet.add(href);
                }
            });

        } catch (error) {
            console.error(
                `Failed to fetch page ${page}:`,
                error.message
            );
        }
    }

    fs.writeFileSync(outputFile, [...urlSet].join("\n"));
    console.log(`Saved ${urlSet.size} URLs to ${outputFile}`);
}

// Start
scrapeUrls();