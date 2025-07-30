---
title: "WPA Leaders"
---

# WPA Leaders

Lifetime Win Probability Added leaders from games I've attended.

{{ $wpa_leaders := getJSON "data/game-log/wpa_leaders.json" }}

<table class="wpa-table">
    <thead>
        <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Lifetime WPA</th>
        </tr>
    </thead>
    <tbody>
        {{ range $index, $player := $wpa_leaders }}
        <tr>
            <td>{{ add $index 1 }}</td>
            <td class="{{ if gt .lifetime_wpa 0 }}highlight{{ end }}">{{ .batter_name }}</td>
            <td class="{{ if gt .lifetime_wpa 0 }}highlight{{ else }}negative{{ end }}">
                {{ if gt .lifetime_wpa 0 }}+{{ end }}{{ .lifetime_wpa }}
            </td>
        </tr>
        {{ end }}
    </tbody>
</table>

<style>
.negative {
    color: #ff6b6b;
}
</style>