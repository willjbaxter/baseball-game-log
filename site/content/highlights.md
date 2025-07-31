---
title: "Highlights"
---

# Highlights

Coming soon: Video highlights and memorable moments from games I've attended.

<div class="stats-grid">
    <div class="stat-card">
        <h3>Games Attended</h3>
        <p style="font-size: 2em; font-weight: bold;" id="gamesCount">-</p>
    </div>
    
    <div class="stat-card">
        <h3>Home Runs Witnessed</h3>
        <p style="font-size: 2em; font-weight: bold;" id="homersCount">-</p>
    </div>
    
    <div class="stat-card">
        <h3>Longest HR</h3>
        <p style="font-size: 2em; font-weight: bold;" id="longestDistance">-</p>
        <p id="longestDetails">-</p>
    </div>
    
    <div class="stat-card">
        <h3>Most Recent Game</h3>
        <p style="font-size: 1.5em; font-weight: bold;" id="recentMatchup">-</p>
        <p id="recentDetails">-</p>
    </div>
</div>

<script>
Promise.all([
    fetch('/games.json').then(r => r.json()),
    fetch('/longest_homers.json').then(r => r.json())
])
.then(([games, homers]) => {
    // Games attended
    document.getElementById('gamesCount').textContent = games.length;
    
    // Home runs witnessed
    document.getElementById('homersCount').textContent = homers.length;
    
    // Longest HR
    if (homers.length > 0) {
        const longest = homers[0];
        document.getElementById('longestDistance').textContent = `${longest.distance}ft`;
        document.getElementById('longestDetails').textContent = `${longest.batter_name} - ${longest.date}`;
    }
    
    // Most recent game
    if (games.length > 0) {
        const recent = games[0];
        document.getElementById('recentMatchup').textContent = `${recent.away_team} @ ${recent.home_team}`;
        document.getElementById('recentDetails').textContent = `${recent.date} - ${recent.away_score}-${recent.home_score}`;
    }
})
.catch(error => {
    console.error('Error loading highlights data:', error);
    document.querySelectorAll('.stat-card p').forEach(p => {
        if (p.textContent === '-') p.textContent = 'Error';
    });
});
</script>