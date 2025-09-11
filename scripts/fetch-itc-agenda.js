const fs = require('fs').promises;
const path = require('path');

async function fetchITCAgenda() {
  try {
    console.log('Fetching ITC Vegas 2025 agenda data...');
    
    // Try to fetch from the public API or website
    const baseUrl = 'https://vegas.insuretechconnect.com';
    
    // Common endpoints to try
    const endpoints = [
      '/api/agenda',
      '/api/sessions', 
      '/api/events',
      '/agenda',
      '/2025/agenda',
      '/itcvegas2025/app/home/network/event/agenda'
    ];
    
    let agendaData = null;
    
    for (const endpoint of endpoints) {
      try {
        const url = `${baseUrl}${endpoint}`;
        console.log(`Trying: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/html, */*'
          }
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          console.log(`Success! Content-Type: ${contentType}`);
          
          if (contentType && contentType.includes('application/json')) {
            agendaData = await response.json();
            console.log(`Found JSON data at ${url}`);
            break;
          } else {
            const text = await response.text();
            // Check if HTML contains structured data
            if (text.includes('session') || text.includes('agenda')) {
              console.log(`Found HTML with agenda content at ${url}`);
              // Save HTML for manual inspection
              await fs.writeFile(
                path.join(__dirname, '../data/imports/itc-page.html'),
                text
              );
            }
          }
        } else {
          console.log(`  Status: ${response.status}`);
        }
      } catch (error) {
        console.log(`  Error: ${error.message}`);
      }
    }
    
    if (agendaData) {
      // Save the fetched data
      await fs.writeFile(
        path.join(__dirname, '../data/imports/itc-agenda.json'),
        JSON.stringify(agendaData, null, 2)
      );
      console.log('Agenda data saved to data/imports/itc-agenda.json');
    } else {
      console.log('\nCould not fetch agenda data directly from the website.');
      console.log('The conference data might be behind authentication or loaded dynamically.');
      console.log('\nAlternative: Let me create a script where you can paste the agenda data manually.');
      
      // Create a template for manual data entry
      const template = {
        sessions: [
          {
            id: "example-1",
            title: "Opening Keynote",
            description: "Welcome to ITC Vegas 2025",
            day: 1,
            startTime: "2025-10-14T09:00:00",
            endTime: "2025-10-14T10:00:00",
            location: "Main Hall",
            track: "Keynote",
            speakers: [
              {
                name: "Speaker Name",
                role: "CEO",
                company: "Company Name"
              }
            ]
          }
        ]
      };
      
      await fs.writeFile(
        path.join(__dirname, '../data/imports/agenda-template.json'),
        JSON.stringify(template, null, 2)
      );
      
      console.log('\nCreated template at: data/imports/agenda-template.json');
      console.log('You can copy the agenda data from the website and paste it into this file.');
    }
    
  } catch (error) {
    console.error('Error fetching agenda:', error);
  }
}

fetchITCAgenda();