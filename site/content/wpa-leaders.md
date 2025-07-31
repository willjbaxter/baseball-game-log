---
title: "WPA Leaders"
---

# WPA Leaders

Lifetime Win Probability Added leaders from games I've attended.

<table class="wpa-table">
    <thead>
        <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Lifetime WPA</th>
        </tr>
    </thead>
    <tbody>
    </tbody>
</table>

<style>
.negative {
    color: #ff6b6b;
}
</style>

<script>
fetch('/wpa_leaders.json')
.then(response => response.json())
.then(wpaLeaders => {
    const tbody = document.querySelector('.wpa-table tbody');
    wpaLeaders.forEach((player, index) => {
        const row = document.createElement('tr');
        const wpaClass = player.lifetime_wpa > 0 ? 'highlight' : 'negative';
        const wpaSign = player.lifetime_wpa > 0 ? '+' : '';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="${player.lifetime_wpa > 0 ? 'highlight' : ''}">${player.batter_name}</td>
            <td class="${wpaClass}">
                ${wpaSign}${player.lifetime_wpa}
            </td>
        `;
        tbody.appendChild(row);
    });
})
.catch(error => {
    console.error('Error loading WPA leaders data:', error);
    document.querySelector('.wpa-table tbody').innerHTML = '<tr><td colspan="3">Error loading data</td></tr>';
});
</script>