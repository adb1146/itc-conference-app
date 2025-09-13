#!/usr/bin/env python3
"""
Extract conference data from JSON export to CSV files for database import.
Generates three CSV files: sessions.csv, speakers.csv, and session_speakers.csv
"""

import json
import csv
import os
from datetime import datetime

def load_json_data(filepath):
    """Load JSON data from file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_csv(filename, data, fieldnames):
    """Write data to CSV file with given fieldnames"""
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    print(f"✓ Created {filename} with {len(data)} records")

def extract_sessions(data):
    """Extract session data for CSV export"""
    sessions = []
    for session in data['data']['sessions']:
        sessions.append({
            'id': session['id'],
            'title': session['title'],
            'description': session.get('description', ''),
            'startTime': session['startTime'],
            'endTime': session['endTime'],
            'location': session.get('location', ''),
            'track': session.get('track', ''),
            'level': session.get('level', ''),
            'tags': '|'.join(session.get('tags', [])) if session.get('tags') else '',
            'sourceUrl': session.get('sourceUrl', ''),
            'lastUpdated': session.get('lastUpdated', ''),
            'createdAt': session['createdAt']
        })
    return sessions

def extract_speakers(data):
    """Extract speaker data for CSV export"""
    speakers = []
    for speaker in data['data']['speakers']:
        speakers.append({
            'id': speaker['id'],
            'name': speaker['name'],
            'bio': speaker.get('bio', ''),
            'company': speaker.get('company', ''),
            'role': speaker.get('role', ''),
            'imageUrl': speaker.get('imageUrl', ''),
            'linkedinUrl': speaker.get('linkedinUrl', ''),
            'twitterUrl': speaker.get('twitterUrl', ''),
            'websiteUrl': speaker.get('websiteUrl', ''),
            'profileSummary': speaker.get('profileSummary', ''),
            'companyProfile': speaker.get('companyProfile', ''),
            'expertise': '|'.join(speaker.get('expertise', [])) if speaker.get('expertise') else '',
            'achievements': '|'.join(speaker.get('achievements', [])) if speaker.get('achievements') else '',
            'lastProfileSync': speaker.get('lastProfileSync', ''),
            'createdAt': speaker['createdAt']
        })
    return speakers

def extract_session_speakers(data):
    """Extract session-speaker relationships for CSV export"""
    relationships = []
    for rel in data['data']['sessionSpeakers']:
        relationships.append({
            'sessionId': rel['sessionId'],
            'speakerId': rel['speakerId']
        })
    return relationships

def main():
    """Main extraction function"""
    print("Starting data extraction from JSON to CSV...")
    print("-" * 50)

    # Define file paths
    json_file = '/Users/andrewbartels/Projects/my-itcAI-project/itc-conference-app/itc-conference-app/data/exports/latest-export.json'
    output_dir = '/Users/andrewbartels/Projects/my-itcAI-project/itc-conference-app/itc-conference-app/data/csv_exports'

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Load JSON data
    print(f"Loading data from {json_file}...")
    data = load_json_data(json_file)

    # Print metadata
    metadata = data['metadata']
    print(f"\nData export metadata:")
    print(f"  Exported at: {metadata['exportedAt']}")
    print(f"  Sessions: {metadata['counts']['sessions']}")
    print(f"  Speakers: {metadata['counts']['speakers']}")
    print(f"  Session-Speaker relationships: {metadata['counts']['sessionSpeakers']}")
    print()

    # Extract and save sessions
    sessions = extract_sessions(data)
    session_fields = ['id', 'title', 'description', 'startTime', 'endTime',
                      'location', 'track', 'level', 'tags', 'sourceUrl',
                      'lastUpdated', 'createdAt']
    write_csv(os.path.join(output_dir, 'sessions.csv'), sessions, session_fields)

    # Extract and save speakers
    speakers = extract_speakers(data)
    speaker_fields = ['id', 'name', 'bio', 'company', 'role', 'imageUrl',
                      'linkedinUrl', 'twitterUrl', 'websiteUrl', 'profileSummary',
                      'companyProfile', 'expertise', 'achievements',
                      'lastProfileSync', 'createdAt']
    write_csv(os.path.join(output_dir, 'speakers.csv'), speakers, speaker_fields)

    # Extract and save session-speaker relationships
    relationships = extract_session_speakers(data)
    relationship_fields = ['sessionId', 'speakerId']
    write_csv(os.path.join(output_dir, 'session_speakers.csv'), relationships, relationship_fields)

    print("\n" + "=" * 50)
    print("✅ Data extraction complete!")
    print(f"CSV files saved to: {output_dir}")
    print("\nYou can now import these files into your database using:")
    print("  - sessions.csv → Session table")
    print("  - speakers.csv → Speaker table")
    print("  - session_speakers.csv → SessionSpeaker junction table")

if __name__ == "__main__":
    main()