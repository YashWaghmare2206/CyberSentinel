const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function fetchWarehouseSummary() {
  const res = await fetch(`${API_BASE_URL}/warehouse/summary`);
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

export async function fetchAttackHistory() {
  const res = await fetch(`${API_BASE_URL}/warehouse/attack-history`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function fetchAttackPatterns() {
  const res = await fetch(`${API_BASE_URL}/warehouse/attack-patterns`);
  if (!res.ok) throw new Error("Failed to fetch patterns");
  return res.json();
}

export async function executeWarehouseQuery(sql) {
  const res = await fetch(`${API_BASE_URL}/warehouse/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql })
  });
  if (!res.ok) throw new Error("Failed to execute query");
  return res.json();
}
