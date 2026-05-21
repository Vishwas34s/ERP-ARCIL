const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/purchase-orders/page.tsx');

// Read the file
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Filter out lines containing Printer or FileDown buttons
const filteredLines = lines.filter(line => {
  // Remove lines with Printer or FileDown button
  if (line.includes('Printer') || line.includes('FileDown')) {
    console.log('Removing line:', line.trim());
    return false;
  }
  return true;
});

// Join lines back together
const newContent = filteredLines.join('\n');

// Write the file
fs.writeFileSync(filePath, newContent, 'utf-8');

console.log('\n✓ File updated successfully');
console.log(`Removed lines containing Printer and FileDown buttons`);
