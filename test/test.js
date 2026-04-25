import { Station, RailWay, printPathDetailed } from '../MetroStation.js';
import { ... } from '../MetroStation_zh.js';

import {
  Station as StationZH,
  RailWay as RailWayZH,
  printPathDetailed as printPathDetailedZH,
} from './MetroStation_zh.js';

function runTests(StationClass, RailWayClass, printFn, label) {
  console.log(`\n=== Testing ${label} ===`);

  // Create stations
  const A = new StationClass('A');
  const B = new StationClass('B');
  const C = new StationClass('C');
  const D = new StationClass('D');

  // Create lines
  const L1 = new RailWayClass('Line1');
  const L2 = new RailWayClass('Line2');

  // Build network
  L1.connectStations(A, B, C);
  L2.connectStations(D, B); // B is transfer station

  // Verify line content
  L1.showRailWayStations();

  // Test alias system
  B.pushName('Hub');
  console.assert(B.getStationName() === 'Hub', 'pushName should change current name');

  // Test bound name
  const bound = B.getBoundNameForLine(L1);
  console.assert(bound === 'B', 'Bound name on Line1 should still be "B"');

  // Test pathfinding
  const path = A.goTo(D);
  if (!path) {
    throw new Error('Path should be reachable');
  }
  console.log(`Path length: ${path.length}, transfers included: ${path.linePath ? 'yes' : 'no'}`);

  // Print path (will output to console)
  printFn(path, A, D);

  // Test Line name change
  L1.changeStationName(B, 'StationHub');
  console.assert(B.getBoundNameForLine(L1) === 'StationHub', 'Bound name on Line1 should be updated');

  // Alias list integrity
  console.assert(B.getNameList().includes('Hub'), 'Alias list should contain "Hub"');
  console.assert(B.getNameList().includes('StationHub'), 'Alias list should contain "StationHub"');

  console.log(`${label} tests passed.\n`);
}

// Run tests for both versions
runTests(Station, RailWay, printPathDetailed, 'MetroStation.js (English)');
runTests(StationZH, RailWayZH, printPathDetailedZH, 'MetroStation_zh.js');