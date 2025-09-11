const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function extractPDFData() {
  try {
    const pdfPath = path.join(__dirname, '../data/imports/screencapture-networking-insuretechconnect-itcvegas2025-app-home-network-event-agenda-2025-09-11-19_07_44.pdf');
    
    console.log('Reading PDF file...');
    const dataBuffer = fs.readFileSync(pdfPath);
    
    console.log('Parsing PDF content...');
    const data = await pdf(dataBuffer);
    
    // Save raw text to file for analysis
    const outputPath = path.join(__dirname, '../data/imports/pdf-content.txt');
    fs.writeFileSync(outputPath, data.text);
    
    console.log('PDF extraction complete!');
    console.log(`Total pages: ${data.numpages}`);
    console.log(`Total text length: ${data.text.length} characters`);
    console.log(`Content saved to: ${outputPath}`);
    
    // Extract first 5000 characters to analyze structure
    console.log('\n=== First 5000 characters of content ===\n');
    console.log(data.text.substring(0, 5000));
    
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF:', error);
    process.exit(1);
  }
}

extractPDFData();