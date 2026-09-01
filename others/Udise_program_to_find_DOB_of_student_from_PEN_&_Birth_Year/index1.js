const { chromium } = require('playwright');

const SCHOOL_ID = '1818033';
const STUDENT_PEN = '22795154055';
const DOB = '01/01/2020';

const API_URL =
    `https://sdms.udiseplus.gov.in/p2/api/students/import/search/${SCHOOL_ID}`;

async function main() {
    const browser = await chromium.launch({
        headless: false
    });

    const context = await browser.newContext();

    const page = await context.newPage();

    console.log('Opening UDISE+ login...');

    await page.goto(
        'https://sdms.udiseplus.gov.in/p2/v1/login',
        { waitUntil: 'domcontentloaded' }
    );

    console.log('\nLog in to UDISE+ in the browser.');
    console.log('After login is complete, press ENTER here...\n');

    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });

    // Playwright automatically has the authenticated cookies
    // from the browser session.
    const response = await context.request.post(API_URL, {
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },

        data: {
            searchType: 1,
            studentCodeNat: STUDENT_PEN,
            dob: DOB,
            uuid: ''
        }
    });

    console.log('HTTP status:', response.status());

    const data = await response.json();

    console.log(
        JSON.stringify(data, null, 2)
    );

    await browser.close();
}

main().catch(error => {
    console.error('Fatal error:', error);
});