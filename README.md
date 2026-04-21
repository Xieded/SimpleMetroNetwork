# 🚇 Metro Network Path Finder

A JavaScript-based metro network modeling and shortest path query tool. Supports multiple lines, transfer penalty, loop lines, and dynamic station insertion. Uses **Dijkstra's algorithm** on the `(station, current line)` state space to find optimal routes with transfer cost.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **Flexible Station & Line Model**: Stations can belong to multiple lines; lines can be marked as loops.
- **Convenient Network Construction**: `connectStations` method for batch connection with automatic bidirectional linking and line assignment.
- **Transfer Penalty Mechanism**: Transfers count as an extra station; the algorithm automatically selects the optimal transfer plan.
- **Clear Path Visualization**: Path output annotates transfer stations with line switches (e.g., `[Beijing East R2→R1]`).
- **Dynamic Station Operations**: Insert, delete, and pop stations on a line with automatic connection adjustments.
- **Robust Graph Algorithm**: State‑space Dijkstra ensures efficiency and correctness.

## 📁 Files

- `metro_network_zh.js` – Source code with Chinese comments
- `metro_network_en.js` – Source code with English comments
- `README.md` – This document

## 🧱 Core Classes & Methods

### `Station` Class

| Method | Description |
|------|------|
| `constructor(stationName)` | Create a station |
| `addLine(line)` | Add a line that this station belongs to |
| `static addConnectStation(a, b)` | Establish bidirectional adjacency |
| `goTo(targetStation)` | Find shortest path, returns array with `linePath` property |

### `RailWay` Class

| Method | Description |
|------|------|
| `constructor(lineName, isLoop)` | Create a line, optionally a loop |
| `connectStations(...stations)` | Batch add and connect stations |
| `pushStation(station)` | Add station to line list (no connection) |
| `popStation()` | Remove and return the last station |
| `deleteStation(station)` | Remove a station and reconnect its neighbors |
| `insertStation(from, insert)` | Insert a new station after `from` on the same line |
| `showRailWayStations()` | Print ordered station list with line info |

### Helper Functions

| Function | Description |
|------|------|
| `calcPathCost(path)` | Compute total cost (moves + transfers) |
| `printPathDetailed(path, start, target)` | Formatted output with transfer annotations |

---

## 🚀 Quick Start

```javascript
// Create stations
const BeijingSouth = new Station("Beijing South");
const BeijingNorth = new Station("Beijing North");
const BeijingWest = new Station("Beijing West");
const BeijingEast = new Station("Beijing East");
const BeijingCentral = new Station("Beijing Central");

// Create lines
const R1 = new RailWay("R1");
const R2 = new RailWay("R2");

// Batch connect stations
R1.connectStations(BeijingNorth, BeijingEast, BeijingSouth, BeijingWest);
R2.connectStations(ShanghaiNorth, ShanghaiSouth, ShanghaiWest, BeijingEast, Heilongjiang);

// Insert BeijingCentral between BeijingEast and BeijingSouth on R1
R1.insertStation(BeijingEast, BeijingCentral);

// Display line info
R1.showRailWayStations();

// Find and print path
const path = Heilongjiang.goTo(BeijingWest);
printPathDetailed(path, Heilongjiang, BeijingWest);

```

---

## 🧠 Algorithm

Shortest path is computed using Dijkstra's algorithm on the state space (station, current line):

· Move: Travel to an adjacent station on the same line, cost +1
· Transfer: Switch to a different line at the same station, cost +1

This naturally incorporates transfer penalties into edge weights, guaranteeing the globally minimal cost path. Time complexity is O((V·L + E·L) log (V·L)), where V is the number of stations, L the number of lines, and E the number of physical connections. Performance is more than adequate for typical urban metro networks.

---

## ❓ Q&A

### Q1: Why does the transfer count show as 0 in the output?

A: Ensure you are using the latest goTo method and that printPathDetailed does not compress consecutive duplicate stations. The current code retains duplicates to correctly count transfers.

### Q2: How do I create a loop line?

A: Pass true as the second argument to the RailWay constructor, or use setIsLoop(true). When you call connectStations, the ends will be automatically connected. For manual construction, explicitly connect the last and first stations.

### Q3: Will deleting a station break the line?

A: No. deleteStation automatically connects the previous and next stations on the same line, preserving continuity. If the line was a loop, it may become non-loop after deletion.

### Q4: Are multi‑line transfer stations supported?

A: Yes. A station can be added to multiple lines via addLine. The algorithm considers all possible transfers.

### Q5: Does the algorithm explore all possible paths? Is it slow?

A: Dijkstra's algorithm guarantees the optimal solution for non‑negative weights. For networks with hundreds of stations, execution time is typically a few milliseconds. For extremely large graphs (e.g., national rail networks), A* could be considered, but the current implementation is sufficient for metro use.

### Q6: Can I export the path as JSON or another format?

A: goTo returns an array of stations with an attached linePath property. You can easily serialize it:

```javascript
const path = Heilongjiang.goTo(BeijingWest);
console.log(JSON.stringify(path.map(s => s.getStationName())));
```

### Q7: Can I set different penalty weights for different lines?

A: Currently the transfer penalty is fixed at 1. To customize, modify the newCost = cost + yourWeight line in the transfer section of goTo. Future versions may support configuration.

### Q8: How can I use this in a browser?

A: The code uses ES6 syntax and can be included directly via a script tag or as a module. Ensure your target browsers support modern JavaScript.

---

## 📖 Detailed Usage Guide

### 1. Installation & Import

The system is written in pure JavaScript with no external dependencies. Both ES6 modules and CommonJS are supported.

#### ES6 Module (Recommended)

Ensure "type": "module" is set in package.json, or use the .mjs extension.

```javascript
import { Station, RailWay, printPathDetailed } from './MetroStation_en.js';
```

#### CommonJS (Node.js)

```javascript
const { Station, RailWay, printPathDetailed } = require('./MetroStation_en.js');
```

### 2. Creating Stations and Lines

#### Create Stations

```javascript
const BeijingSouth = new Station("Beijing South");
const BeijingNorth = new Station("Beijing North");
const BeijingWest = new Station("Beijing West");
```

#### Create Lines

```javascript
const R1 = new RailWay("Line 1");          // Regular line
const R2 = new RailWay("Line 2", true);    // Loop line
```

### 3. Building the Network

#### Method 1: Batch Connection with connectStations

```javascript
R1.connectStations(BeijingNorth, BeijingEast, BeijingSouth, BeijingWest);
// Automatically adds stations to the line and creates bidirectional connections in order
```

#### Method 2: Manual Addition and Connection

```javascript
R1.pushStation(BeijingNorth);
R1.pushStation(BeijingEast);
Station.addConnectStation(BeijingNorth, BeijingEast);
```

### 4. Setting Up Transfer Stations

Simply add a station to multiple lines to make it a transfer station.

```javascript
const Chegongmiao = new Station("Chegongmiao");
R1.pushStation(Chegongmiao);
R2.pushStation(Chegongmiao);   // Automatically becomes a transfer station
```

### 5. Finding the Shortest Path

Call the goTo(targetStation) method on the starting station.

```javascript
const path = BeijingNorth.goTo(BeijingWest);
printPathDetailed(path, BeijingNorth, BeijingWest);
```

Sample Output:

```
Path (cost 3, transfers 0): Beijing North → Beijing East → Beijing South → Beijing West
```

With a transfer, it appears as:

```
Path (cost 5, transfers 1): Heilongjiang → Beijing East → [Beijing East R2→R1] → Beijing Central → Beijing South → Beijing West
```

### 6. Line Maintenance Operations

#### Insert a Station

```javascript
const BeijingCentral = new Station("Beijing Central");
R1.insertStation(BeijingEast, BeijingCentral);   // Inserts BeijingCentral between BeijingEast and its next station
```

#### Delete a Station

```javascript
R1.deleteStation(BeijingSouth);   // Automatically reconnects adjacent stations
```

#### Pop the Last Station

```javascript
const last = R1.popStation();
console.log(`Removed station: ${last.getStationName()}`);
```

### 7. Viewing Line Information

```javascript
R1.showRailWayStations();
```

Output:

```
===== Line 1 =====
Beijing North-[Line 1] → Beijing East-[Line 1, Line 2] → Beijing South-[Line 1] → Beijing West-[Line 1], total 4 stations
===============
```

### 8. Customizing Transfer Penalty Weight

To adjust the transfer cost, modify the newCost calculation in the transfer section of the goTo method.

```javascript
// Original: transfer cost is 1
const newCost = cost + 1;

// Change to a custom weight, e.g., transfer equals 3 stations
const TRANSFER_PENALTY = 3;
const newCost = cost + TRANSFER_PENALTY;
```

### 9. Obtaining Raw Path Data

The array returned by goTo has an attached linePath property, which can be used for custom display or export.

```javascript
const path = BeijingNorth.goTo(BeijingWest);
console.log(path);               // Array of stations
console.log(path.linePath);      // Corresponding line for each station
```

### 10. Complete Example

A full example including a transfer:

```javascript
import { Station, RailWay, printPathDetailed } from './MetroStation_en.js';

// Create stations
const A = new Station("Station A");
const B = new Station("Station B");
const C = new Station("Station C");
const D = new Station("Station D");
const E = new Station("Station E");

// Create lines
const L1 = new RailWay("L1");
const L2 = new RailWay("L2");

// Connect L1: A - B - C
L1.connectStations(A, B, C);

// Connect L2: D - B - E
L2.connectStations(D, B, E);

// Find path: A to E
const path = A.goTo(E);
printPathDetailed(path, A, E);
```

Expected output:

```
Path (cost 3, transfers 1): Station A → Station B → [Station B L1→L2] → Station E
```

---

## ⚠️ Notes

· Station names should ideally be unique to avoid confusion.
· Deleting a station may break a loop line; if needed, manually reconnect the ends.
· goTo returns null when the destination is unreachable; always check for null.
· For large networks (>1000 stations), consider reducing console logging to avoid clutter.

---

