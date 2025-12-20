const fs = require('fs');
const path = require('path');

function createDirectoryFromJSON(dirPath, json) {
  if (json.type === 'folder') {
    fs.mkdirSync(dirPath, { recursive: true });
    if (json.children) {
      json.children.forEach(child => {
        createDirectoryFromJSON(path.join(dirPath, child.name), child);
      });
    }
  } else if (json.type === 'file') {
    // Creates an empty file. Add an '-content' key in the JSON to include content.
    fs.writeFileSync(dirPath, ''); 
  }
}

// Specify the JSON file and the target directory for creation
const jsonFile = './output1.json';
const targetDir = './recreated-project-folder';

try {
  const jsonStructure = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  createDirectoryFromJSON(targetDir, jsonStructure);
  console.log(`Successfully created directory structure in ${targetDir}`);
} catch (err) {
  console.error('Error:', err.message);
}
