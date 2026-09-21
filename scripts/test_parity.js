import { findAttackPaths } from "../frontend/src/data/graphEngine.js";

console.log("Testing JS Graph Engine parity...");
const paths = findAttackPaths("api_gw_1", "swift_terminal", "enterprise-bank", "dijkstra", "static");

if (!Array.isArray(paths) || paths.length === 0) {
  console.error("FAILED: No paths returned from JS graphEngine");
  process.exit(1);
}

console.log(`Found ${paths.length} ranked paths.`);
console.log(`Optimal path: ${paths[0].path.join(" -> ")}`);
console.log(`Total hops: ${paths[0].total_hops}, Total weight: ${paths[0].total_weight}`);

if (paths[0].rank !== 1 || !paths[0].is_optimal) {
  console.error("FAILED: Rank 1 should be marked optimal");
  process.exit(1);
}

console.log("JS Graph Engine Parity: PASSED!");
