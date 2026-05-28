const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const [, , startPage, endPage] = process.argv;

// CONFIG
const baseUrl = "https://example.com/showthread.php?tid=1163";
const outputFile = "./rar_passwords.txt";

const results = [];

// Extract filename from URL
function getFileName(url) {
    return url.split('/').pop(); // gets 5N95dvqOXRZaLzb6.rar
}

// Main scraper
async function scrapeData() {
    for (let page = Number(startPage); page <= Number(endPage); page++) {
        const url = `${baseUrl}&page=${page}`;
        console.log(`🔍 Fetching page: ${url}`);

        try {
            const { data: html } = await axios.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            });

            const $ = cheerio.load(html);

            $(".post_body").each((_, post) => {

                // ✅ Get download link
                const link = $(post).find("a.mycode_url").attr("href");

                // ✅ Get password
                const password = $(post).find(".codeblock code").text().trim();

                if (link && password) {
                    const fileName = getFileName(link);

                    const line = `password for ${fileName} is ${password}`;
                    results.push(line);

                    console.log(`✅ ${line}`);
                }
            });

        } catch (error) {
            console.error(`❌ Failed page ${page}:`, error.message);
        }
    }

    // Save to file
    fs.writeFileSync(outputFile, results.join("\n"), "utf-8");
    console.log(`\n📁 Saved ${results.length} entries to ${outputFile}`);
}

// Start
scrapeData();