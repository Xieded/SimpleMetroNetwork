/**
 * Metro Network Path Finding System
 * 
 * Features:
 * - Create stations and lines
 * - Establish bidirectional connections between stations (supports loops and transfers)
 * - Insert, delete, and pop stations
 * - Shortest path search with transfer penalty (Dijkstra's algorithm on state space (station, current line))
 * - Visualize line and path information, marking line switches at transfer points
 * 
 * Author: Xieds
 * Version: 1.0.0
 */

/**
 * Check if a value is null or undefined
 * @param {*} value - The value to check
 * @param {string} [paramName='parameter'] - Parameter name for error message
 * @returns {boolean} - Always returns true if no error is thrown
 * @throws {Error} When value is undefined or null
 */
const checkIsNone = (value, paramName = 'parameter') => {
    // Throw an error if value is undefined or null
    if (value === undefined || value === null) {
        throw new Error(`${paramName} cannot be empty`);
    }
    return true;
};

/**
 * Calculate the actual cost of a path (number of physical moves + number of transfers)
 * @param {Station[]} path - Array of stations (may contain consecutive duplicates indicating transfers)
 * @returns {number} Total cost (each step, whether move or transfer, counts as 1)
 */
function calcPathCost(path) {
    // Cost is 0 for invalid or too short paths
    if (!path || path.length < 2) return 0;
    let cost = 0;
    // Iterate through each adjacent pair in the path
    for (let i = 0; i < path.length - 1; i++) {
        // Each step (move or transfer) costs 1
        cost += 1;
    }
    return cost;
}

/**
 * Print a formatted path with cost, transfer count, and transfer annotations.
 * @param {Station[]|null} path - Path array returned by goTo method, with linePath property attached
 * @param {Station} start - Starting station
 * @param {Station} target - Target station
 */
function printPathDetailed(path, start, target) {
    // Parameter validation
    checkIsNone(path, "path");
    checkIsNone(start, "start station");
    checkIsNone(target, "target station");
    
    // If path is null, output unreachable message
    if (!path) {
        console.log(`${start.getStationName()} → ${target.getStationName()} : Unreachable`);
        return;
    }
    
    // Retrieve line information attached to the path
    const linePath = path.linePath || [];
    const displayNames = [];
    let cost = 0;
    let transfers = 0;
    
    // Build display strings
    for (let i = 0; i < path.length; i++) {
        const station = path[i];
        const line = linePath[i];
        
        // Detect transfer: two consecutive identical station objects
        if (i > 0 && path[i] === path[i-1]) {
            transfers++;
            cost++;
            const prevLine = linePath[i-1];
            const currLine = linePath[i];
            // Show transfer info, e.g., [Chegongmiao Line1→Line11]
            displayNames.push(`[${station.getStationName()} ${prevLine?.getLineName()}→${currLine?.getLineName()}]`);
        } else {
            if (i > 0) cost++;
            displayNames.push(station.getStationName());
        }
    }
    
    // Output final result
    console.log(`Path (cost ${cost}, transfers ${transfers}): ${displayNames.join(" → ")}`);
}

/**
 * Min-heap (priority queue) for efficiently retrieving the state with minimum cost in Dijkstra's algorithm
 */
class MinHeap {
    /**
     * @param {Function} [compare] - Comparison function, returns negative if a precedes b, default ascending
     */
    constructor(compare) {
        this.heap = [];
        this.compare = compare || ((a, b) => a - b);
    }

    /** Push an element into the heap */
    push(value) {
        this.heap.push(value);
        this.#siftUp(this.heap.length - 1);
    }

    /** Pop the top element from the heap */
    pop() {
        if (this.heap.length === 0) return null;
        const top = this.heap[0];
        const bottom = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = bottom;
            this.#siftDown(0);
        }
        return top;
    }

    /** Check if the heap is empty */
    isEmpty() {
        return this.heap.length === 0;
    }

    /** Sift up to maintain heap property */
    #siftUp(index) {
        while (index > 0) {
            const parent = (index - 1) >> 1;
            if (this.compare(this.heap[index], this.heap[parent]) < 0) {
                [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
                index = parent;
            } else break;
        }
    }

    /** Sift down to maintain heap property */
    #siftDown(index) {
        const n = this.heap.length;
        while (true) {
            let left = index * 2 + 1;
            let right = left + 1;
            let smallest = index;
            if (left < n && this.compare(this.heap[left], this.heap[smallest]) < 0) smallest = left;
            if (right < n && this.compare(this.heap[right], this.heap[smallest]) < 0) smallest = right;
            if (smallest !== index) {
                [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
                index = smallest;
            } else break;
        }
    }
}

/**
 * Station class
 * Each station has a name, lists of next/previous stations, and lines it belongs to.
 */
class Station {
    /**
     * Create a station
     * @param {string} stationName - Station name
     */
    constructor(stationName) {
        checkIsNone(stationName, "station name");
        this.#stationName = stationName;
    }

    // Private fields
    #stationName = undefined;       // Station name
    #isStartEnd = false;            // Flag for being a line endpoint (used in some special logic)
    #nextStations = [];             // List of next stations (outbound direction)
    #upStations = [];               // List of previous stations (inbound direction)
    #connectWays = [];              // List of lines this station belongs to

    // Public accessors
    getStationName() { return this.#stationName; }
    getNextStations() { return this.#nextStations; }
    getConnectWay() { return this.#connectWays; }
    getUpStations() { return this.#upStations; }
    getIsStartEnd() { return this.#isStartEnd; }

    /** Toggle the endpoint flag */
    rollIsStartEnd() {
        this.#isStartEnd = !this.#isStartEnd;
    }

    /**
     * Static method: establish a bidirectional connection between two stations.
     * stationF's next stations will include stationS, and vice versa.
     * @param {Station} stationF - Preceding station
     * @param {Station} stationS - Following station
     * @returns {boolean} Success status
     */
    static addConnectStation(stationF, stationS) {
        if (!stationF || !stationS) return false;
        stationF.#addStationNext(stationS);
        stationS.#addStationUp(stationF);
        return true;
    }

    /**
     * Instance method: set both next and previous stations for the current station (for special scenarios)
     * @param {Station} stationN - Next station
     * @param {Station} staionU - Previous station
     */
    addOwnConnectStation(stationN, staionU) {
        this.#addStationNext(stationN);
        this.#addStationUp(staionU);
    }

    /**
     * Private method: add a next station (unidirectional)
     * @param {Station} station - The next station to add
     * @returns {boolean} Success status
     */
    #addStationNext(station) {
        if (this.#nextStations.includes(station)) return false;
        if (station == undefined) return false;
        this.#nextStations.push(station);
        console.log(`Added ${station.getStationName()} as next station of ${this.getStationName()}`);
        return true;
    }

    /**
     * Private method: add a previous station (unidirectional)
     * @param {Station} station - The previous station to add
     * @returns {boolean} Success status
     */
    #addStationUp(station) {
        if (this.#upStations.includes(station)) return false;
        if (station == undefined) return false;
        this.#upStations.push(station);
        console.log(`Added ${station.getStationName()} as previous station of ${this.getStationName()}`);
        return true;
    }

    /**
     * Add a line to the station's list of lines (does not create inter-station connections)
     * @param {RailWay} line - Line instance
     * @returns {boolean} Success status
     */
    addLine(line) {
        if (this.#connectWays.includes(line)) return false;
        this.#connectWays.push(line);
        return true;
    }

    /** Print all next stations of this station */
    showNextStations() {
        console.log("======= Next stations of " + this.#stationName + " ======");
        for (let s of this.getNextStations()) {
            console.log(s.getStationName());
        }
        console.log("==================================");
    }

    /** Print all previous stations of this station */
    showUpStations() {
        console.log("======= Previous stations of " + this.#stationName + " ======");
        for (let s of this.getUpStations()) {
            console.log(s.getStationName());
        }
        console.log("==================================");
    }

    /**
     * Find the shortest path with transfer penalty (transfer counts as one extra station).
     * Uses Dijkstra's algorithm on state space (station, current line).
     * Cost rules:
     *   - Move to adjacent station on the same line: cost 1
     *   - Transfer to another line at the same station: cost 1
     * 
     * @param {Station} targetStation - Target station
     * @returns {Station[] | null} Sequence of stations (including start and end, consecutive duplicates indicate transfers), with linePath property attached; null if unreachable
     */
    goTo(targetStation) {
        // Start is the target
        if (this === targetStation) return [this];

        // Get lines of start and target
        const startLines = this.getConnectWay();
        if (startLines.length === 0) return null;
        const targetLines = targetStation.getConnectWay();
        if (targetLines.length === 0) return null;

        // Unique key for a state: station name + line name
        const getStateKey = (station, line) => `${station.getStationName()}|${line.getLineName()}`;

        // Distance map: stateKey -> minimum cost from start to this state
        const dist = new Map();
        // Predecessor map: stateKey -> { prevKey, station, line } for path reconstruction
        const prev = new Map();

        // Priority queue (min-heap), elements of form { cost, station, line }
        const heap = new MinHeap((a, b) => a.cost - b.cost);

        // Initialization: start from each line the start station belongs to, cost 0
        for (const line of startLines) {
            const stateKey = getStateKey(this, line);
            dist.set(stateKey, 0);
            prev.set(stateKey, null);
            heap.push({ cost: 0, station: this, line });
        }

        let bestTargetKey = null;      // Best state key reaching the target
        let bestTargetCost = Infinity; // Minimum cost to reach target

        // Dijkstra main loop
        while (!heap.isEmpty()) {
            const { cost, station, line } = heap.pop();
            const currentKey = getStateKey(station, line);

            // Skip if current cost is greater than recorded (lazy deletion)
            if (cost > (dist.get(currentKey) ?? Infinity)) continue;

            // Check if reached target station (any line)
            if (station === targetStation) {
                if (cost < bestTargetCost) {
                    bestTargetCost = cost;
                    bestTargetKey = currentKey;
                }
                // Continue to possibly find a better way (e.g., entering target from another line with lower cost)
            }

            // 1. Move to adjacent station on the same line
            // Get all neighbors (next + previous), deduplicate with Set
            const neighbors = [...new Set([...station.getNextStations(), ...station.getUpStations()])];
            for (const neighbor of neighbors) {
                // Check if neighbor also belongs to the current line
                if (!neighbor.getConnectWay().includes(line)) continue;

                const newCost = cost + 1;
                const neighborKey = getStateKey(neighbor, line);
                if (newCost < (dist.get(neighborKey) ?? Infinity)) {
                    dist.set(neighborKey, newCost);
                    prev.set(neighborKey, { prevKey: currentKey, station: neighbor, line });
                    heap.push({ cost: newCost, station: neighbor, line });
                }
            }

            // 2. Transfer to another line at the same station (cost +1)
            for (const otherLine of station.getConnectWay()) {
                if (otherLine === line) continue; // Skip current line

                const newCost = cost + 1;
                const transferKey = getStateKey(station, otherLine);
                if (newCost < (dist.get(transferKey) ?? Infinity)) {
                    dist.set(transferKey, newCost);
                    prev.set(transferKey, { prevKey: currentKey, station, line: otherLine });
                    heap.push({ cost: newCost, station, line: otherLine });
                }
            }
        }

        // No reachable path
        if (bestTargetKey === null) return null;

        // Reconstruct path: trace back from best target state to start, recording states (station + line)
        const stationPath = [];
        const linePath = [];
        let curKey = bestTargetKey;

        const states = []; // Temporary storage for state order (start to end)
        while (curKey) {
            const record = prev.get(curKey);
            if (!record) {
                // Reached start state (this)
                states.unshift({ station: this, line: startLines[0] });
                break;
            }
            states.unshift({ station: record.station, line: record.line });
            curKey = record.prevKey;
        }

        // Ensure start is at the beginning
        if (states.length === 0 || states[0].station !== this) {
            states.unshift({ station: this, line: startLines[0] });
        }
        // Ensure target is at the end
        if (states[states.length - 1].station !== targetStation) {
            states.push({ station: targetStation, line: targetLines[0] });
        }

        // Fill station path and corresponding line path
        for (const s of states) {
            stationPath.push(s.station);
            linePath.push(s.line);
        }

        // Attach linePath to the array for use by printPathDetailed
        stationPath.linePath = linePath;
        return stationPath;
    }
}

/**
 * RailWay class
 * Represents a metro line, containing line name, loop flag, and ordered list of stations.
 */
class RailWay {
    /**
     * Create a line
     * @param {string} lineName - Line name
     * @param {boolean} [isLoop=false] - Whether the line is a loop
     */
    constructor(lineName, isLoop = false) {
        checkIsNone(lineName, "line name");
        this.#lineName = lineName;
        this.#isLoop = isLoop;
    }

    // Private fields
    #lineName = undefined;        // Line name
    #railWayStations = [];        // Ordered list of stations on the line
    #isLoop = false;              // Loop flag

    // Public accessors
    getRailWayStations() { return this.#railWayStations; }
    getLineName() { return this.#lineName; }
    getIsLoop() { return this.#isLoop; }
    setIsLoop(isLoop) { this.#isLoop = isLoop; }

    /**
     * Batch connect stations and add them to the line.
     * Establishes adjacent connections in order; if loop, also connects ends.
     * @param  {...Station} stations - Stations in order
     */
    connectStations(...stations) {
        // Filter out undefined and null
        const validStations = stations.filter(s => s !== undefined && s !== null);
        if (validStations.length === 0) return;

        // Add all stations to the line (pushStation handles deduplication)
        validStations.forEach(s => this.pushStation(s));

        // Create adjacent connections
        for (let i = 0; i < validStations.length - 1; i++) {
            Station.addConnectStation(validStations[i], validStations[i + 1]);
        }

        // If loop and more than one station, close the loop
        if (this.#isLoop && validStations.length > 1) {
            Station.addConnectStation(validStations[validStations.length - 1], validStations[0]);
        }
    }

    /**
     * Add a station to the line's list (does not create inter-station connections)
     * @param {Station} station - Station to add
     * @returns {boolean} Success status
     */
    pushStation(station) {
        if (!station) return false;
        if (this.#railWayStations.includes(station)) return false; // Ignore if already present

        this.#railWayStations.push(station);
        station.addLine(this); // Bidirectional association
        console.log(`${station.getStationName()} added to ${this.#lineName} line`);
        return true;
    }

    /**
     * Pop the last station from the line (delete and return)
     * @returns {Station|null} Popped station, or null if line is empty
     */
    popStation() {
        if (this.#railWayStations.length === 0) {
            console.error(`${this.#lineName} line has no stations`);
            return null;
        }
        const lastStation = this.#railWayStations[this.#railWayStations.length - 1];
        this.deleteStation(lastStation); // Reuse deletion logic
        return lastStation;
    }

    /**
     * Delete a specified station from the line.
     * Connects its previous and next stations directly (if they exist) and removes line association.
     * @param {Station} station - Station to delete
     * @returns {boolean} Success status
     */
    deleteStation(station) {
        if (!station) return false;
        if (!this.#railWayStations.includes(station)) {
            console.error(`${station.getStationName()} is not on ${this.#lineName} line`);
            return false;
        }

        // Find previous and next stations on the same line
        const prevOnLine = this.#getUpStationOnSameLine(station);
        const nextOnLine = this.#getNextStationOnSameLine(station);

        // If both exist, connect them directly
        if (prevOnLine && nextOnLine) {
            Station.addConnectStation(prevOnLine, nextOnLine);
        }

        // Remove connections with neighbors
        if (prevOnLine) {
            this.#removeConnection(prevOnLine, station);
        }
        if (nextOnLine) {
            this.#removeConnection(station, nextOnLine);
        }

        // Remove from line's station list
        const index = this.#railWayStations.indexOf(station);
        this.#railWayStations.splice(index, 1);

        // Remove this line from station's line list
        const lineIndex = station.getConnectWay().indexOf(this);
        if (lineIndex !== -1) {
            station.getConnectWay().splice(lineIndex, 1);
        }

        console.log(`${station.getStationName()} removed from ${this.#lineName} line`);
        return true;
    }

    /**
     * Insert a new station between the given station and its next station on the same line.
     * @param {Station} fromStation - Existing station on the line
     * @param {Station} insertStation - New station to insert
     * @returns {boolean} Success status
     */
    insertStation(fromStation, insertStation) {
        if (!this.#railWayStations.includes(fromStation)) {
            console.error(`Cannot find ${fromStation.getStationName()} on ${this.#lineName} line`);
            return false;
        }
        if (!insertStation) {
            console.error(`Insert station cannot be empty`);
            return false;
        }

        // Find the next station on the same line
        const nextOnLine = this.#getNextStationOnSameLine(fromStation);
        if (!nextOnLine) {
            console.error(`${fromStation.getStationName()} has no next station on the same line; cannot insert`);
            return false;
        }

        // Remove existing connection
        this.#removeConnection(fromStation, nextOnLine);

        // Create new connections: fromStation → insertStation → nextOnLine
        Station.addConnectStation(fromStation, insertStation);
        Station.addConnectStation(insertStation, nextOnLine);

        // Insert into line list right after fromStation
        const fromIndex = this.#railWayStations.indexOf(fromStation);
        this.#railWayStations.splice(fromIndex + 1, 0, insertStation);
        insertStation.addLine(this);

        console.log(`Inserted ${insertStation.getStationName()} between ${fromStation.getStationName()} and ${nextOnLine.getStationName()}`);
        return true;
    }

    /**
     * Private: Get the next station on the same line
     * @param {Station} station - Current station
     * @returns {Station|undefined} Next station on the same line, or undefined
     */
    #getNextStationOnSameLine(station) {
        const nextStations = station.getNextStations();
        return nextStations.find(ns => ns.getConnectWay().includes(this));
    }

    /**
     * Private: Get the previous station on the same line
     * @param {Station} station - Current station
     * @returns {Station|undefined} Previous station on the same line, or undefined
     */
    #getUpStationOnSameLine(station) {
        const upStations = station.getUpStations();
        return upStations.find(us => us.getConnectWay().includes(this));
    }

    /**
     * Private: Remove bidirectional connections between two stations (if any)
     * @param {Station} stationA - Station A
     * @param {Station} stationB - Station B
     */
    #removeConnection(stationA, stationB) {
        // Remove B from A's next stations
        const aNext = stationA.getNextStations();
        const aNextIndex = aNext.indexOf(stationB);
        if (aNextIndex !== -1) aNext.splice(aNextIndex, 1);

        // Remove A from B's previous stations
        const bUp = stationB.getUpStations();
        const bUpIndex = bUp.indexOf(stationA);
        if (bUpIndex !== -1) bUp.splice(bUpIndex, 1);

        // Also check reverse connections for symmetry
        const bNext = stationB.getNextStations();
        const bNextIndex = bNext.indexOf(stationA);
        if (bNextIndex !== -1) bNext.splice(bNextIndex, 1);

        const aUp = stationA.getUpStations();
        const aUpIndex = aUp.indexOf(stationB);
        if (aUpIndex !== -1) aUp.splice(aUpIndex, 1);
    }

    /**
     * Print line information, including station order and lines each station belongs to
     */
    showRailWayStations() {
        console.log(`===== ${this.#lineName} ${this.#isLoop ? '(Loop)' : ''} =====`);
        const stationList = this.#railWayStations.map(s => {
            const lines = s.getConnectWay().map(l => l.getLineName());
            return `${s.getStationName()}-[${lines.join(', ')}]`;
        });
        console.log(`${stationList.join(' → ')}, total ${stationList.length} stations`);
        console.log("===============");
    }
}

// ==================== Module Export ====================
// Automatically adapts to ES6 module or CommonJS environment

// Items to export
const exported = {
    Station,
    RailWay,
    MinHeap,
    checkIsNone,
    calcPathCost,
    printPathDetailed
};

// CommonJS environment (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
}

// ES6 module environment (use with <script type="module"> or bundlers)
// Users can import like:
// import { Station, RailWay, MinHeap, checkIsNone, calcPathCost, printPathDetailed } from './MetroStation.js';