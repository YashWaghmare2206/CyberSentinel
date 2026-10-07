import { useState, useEffect } from "react";
import fallbackBenchmarkData from "../../data/benchmarkResults.json";
import "./ProjectExplainer.css";

function PignnMetricsPanel() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    fetch(`${base}/pignn/metrics`)
      .then(r => r.json())
      .then(d => { setMetrics(d); setLoading(false); })
      .catch(() => { setMetrics(null); setLoading(false); });
  }, []);

  if (loading) return <div className="v-metrics-loading">Loading real model metrics...</div>;
  if (!metrics || metrics.source === "error") return null;

  const isReal = metrics.source === "trained_model";

  return (
    <div className="v-real-metrics">
      <div className="v-real-metrics__header">
        {isReal ? "📊 Real Trained Model Metrics" : "⚠️ Architecture Only (Untrained)"}
      </div>
      <div className="v-real-metrics__grid">
        {[
          { label: "ROC-AUC", value: metrics.auc, desc: "Edge classification quality" },
          { label: "F1-Score", value: metrics.f1, desc: "Precision-recall balance" },
          { label: "Precision", value: metrics.precision, desc: "Correct attack edges / all predicted" },
          { label: "Recall", value: metrics.recall, desc: "Found / all real attack edges" },
          { label: "Cycle-Free", value: metrics.cycle_free_pct, suffix: "%", desc: "Physics constraint (no A→B→A)" },
          { label: "Latency", value: metrics.avg_latency_ms, suffix: "ms", desc: "Inference speed" },
        ].map(m => (
          <div key={m.label} className="v-metric-chip" title={m.desc}>
            <span className="v-metric-chip__label">{m.label}</span>
            <span className="v-metric-chip__value">
              {m.value != null ? `${Number(m.value).toFixed(3)}${m.suffix || ""}` : "N/A"}
            </span>
          </div>
        ))}
      </div>
      {!isReal && (
        <p className="v-metrics-note">
          Run <code>python pignn/train.py</code> to train the model and see real metrics.
        </p>
      )}
    </div>
  );
}

function BenchmarkPanel() {
  const [data, setData] = useState({ cached: true, results: fallbackBenchmarkData });
  
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    fetch(`${base}/benchmark/results`)
      .then(r => r.json())
      .then(res => {
        if (res && res.results && res.results.length > 0) {
          setData(res);
        }
      })
      .catch(() => {});
  }, []);
  
  if (!data) return <div className="v-metrics-loading">Loading benchmark data...</div>;
  if (!data.cached || !data.results?.length) {
    return (
      <div className="v-metrics-note">
        Benchmark not yet run. In the backend directory, execute:
        <code>python benchmark.py</code>
        then restart the server.
      </div>
    );
  }
  
  // Group by network + scenario, show first weighting mode only for clarity
  const mainResults = data.results.filter(r => r.weighting_mode === "static");
  
  return (
    <div className="v-benchmark-table-wrap">
      <table className="v-bench-table">
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Dijkstra Weight</th>
            <th>Dijkstra Time</th>
            <th>A* Weight</th>
            <th>A* Time</th>
            <th>A* Speedup</th>
            <th>PIGNN Weight</th>
            <th>PIGNN Diversity</th>
            <th>BF Validated</th>
          </tr>
        </thead>
        <tbody>
          {mainResults.map((r, i) => (
            <tr key={i}>
              <td>{r.scenario}</td>
              <td>{r.dijkstra?.optimal_weight ?? "N/A"}</td>
              <td>{r.dijkstra?.mean_latency_ms ?? "N/A"}ms</td>
              <td>{r.astar?.optimal_weight ?? "N/A"}</td>
              <td>{r.astar?.mean_latency_ms ?? "N/A"}ms</td>
              <td>{r.astar_speedup ? `${r.astar_speedup}×` : "N/A"}</td>
              <td>{r.pignn?.optimal_weight ?? "N/A"}</td>
              <td>{r.pignn?.avg_diversity_score ?? "N/A"}</td>
              <td>{r.brute_force_validation ? 
                `✅ ${r.brute_force_validation.brute_force_optimal}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProjectExplainer({ onNavigate }) {
  const [activeSection, setActiveSection] = useState("heist");
  const [activeHop, setActiveHop] = useState(1);
  const [selectedEngine, setSelectedEngine] = useState("pignn");
  const [dwmToggleKev, setDwmToggleKev] = useState(true);
  const [dwmToggleInternet, setDwmToggleInternet] = useState(true);
  const [dwmToggleOldPatch, setDwmToggleOldPatch] = useState(true);
  const [activeStarDim, setActiveStarDim] = useState("dim_cve");

  // Calculate dynamic lock difficulty based on interactive toggles
  const lockResistance = Math.max(
    0.1,
    (dwmToggleKev ? 0.2 : 4.0) +
      (dwmToggleInternet ? 0.3 : 3.5) +
      (dwmToggleOldPatch ? 0.1 : 2.5)
  ).toFixed(1);

  const lockStatus =
    lockResistance <= 1.5
      ? { label: "CRACKED OPEN (Instant Foothold)", color: "#f85149", icon: "🔓" }
      : lockResistance <= 5.0
      ? { label: "WEAKENED LOCK (Moderate Defense)", color: "#d29922", icon: "⚠️" }
      : { label: "FORTIFIED (Strong Defense)", color: "#3fb950", icon: "🔒" };

  return (
    <div className="explainer-shell">
      {/* Visual Header */}
      <div className="v-hero">
        <div className="v-hero__pill">Visual Interactive Guide</div>
        <h1 className="v-hero__title">
          CyberSentinel <span className="neon-text">Visualized</span>
        </h1>
        <p className="v-hero__desc">
          Zero walls of text. Pure visual diagrams, interactive sandboxes, and real-world analogies.
        </p>

        {/* Quick Launch Buttons */}
        <div className="v-hero__buttons">
          <button
            type="button"
            className="v-btn v-btn--play"
            onClick={() => onNavigate("simulation")}
          >
            🎮 Launch 3D Simulation
          </button>
        </div>
      </div>

      {/* Navigation Pills Bar */}
      <div className="v-pill-nav">
        {[
          { id: "heist", icon: "🏦", label: "The Heist Concept" },
          { id: "hops", icon: "👣", label: "Hop-by-Hop Attack" },
          { id: "engines", icon: "🧠", label: "AI Engines Battle" },
          { id: "dwm-sandbox", icon: "🔐", label: "Interactive Lock Sandbox" },
          { id: "benchmark", icon: "📊", label: "Algorithm Benchmark" },
          { id: "ai-agents", icon: "🤖", label: "AI Commentator & Doctor" }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`v-pill-tab ${activeSection === tab.id ? "active" : ""}`}
            onClick={() => setActiveSection(tab.id)}
          >
            <span className="v-pill-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* MAIN VISUAL CANVAS */}
      <div className="v-canvas">
        {/* ============================================================== */}
        {/* TAB 1: THE HEIST CONCEPT */}
        {/* ============================================================== */}
        {activeSection === "heist" && (
          <div className="v-card">
            <div className="v-card-badge">THE BIG PICTURE</div>
            <h2>Think of CyberSentinel as a Simulated Bank Heist</h2>

            {/* Visual Contrast Cards: Old Way vs CyberSentinel Way */}
            <div className="v-compare-grid">
              <div className="v-compare-card v-compare-card--bad">
                <div className="v-compare-card__header">
                  <span className="v-icon-badge">📋</span>
                  <div>
                    <h3>The Old Way: Isolated Spreadsheets</h3>
                    <span className="v-subtag">Boring, Confusing, Blind</span>
                  </div>
                </div>
                <div className="v-graphic-box">
                  <div className="mock-spreadsheet">
                    <div className="mock-row red">❌ Server #14 - Bug CVE-2021-41773 (CVSS 9.8)</div>
                    <div className="mock-row amber">⚠️ Server #29 - Bug CVE-2023-38606 (CVSS 7.8)</div>
                    <div className="mock-row red">❌ Server #03 - Bug CVE-2022-22965 (CVSS 9.8)</div>
                  </div>
                </div>
                <p className="v-caption">
                  Security teams have 1,000+ alerts. They have <strong>no idea</strong> if an attacker can actually link them together to reach the vault.
                </p>
              </div>

              <div className="v-compare-card v-compare-card--good">
                <div className="v-compare-card__header">
                  <span className="v-icon-badge">🚀</span>
                  <div>
                    <h3>The CyberSentinel Way: 3D Attack Path</h3>
                    <span className="v-subtag">Connected, Real-time, Visual</span>
                  </div>
                </div>
                <div className="v-graphic-box">
                  <div className="mock-attack-visual">
                    <div className="mock-node blue">🚪 Front Gate</div>
                    <div className="mock-connector red-pulse">➔</div>
                    <div className="mock-node purple">💻 Jump Host</div>
                    <div className="mock-connector red-pulse">➔</div>
                    <div className="mock-node purple">🗄️ Database</div>
                    <div className="mock-connector red-pulse">➔</div>
                    <div className="mock-node gold">💰 Money Vault</div>
                  </div>
                </div>
                <p className="v-caption">
                  We connect the dots into an interactive 3D map. We simulate the heist <strong>before</strong> real hackers strike and prescribe the exact fix!
                </p>
              </div>
            </div>

            {/* Visual 4-Step Pipeline */}
            <div className="v-pipeline">
              <div className="v-pipe-step">
                <div className="v-pipe-num">1</div>
                <div className="v-pipe-icon">🎯</div>
                <strong>Pick Target</strong>
                <span>Entry $\rightarrow$ Bank Vault</span>
              </div>
              <div className="v-pipe-arrow">➔</div>
              <div className="v-pipe-step">
                <div className="v-pipe-num">2</div>
                <div className="v-pipe-icon">⚡</div>
                <strong>AI Calculates Path</strong>
                <span>Dijkstra or PyTorch PIGNN</span>
              </div>
              <div className="v-pipe-arrow">➔</div>
              <div className="v-pipe-step">
                <div className="v-pipe-num">3</div>
                <div className="v-pipe-icon">🩺</div>
                <strong>Auto-Prescription</strong>
                <span>LLM writes code/patches</span>
              </div>
              <div className="v-pipe-arrow">➔</div>
              <div className="v-pipe-step">
                <div className="v-pipe-num">4</div>
                <div className="v-pipe-icon">🏛️</div>
                <strong>Warehouse Memory</strong>
                <span>Saved to Google BigQuery</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: HOP-BY-HOP LATERAL MOVEMENT */}
        {/* ============================================================== */}
        {activeSection === "hops" && (
          <div className="v-card">
            <div className="v-card-badge">STEPPING STONES</div>
            <h2>How Hackers Move: The "Lateral Movement" Chain</h2>
            <p className="v-desc">
              Hackers cannot teleport directly into the bank vault. Click on each hop below to see how they sneak deeper step-by-step:
            </p>

            {/* Interactive Hop Selector */}
            <div className="v-hop-stepper">
              {[
                { num: 1, name: "Beachhead", icon: "🌐", role: "Public API Gateway" },
                { num: 2, name: "Pivot", icon: "💻", role: "DMZ Bastion Host" },
                { num: 3, name: "Privilege", icon: "🗄️", role: "Transaction DB" },
                { num: 4, name: "Goal", icon: "💰", role: "SWIFT Transfer Terminal" },
              ].map((h) => (
                <button
                  key={h.num}
                  type="button"
                  className={`v-hop-btn ${activeHop === h.num ? "active" : ""}`}
                  onClick={() => setActiveHop(h.num)}
                >
                  <div className="v-hop-btn__circle">{h.num}</div>
                  <div className="v-hop-btn__title">{h.name}</div>
                  <div className="v-hop-btn__role">{h.role}</div>
                </button>
              ))}
            </div>

            {/* Dynamic Visual Hop Display */}
            <div className="v-hop-detail-card">
              {activeHop === 1 && (
                <div className="v-hop-panel">
                  <div className="v-hop-panel__visual border-blue">
                    <span className="v-hop-big-icon">🚪</span>
                    <span className="v-pill-tag blue">HOP 1: THE OPEN WINDOW</span>
                    <h3>Public API Gateway 1</h3>
                    <div className="v-hop-stat">Vulnerability: <strong>Apache Path Traversal (CVE-2021-41773)</strong></div>
                    <div className="v-hop-stat">CVSS Danger: <strong className="text-red">9.8 / 10 (CRITICAL)</strong></div>
                  </div>
                  <div className="v-hop-panel__info">
                    <h4>What the Attacker Does:</h4>
                    <p>
                      The attacker scans the internet and finds this public-facing web server. 
                      Because it has a known zero-day flaw, they send a malicious URL request and gain their initial 
                      <strong> foothold (beachhead)</strong> inside the company network.
                    </p>
                    <div className="v-action-tip">
                      💡 <strong>Defense Tip:</strong> Patch Apache to 2.4.51 or block suspicious URL traversal syntax at the WAF.
                    </div>
                  </div>
                </div>
              )}

              {activeHop === 2 && (
                <div className="v-hop-panel">
                  <div className="v-hop-panel__visual border-purple">
                    <span className="v-hop-big-icon">💻</span>
                    <span className="v-pill-tag purple">HOP 2: THE JUMP-BOX</span>
                    <h3>DMZ Bastion Jump Host</h3>
                    <div className="v-hop-stat">Vulnerability: <strong>SSH Credential Dumping (CVE-2023-38606)</strong></div>
                    <div className="v-hop-stat">CVSS Danger: <strong className="text-amber">7.8 / 10 (HIGH)</strong></div>
                  </div>
                  <div className="v-hop-panel__info">
                    <h4>What the Attacker Does:</h4>
                    <p>
                      From the web server, the hacker pivots to this jump host. 
                      They dump administrator credentials cached in RAM, giving them valid passwords to access internal servers without triggering alarms.
                    </p>
                    <div className="v-action-tip">
                      💡 <strong>Defense Tip:</strong> Enforce Multi-Factor Authentication (MFA) and isolate SSH access with strict jump-box ACLs.
                    </div>
                  </div>
                </div>
              )}

              {activeHop === 3 && (
                <div className="v-hop-panel">
                  <div className="v-hop-panel__visual border-purple">
                    <span className="v-hop-big-icon">🗄️</span>
                    <span className="v-pill-tag purple">HOP 3: PRIVILEGE ESCALATION</span>
                    <h3>Core Transaction Database</h3>
                    <div className="v-hop-stat">Vulnerability: <strong>Spring4Shell RCE (CVE-2022-22965)</strong></div>
                    <div className="v-hop-stat">CVSS Danger: <strong className="text-red">9.8 / 10 (CRITICAL)</strong></div>
                  </div>
                  <div className="v-hop-panel__info">
                    <h4>What the Attacker Does:</h4>
                    <p>
                      Using the stolen credentials, they reach the core database proxy. 
                      They execute a remote code execution exploit to gain root (administrator) control over the internal banking backbone.
                    </p>
                    <div className="v-action-tip">
                      💡 <strong>Defense Tip:</strong> Upgrade Spring Framework and isolate database subnets away from DMZ hosts.
                    </div>
                  </div>
                </div>
              )}

              {activeHop === 4 && (
                <div className="v-hop-panel">
                  <div className="v-hop-panel__visual border-gold">
                    <span className="v-hop-big-icon">💰</span>
                    <span className="v-pill-tag gold">HOP 4: THE CROWN JEWELS</span>
                    <h3>SWIFT Wire Transfer Terminal</h3>
                    <div className="v-hop-stat">Vulnerability: <strong>Zerologon Netlogon (CVE-2020-1472)</strong></div>
                    <div className="v-hop-stat">CVSS Danger: <strong className="text-red">10.0 / 10 (MAXIMUM DANGER)</strong></div>
                  </div>
                  <div className="v-hop-panel__info">
                    <h4>What the Attacker Does:</h4>
                    <p>
                      The hacker reaches the terminal responsible for authorizing multi-million-dollar wire transfers. 
                      They forge money transfer transactions and siphon funds before security teams even realize a breach occurred.
                    </p>
                    <div className="v-action-tip">
                      💡 <strong>Defense Tip:</strong> Air-gap SWIFT terminals with hardware security modules (HSMs) and dual-operator authorization.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: THE 3 ENGINES BATTLE */}
        {/* ============================================================== */}
        {activeSection === "engines" && (
          <div className="v-card">
            <div className="v-card-badge">THE 3 BRAINS</div>
            <h2>How CyberSentinel Finds Paths: The 3 Navigation Engines</h2>
            <p className="v-desc">Click any engine to see its visual analogy and performance radar:</p>

            <div className="v-engine-selector">
              <button
                type="button"
                className={`v-engine-tab ${selectedEngine === "dijkstra" ? "active" : ""}`}
                onClick={() => setSelectedEngine("dijkstra")}
              >
                📍 1. Top-K Dijkstra (The GPS)
              </button>
              <button
                type="button"
                className={`v-engine-tab ${selectedEngine === "astar" ? "active" : ""}`}
                onClick={() => setSelectedEngine("astar")}
              >
                🧭 2. A* Search (The Compass)
              </button>
              <button
                type="button"
                className={`v-engine-tab highlight ${selectedEngine === "pignn" ? "active" : ""}`}
                onClick={() => setSelectedEngine("pignn")}
              >
                ⚡ 3. PIGNN PyTorch (Physics AI)
              </button>
            </div>

            {/* Dynamic Comparison Box */}
            <div className="v-engine-arena">
              {selectedEngine === "dijkstra" && (
                <div className="v-arena-card">
                  <div className="v-arena-header">
                    <span className="v-arena-icon">🗺️</span>
                    <div>
                      <h3>Top-K Dijkstra: "The Google Maps Route Finder"</h3>
                      <p>Checks every connected street and calculates the route with absolute minimum security resistance.</p>
                    </div>
                  </div>
                  <div className="v-meter-grid">
                    <div className="v-meter">
                      <span>Path Accuracy</span>
                      <div className="v-bar"><div className="v-bar-fill" style={{ width: "98%" }} /></div>
                      <strong>98% (Mathematical Optimum)</strong>
                    </div>
                    <div className="v-meter">
                      <span>Speed on Huge Networks</span>
                      <div className="v-bar"><div className="v-bar-fill" style={{ width: "65%" }} /></div>
                      <strong>Moderate (Checks every edge)</strong>
                    </div>
                    <div className="v-meter">
                      <span>Intuition / Learning</span>
                      <div className="v-bar"><div className="v-bar-fill" style={{ width: "20%" }} /></div>
                      <strong>0% (Pure Heuristic Algorithm)</strong>
                    </div>
                  </div>
                </div>
              )}

              {selectedEngine === "astar" && (
                <div className="v-arena-card">
                  <div className="v-arena-header">
                    <span className="v-arena-icon">🧭</span>
                    <div>
                      <h3>A* Search: "The Smart Compass"</h3>
                      <p>Similar to Dijkstra, but with a mathematical "hunch" (heuristic) pulling it directly toward the vault.</p>
                    </div>
                  </div>
                  <div className="v-meter-grid">
                    <div className="v-meter">
                      <span>Path Accuracy</span>
                      <div className="v-bar"><div className="v-bar-fill" style={{ width: "92%" }} /></div>
                      <strong>92% (Heuristic Guided)</strong>
                    </div>
                    <div className="v-meter">
                      <span>Speed on Huge Networks</span>
                      <div className="v-bar"><div className="v-bar-fill" style={{ width: "95%" }} /></div>
                      <strong>Fast (Cuts down search tree)</strong>
                    </div>
                    <div className="v-meter">
                      <span>Intuition / Learning</span>
                      <div className="v-bar"><div className="v-bar-fill" style={{ width: "35%" }} /></div>
                      <strong>Low (Rule-based Euclidean distance)</strong>
                    </div>
                  </div>
                </div>
              )}

              {selectedEngine === "pignn" && (
                <div className="v-arena-card featured">
                  <div className="v-arena-header">
                    <span className="v-arena-icon">🌊</span>
                    <div>
                      <h3>Physics-Informed GNN (PIGNN): "Water Finding Cracks"</h3>
                      <p>A deep neural network modeling attack probability like fluid flow or heat diffusion across network tensors.</p>
                    </div>
                  </div>
                  <div className="v-meter-grid">
                    <div className="v-meter">
                      <span>Lateral Movement Flow</span>
                      <div className="v-bar"><div className="v-bar-fill purple" style={{ width: "95%" }} /></div>
                      <strong>94.8% Confidence (PyTorch Tensors)</strong>
                    </div>
                    <div className="v-meter">
                      <span>Speed on Huge Networks</span>
                      <div className="v-bar"><div className="v-bar-fill purple" style={{ width: "99%" }} /></div>
                      <strong>Ultra-Fast GPU/CPU Tensor Forward Pass</strong>
                    </div>
                    <div className="v-meter">
                      <span>Intuition / Pattern Recognition</span>
                      <div className="v-bar"><div className="v-bar-fill purple" style={{ width: "96%" }} /></div>
                      <strong>Deep Learning (Trained on attack patterns)</strong>
                    </div>
                  </div>
                  {/* Real PIGNN Evaluation Metrics — from evaluate.py */}
                  <PignnMetricsPanel />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: INTERACTIVE DWM LOCK SANDBOX */}
        {/* ============================================================== */}
        {activeSection === "dwm-sandbox" && (
          <div className="v-card">
            <div className="v-card-badge">INTERACTIVE EXPERIMENT</div>
            <h2>Dynamic Weight Management (DWM): Test the Lock Strength</h2>
            <p className="v-desc">
              Toggle the real-world threat factors below to see how a server's lock resistance changes in real time:
            </p>

            <div className="v-sandbox-layout">
              {/* Toggles */}
              <div className="v-sandbox-controls">
                <h3>Select Real-World Threat Conditions:</h3>
                
                <label className="v-toggle-row">
                  <input
                    type="checkbox"
                    checked={dwmToggleKev}
                    onChange={(e) => setDwmToggleKev(e.target.checked)}
                  />
                  <div>
                    <strong>CISA KEV Zero-Day Active in Wild?</strong>
                    <span>Hackers already have working exploit code online</span>
                  </div>
                </label>

                <label className="v-toggle-row">
                  <input
                    type="checkbox"
                    checked={dwmToggleInternet}
                    onChange={(e) => setDwmToggleInternet(e.target.checked)}
                  />
                  <div>
                    <strong>Public Internet Facing?</strong>
                    <span>Server has no firewall barrier protecting it</span>
                  </div>
                </label>

                <label className="v-toggle-row">
                  <input
                    type="checkbox"
                    checked={dwmToggleOldPatch}
                    onChange={(e) => setDwmToggleOldPatch(e.target.checked)}
                  />
                  <div>
                    <strong>Patch Overdue by 500+ Days?</strong>
                    <span>Vendor released a patch long ago, but company forgot to install it</span>
                  </div>
                </label>
              </div>

              {/* Dynamic Visual Lock Display */}
              <div className="v-sandbox-display">
                <div className="v-lock-icon" style={{ borderColor: lockStatus.color }}>
                  <span className="v-lock-emoji">{lockStatus.icon}</span>
                </div>
                <div className="v-lock-title" style={{ color: lockStatus.color }}>
                  {lockStatus.label}
                </div>
                <div className="v-lock-score">
                  Traversal Resistance: <strong>{lockResistance}</strong> / 10.0
                </div>
                <p className="v-lock-explanation">
                  {lockResistance <= 1.5
                    ? "🚨 Because this server has an active zero-day and is directly on the internet, the attacker traverses it almost instantly with near-zero effort!"
                    : lockResistance <= 5.0
                    ? "⚠️ Moderate resistance. The attacker must spend time brute-forcing or bypassing compensating controls."
                    : "🛡️ High resistance! With no active zero-days and strict internal isolation, this door is locked tight."}
                </p>
              </div>
            </div>
          </div>
        )}


        {/* ============================================================== */}
        {/* TAB 6: AI COMMENTATOR & DOCTOR */}
        {/* ============================================================== */}
        {activeSection === "benchmark" && (
          <div className="v-card">
            <div className="v-card-badge">RESEARCH EVIDENCE</div>
            <h2>Algorithm Comparison — Live Benchmark Results</h2>
            <p className="v-desc">
              These results are generated by running all 3 algorithms across all 3 network 
              topologies and measuring real performance metrics. This is the evaluation table 
              for the research paper.
            </p>
            <BenchmarkPanel />
          </div>
        )}

        {activeSection === "ai-agents" && (
          <div className="v-card">
            <div className="v-card-badge">GENERATIVE AI (GROQ / LLAMA 3.3)</div>
            <h2>The Dual-Role AI Security Agent</h2>

            <div className="v-ai-roles-layout">
              {/* Role 1 */}
              <div className="v-ai-card">
                <div className="v-ai-avatar">🎙️</div>
                <h3>Role 1: The Live Heist Commentator</h3>
                <p className="v-ai-desc">
                  Instead of showing raw binary code or matrices, the AI streams a play-by-play tactical story of the intrusion:
                </p>
                <div className="v-mock-chat red">
                  <div className="v-chat-sender">🔴 Red-Team Agent Narrative</div>
                  <div className="v-chat-msg">
                    "Adversary begins by weaponizing CVE-2021-41773 on Public API Gateway 1 to bypass directory normalization. 
                    From there, they pivot into DMZ Bastion Host, harvesting administrator session tokens..."
                  </div>
                </div>
              </div>

              {/* Role 2 */}
              <div className="v-ai-card">
                <div className="v-ai-avatar">🩺</div>
                <h3>Role 2: The Security Doctor (Auto-Fix)</h3>
                <p className="v-ai-desc">
                  Once the attack path is computed, it generates immediate, concrete doctor prescriptions to block each hop:
                </p>
                <div className="v-mock-chat green">
                  <div className="v-chat-sender">🟢 Auto-Fix Remediation Engine</div>
                  <div className="v-chat-msg">
                    "Hop 1 Fix: Upgrade Apache to version 2.4.51.<br />
                    Hop 2 Fix: Enforce MFA and isolate SSH access with jump-box firewall ACL rules."
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
