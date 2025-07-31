---
title: "Longest Home Runs"
---

# Longest Home Runs

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
    </tbody>
</table>

<script>
fetch('/longest_homers.json')
.then(response => response.json())
.then(homers => {
    const tbody = document.querySelector('.homers-table tbody');
    homers.forEach(homer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="highlight">${homer.distance}ft</td>
            <td>${homer.launch_speed}mph</td>
            <td>${homer.launch_angle}°</td>
            <td class="home-run">${homer.batter_name}</td>
            <td>${homer.date}</td>
            <td>${homer.away_team} @ ${homer.home_team}</td>
        `;
        tbody.appendChild(row);
    });
})
.catch(error => {
    console.error('Error loading longest homers data:', error);
    document.querySelector('.homers-table tbody').innerHTML = '<tr><td colspan="6">Error loading data</td></tr>';
});
</script>