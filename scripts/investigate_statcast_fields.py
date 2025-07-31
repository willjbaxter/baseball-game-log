#!/usr/bin/env python3
"""Investigate available fields in pybaseball Statcast data."""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pybaseball import statcast_single_game

def investigate_fields():
    # Use a recent game that should have good data
    game_pk = 746977  # From the database - BAL@BOS 2024-04-11
    
    print(f"🔍 Investigating Statcast fields for game {game_pk}...")
    
    try:
        df = statcast_single_game(game_pk)
        
        if df is None or df.empty:
            print("❌ No data returned")
            return
            
        print(f"✅ Got {len(df)} rows")
        print(f"📊 Available columns ({len(df.columns)}):")
        
        # Print all columns
        for i, col in enumerate(sorted(df.columns)):
            print(f"  {i+1:2d}. {col}")
        
        # Look for distance-related fields
        distance_cols = [col for col in df.columns if 'distance' in col.lower() or 'dist' in col.lower()]
        print(f"\n🎯 Distance-related columns: {distance_cols}")
        
        # Look for WPA-related fields  
        wpa_cols = [col for col in df.columns if 'wpa' in col.lower() or 'win' in col.lower() or 'prob' in col.lower()]
        print(f"📈 WPA-related columns: {wpa_cols}")
        
        # Show sample data for key fields
        key_fields = ['player_name', 'events', 'description', 'launch_speed', 'launch_angle'] + distance_cols + wpa_cols
        available_fields = [f for f in key_fields if f in df.columns]
        
        print("\n📋 Sample data for key fields:")
        sample_df = df[available_fields].dropna(subset=['launch_speed']).head(5)
        print(sample_df.to_string())
        
        # Check specifically for home runs with distance data
        hr_df = df[df['events'].str.contains('home_run', na=False) | df['description'].str.contains('Home Run', na=False)]
        if not hr_df.empty:
            print(f"\n🏠 Home run data ({len(hr_df)} HRs):")
            hr_sample = hr_df[available_fields].head(3)
            print(hr_sample.to_string())
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    investigate_fields()