---
title: "Attended Games"
---

# Attended Games ({{ len (getJSON "data/game-log/games.json") }})

{{ $games := getJSON "data/game-log/games.json" }}

<div class="filter-bar">
    <label>
        <select id="yearFilter">
            <option value="">All Years</option>
        </select>
    </label>
    <input type="text" id="teamFilter" placeholder="Filter by opponent">
</div>

<table class="games-table" id="gamesTable">
    <thead>
        <tr>
            <th>Date ↓</th>
            <th>Matchup 🔥</th>
            <th>Score 🔥</th>
            <th>Venue</th>
        </tr>
    </thead>
    <tbody>
        {{ range $games }}
        <tr data-year="{{ substr .date 0 4 }}" data-teams="{{ .away_team }}{{ .home_team }}">
            <td>{{ dateFormat "2006-01-02" .date }}</td>
            <td>{{ .away_team }} @ {{ .home_team }}</td>
            <td>{{ .away_score }}-{{ .home_score }}</td>
            <td>{{ .venue_name | default "Unknown" }}</td>
        </tr>
        {{ end }}
    </tbody>
</table>

<script>
// Simple filtering functionality
document.getElementById('yearFilter').addEventListener('change', filterTable);
document.getElementById('teamFilter').addEventListener('input', filterTable);

// Populate year filter
const years = [...new Set(Array.from(document.querySelectorAll('[data-year]')).map(row => row.dataset.year))].sort().reverse();
const yearSelect = document.getElementById('yearFilter');
years.forEach(year => {
    const option = document.createElement('option');
    option.value = option.textContent = year;
    yearSelect.appendChild(option);
});

function filterTable() {
    const yearFilter = document.getElementById('yearFilter').value;
    const teamFilter = document.getElementById('teamFilter').value.toUpperCase();
    const rows = document.querySelectorAll('#gamesTable tbody tr');
    
    rows.forEach(row => {
        const year = row.dataset.year;
        const teams = row.dataset.teams;
        const showYear = !yearFilter || year === yearFilter;
        const showTeam = !teamFilter || teams.includes(teamFilter);
        row.style.display = showYear && showTeam ? '' : 'none';
    });
}
</script>