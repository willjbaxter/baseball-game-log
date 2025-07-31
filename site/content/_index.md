---
title: "Attended Games"
---

# Attended Games

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
    </tbody>
</table>

<script>
// Load games data and populate table
fetch('/games.json')
.then(response => response.json())
.then(games => {
    // Update title with count
    document.querySelector('h1').textContent = `Attended Games (${games.length})`;
    
    // Populate table
    const tbody = document.querySelector('#gamesTable tbody');
    games.forEach(game => {
        const row = document.createElement('tr');
        row.dataset.year = game.date.substring(0, 4);
        row.dataset.teams = game.away_team + game.home_team;
        
        row.innerHTML = `
            <td>${game.date}</td>
            <td>${game.away_team} @ ${game.home_team}</td>
            <td>${game.away_score}-${game.home_score}</td>
            <td>${game.venue_name || 'Unknown'}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Populate year filter
    const years = [...new Set(games.map(game => game.date.substring(0, 4)))].sort().reverse();
    const yearSelect = document.getElementById('yearFilter');
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = option.textContent = year;
        yearSelect.appendChild(option);
    });
})
.catch(error => {
    console.error('Error loading games data:', error);
    document.querySelector('#gamesTable tbody').innerHTML = '<tr><td colspan="4">Error loading data</td></tr>';
});

// Filter functionality
document.getElementById('yearFilter').addEventListener('change', filterTable);
document.getElementById('teamFilter').addEventListener('input', filterTable);

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