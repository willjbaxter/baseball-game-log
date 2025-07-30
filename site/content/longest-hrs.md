---
title: "Longest Home Runs"
---

# Longest Home Runs

{{ $homers := getJSON "data/game-log/longest_homers.json" }}

<table class="homers-table">
    <thead>
        <tr>
            <th>Distance</th>
            <th>Launch Speed</th>
            <th>Launch Angle</th>
            <th>Batter</th>
            <th>Date</th>
            <th>Matchup</th>
        </tr>
    </thead>
    <tbody>
        {{ range $homers }}
        <tr>
            <td class="highlight">{{ .distance }}ft</td>
            <td>{{ .launch_speed }}mph</td>
            <td>{{ .launch_angle }}°</td>
            <td class="home-run">{{ .batter_name }}</td>
            <td>{{ dateFormat "2006-01-02" .date }}</td>
            <td>{{ .away_team }} @ {{ .home_team }}</td>
        </tr>
        {{ end }}
    </tbody>
</table>