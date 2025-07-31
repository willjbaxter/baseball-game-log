---
title: "Longest Home Runs"
---

# Longest Home Runs

<div class="filter-bar">
    <label>
        <select id="yearFilter">
            <option value="">All Years</option>
        </select>
    </label>
</div>

<table class="homers-table" id="homersTable">
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
        row.dataset.year = homer.date.substring(0, 4);
        
        const formattedDate = new Date(homer.date).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric', 
            year: 'numeric'
        });
        
        row.innerHTML = `
            <td class="highlight">${homer.distance}ft</td>
            <td>${homer.launch_speed}mph</td>
            <td>${homer.launch_angle}°</td>
            <td class="home-run">${homer.batter_name}</td>
            <td>${formattedDate}</td>
            <td>${homer.away_team} @ ${homer.home_team}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Populate year filter
    const years = [...new Set(homers.map(homer => homer.date.substring(0, 4)))].sort().reverse();
    const yearSelect = document.getElementById('yearFilter');
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = option.textContent = year;
        yearSelect.appendChild(option);
    });
})
.catch(error => {
    console.error('Error loading longest homers data:', error);
    document.querySelector('.homers-table tbody').innerHTML = '<tr><td colspan="6">Error loading data</td></tr>';
});

// Filter functionality
document.getElementById('yearFilter').addEventListener('change', function() {
    const yearFilter = this.value;
    const rows = document.querySelectorAll('#homersTable tbody tr');
    
    rows.forEach(row => {
        const year = row.dataset.year;
        const showYear = !yearFilter || year === yearFilter;
        row.style.display = showYear ? '' : 'none';
    });
});
</script>