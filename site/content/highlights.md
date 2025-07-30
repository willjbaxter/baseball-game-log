---
title: "Highlights"
---

# Highlights

Coming soon: Video highlights and memorable moments from games I've attended.

{{ $games := getJSON "data/game-log/games.json" }}
{{ $homers := getJSON "data/game-log/longest_homers.json" }}

<div class="stats-grid">
    <div class="stat-card">
        <h3>Games Attended</h3>
        <p style="font-size: 2em; font-weight: bold;">{{ len $games }}</p>
    </div>
    
    <div class="stat-card">
        <h3>Home Runs Witnessed</h3>
        <p style="font-size: 2em; font-weight: bold;">{{ len $homers }}</p>
    </div>
    
    <div class="stat-card">
        <h3>Longest HR</h3>
        {{ with index $homers 0 }}
        <p style="font-size: 2em; font-weight: bold;">{{ .distance }}ft</p>
        <p>{{ .batter_name }} - {{ dateFormat "2006-01-02" .date }}</p>
        {{ end }}
    </div>
    
    <div class="stat-card">
        <h3>Most Recent Game</h3>
        {{ with index $games 0 }}
        <p style="font-size: 1.5em; font-weight: bold;">{{ .away_team }} @ {{ .home_team }}</p>
        <p>{{ dateFormat "2006-01-02" .date }} - {{ .away_score }}-{{ .home_score }}</p>
        {{ end }}
    </div>
</div>