# Metro Network Path Finder JS 

A JavaScript-based metro network modeling and shortest path query tool. Supports multiple lines, transfer penalty, loop lines, and dynamic station insertion.   
Uses Bidirectional BFS on the (station, current line) state space to find optimal routes with transfer cost.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Flexible Station & Line Model**: Stations can belong to multiple lines; lines can be marked as loops.
- **Convenient Network Construction**: `connectStations` method for batch connection with automatic bidirectional linking and line assignment.
- **Transfer Penalty Mechanism**: Transfers count as an extra station; the algorithm automatically selects the optimal transfer plan.
- **Clear Path Visualization**: Path output annotates transfer stations with line switches (e.g., `[Beijing East R2→R1]`).
- **Dynamic Station Operations**: Insert, delete, and pop stations on a line with automatic connection adjustments.
- **Robust Graph Algorithm**: State‑space Bidirectional BFS ensures efficiency and correctness.
- **Reliable Alias System**: Stations can have multiple aliases; line binding and display remain stable regardless of name changes.
## Files

- `MetroStation_zh.js` – Source code with Chinese comments
- `MetroStation.js` – Source code with English comments
- `README.md` – This document

## Core Classes & Methods

### `Station` Class

| Method | Description |
|------|------|
| `constructor(stationName)` | Create a station |
| `addLine(line)` | Add a line that this station belongs to |
| `static addConnectStation(a, b)` | Establish bidirectional adjacency |
| `goTo(targetStation)` | Find shortest path, returns array with `linePath` property |
| `pushName(alias) ` | Add a new alias and switch current name to it |
| `popName() ` | Remove the last alias and revert to the first name |
| `changeName(index) ` | Switch current name to the alias at the given index |
| `deleteName(index) ` | Delete the alias at the index (at least one remains) |
| `findName(name) ` | Find the index of a name, or -1 if not found |
| `getBoundNameForLine(line) ` | Get the bound name of the station on a specific line |
| `showNextStations() / showUpStations() ` | Print neighboring stations |

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
| `changeStationName(pastStation, newName) ` | Quickly change the bound name of a station on this line |

### Helper Functions

| Function | Description |
|------|------|
| `calcPathCost(path)` | Compute total cost (moves + transfers) |
| `printPathDetailed(path, start, target)` | Formatted output with transfer annotations |

---

```javascript
// Import (choose based on your environment)
import { Station, RailWay, printPathDetailed } from './MetroStation_zh.js';
// or: const { Station, RailWay, printPathDetailed } = require('./MetroStation_zh.js');

// Create stations
const S1 = new Station("Station A");
const S2 = new Station("Station B");
const S3 = new Station("Station C");
const S4 = new Station("Station D");

// Create lines
const L1 = new RailWay("L1");
const L2 = new RailWay("L2");

// Build network
L1.connectStations(S1, S2, S3);
L2.connectStations(S4, S2);   // S2 becomes transfer station

// Add alias to S2 (original name on L1 is "Station B")
S2.pushName("Transfer Hub");       // Current name becomes "Transfer Hub"
L1.showRailWayStations();          // Still shows bound name "Station B" on L1
L2.showRailWayStations();          // Shows "Station B" (bound when added to L2)

// Find path
const path = S1.goTo(S4);
printPathDetailed(path, S1, S4);
```

Example output:

```
===== L1 =====
Station A-[L1] → Station B-[L1, L2] → Station C-[L1], total 3 stations
===============
===== L2 =====
Station D-[L2] → Station B-[L1, L2], total 2 stations
===============
Path (from Station A to Station D, passing 2 stops, including 0 transfers):
    Station A → Transfer Hub
```

---

## Algorithm

Shortest path is computed using Dijkstra's algorithm on the state space (station, current line):

· Move: Travel to an adjacent station on the same line, cost +1
· Transfer: Switch to a different line at the same station, cost +1

This naturally incorporates transfer penalties into edge weights, guaranteeing the globally minimal cost path. Time complexity is O((V·L + E·L) log (V·L)), where V is the number of stations, L the number of lines, and E the number of physical connections. Performance is more than adequate for typical urban metro networks.

---

## Q&A

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

### Q9: What does the alias system do? Does it affect path calculation?

A: The alias system allows a station to display different names at different times (e.g., after real‑world renaming). It does not affect path calculation because the algorithm operates on object references. Line printing and path output use the bound name (the name at the time the station joined the line), ensuring display stays consistent despite alias changes.

### Q10: How can I restore a station's original name?

A: The very first name given at creation is always kept at index 0 in the alias list. Call changeName(0) or execute popName() until only one alias remains to restore the original name.

---

## Detailed Usage Guide

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

### 5. Managing Station Aliases

```javascript
const Xierqi = new Station("Xierqi");
Xierqi.pushName("Xierqi Station");      // Adds and switches to "Xierqi Station"
Xierqi.pushName("Xierqi Metro Stop");   // Adds another alias

console.log(Xierqi.getStationName());   // "Xierqi Metro Stop"
Xierqi.changeName(0);                   // Switch back to first name "Xierqi"
Xierqi.popName();                       // Remove last alias, revert to "Xierqi"
```

Use the alias system to give stations alternative display names without affecting the network structure. Line‑bound names (recorded when a station joins a line) remain unchanged unless changeStationName is explicitly called on the line.

Note: The bound name shown in showRailWayStations and path output always reflects the name at the time of joining. To change the bound name on a specific line, use RailWay.changeStationName(station, newName).

### 6. Finding the Shortest Path

Call the goTo(targetStation) method on the starting station.

```javascript
const path = BeijingNorth.goTo(BeijingWest);
printPathDetailed(path, BeijingNorth, BeijingWest);
```

Sample Output:

```
Path (from Beijing North to Beijing West, passing 3 stops, including 0 transfers):
    Beijing North → Beijing East → Beijing South → Beijing West
```

With a transfer, it appears as:

```
Path (from Heilongjiang to Beijing West, passing 5 stops, including 1 transfers):
    Heilongjiang → Beijing East → [Beijing East R2 - Beijing East R1] → Beijing Central → Beijing South → Beijing West
```

### 7. Line Maintenance Operations

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

### 8. Viewing Line Information

```javascript
R1.showRailWayStations();
```

Output:

```
===== Line 1 =====
Beijing North-[Line 1] → Beijing East-[Line 1, Line 2] → Beijing South-[Line 1] → Beijing West-[Line 1], total 4 stations
===============
```

The line display always uses the bound name, regardless of any alias changes.

### 9. Customizing Transfer Penalty Weight

To adjust the transfer cost, modify the newCost calculation in the transfer section of the goTo method.

```javascript
// Original: transfer cost is 1
const newCost = cost + 1;

// Change to a custom weight, e.g., transfer equals 3 stations
const TRANSFER_PENALTY = 3;
const newCost = cost + TRANSFER_PENALTY;
```

### 10. Obtaining Raw Path Data

The array returned by goTo has an attached linePath property, which can be used for custom display or export.

```javascript
const path = BeijingNorth.goTo(BeijingWest);
console.log(path);               // Array of stations
console.log(path.linePath);      // Corresponding line for each station
```

### 11. Complete Example (with aliases)

```javascript
import { Station, RailWay, printPathDetailed } from './MetroStation_zh.js';

const A = new Station("Station A");
const B = new Station("Station B");
const C = new Station("Station C");
const D = new Station("Station D");
const E = new Station("Station E");

const L1 = new RailWay("L1");
const L2 = new RailWay("L2");

L1.connectStations(A, B, C);
L2.connectStations(D, B, E);   // B is transfer

// Add alias to B
B.pushName("Transfer Hub");

const path = A.goTo(E);
printPathDetailed(path, A, E);

L1.showRailWayStations();
L2.showRailWayStations();
```

Expected output:

```
Path (from Station A to Station E, passing 3 stops, including 1 transfers):
    Station A → Transfer Hub → [Transfer Hub L1 - Transfer Hub L2] → Station E
===== L1 =====
Station A-[L1] → Station B-[L1, L2] → Station C-[L1], total 3 stations
===============
===== L2 =====
Station D-[L2] → Station B-[L1, L2] → Station E-[L2], total 3 stations
===============
```

---

## Notes

- Station names should ideally be unique to avoid confusion.
- Deleting a station may break a loop line; if needed, manually reconnect the ends.
- goTo returns null when the destination is unreachable; always check for null.
- For large networks (>1000 stations), consider reducing console logging to avoid clutter.

---

## If you want to improve this project (is there really anyone)
- My outlook email: hhhujiahao@outlook.com
- My QQ: 2943752793