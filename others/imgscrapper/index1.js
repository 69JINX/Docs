const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const [, , startPage, endPage] = process.argv;

// CONFIGURABLE VARIABLES
const baseUrl = "https://example.com/showthread.php?tid=742";
const outputFile = "./downloaded_urls_2334.txt";

const urlSet = new Set(); // to store unique URLs 15346014

// Main function to scrape anchor tag URLs
async function scrapeUrls() {
    for (let page = Number(startPage); page <= Number(endPage); page++) {
        const url = `${baseUrl}&page=${page}`;
        console.log(`Fetching page: ${url}`);

        try {
            const { data: html } = await axios.get(url);
            const $ = cheerio.load(html);

            $("a.mycode_url").each((_, anchor) => {
                const href = $(anchor).attr("href");
                if (href) {
                    urlSet.add(href);
                }
            });
        } catch (error) {
            console.error(`Failed to fetch page ${page}:`, error.message);
        }
    }

    // Write all URLs to the text file
    fs.writeFileSync(outputFile, [...urlSet].join("\n"));
    console.log(`Saved ${urlSet.size} URLs to ${outputFile}`);
}

// Start
scrapeUrls();
