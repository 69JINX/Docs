const fs = require('fs');
const path = require('path');

function directoryToJSON(dirPath) {
  const stats = fs.statSync(dirPath);
  const info = {
    name: path.basename(dirPath),
    type: stats.isDirectory() ? 'folder' : 'file',
  };

  if (stats.isDirectory()) {
    info.children = fs.readdirSync(dirPath).map(child => {
      return directoryToJSON(path.join(dirPath, child));
    });
  }

  return info;
}

// Specify the directory you want to convert
const targetDir = 'D:\\Avinash\\found.000(3)_0\\dir0006.chk'; 
// Make sure this path exists relative to where you run the command.

try {
  const jsonStructure = directoryToJSON(targetDir);
  const jsonString = JSON.stringify(jsonStructure, null, 2);
  fs.writeFileSync('output1.json', jsonString);
  console.log('Successfully converted directory to JSON and saved to output.json');
} catch (err) {
  console.error('Error:', err.message);
}
