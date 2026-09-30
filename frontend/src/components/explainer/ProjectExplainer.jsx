import { useState } from "react";
import "./ProjectExplainer.css";

export default function ProjectExplainer({ onNavigate }) {
  const [activeSection, setActiveSection] = useState("overview");

  const sections = [
    { id: "overview", icon: "🏦", title: "1. The Big Picture" },
    { id: "network", icon: "🌐", title: "2. The 3D Network" },
    { id: "simulation", icon: "⚡", title: "3. Attack Simulation" },
    { id: "algorithms", icon: "🧠", title: "4. The 3 AI Engines" },
    { id: "dwm", icon: "🔐", title: "5. Locks & Keys (DWM)" },
    { id: "genai", icon: "🤖", title: "6. The AI Doctor (LLM)" },
    { id: "warehouse", icon: "🏛️", title: "7. The Data Warehouse" },
    { id: "script", icon: "🎤", title: "8. 2-Minute Viva Script" },
    { id: "glossary", icon: "📖", title: "9. Jargon Buster" },
  ];

  return (
    <div className="explainer-shell">
      {/* Hero Banner */}
      <div className="explainer-hero">
        <div className="explainer-hero__badge">CyberSentinel Explained in Plain English</div>
        <h1 className="explainer-hero__title">
          How to Understand & Explain <span className="highlight-cyan">CyberSentinel</span> to Anyone
        </h1>
        <p className="explainer-hero__subtitle">
          No complex jargon or doctorate required. Here is how our 3D attack simulation, 
          Physics-Informed Neural Network, and Google BigQuery Data Warehouse work using real-world analogies.
        </p>

        {/* Quick Jump Buttons */}
        <div className="explainer-hero__actions">
          <button 
            type="button" 
            className="btn-explainer-primary"
            onClick={() => onNavigate("simulation")}
          >
            🎮 Open 3D Simulation
          </button>
          <button 
            type="button" 
            className="btn-explainer-secondary"
            onClick={() => onNavigate("warehouse")}
          >
            📊 Open BigQuery Warehouse
          </button>
        </div>
      </div>

      {/* Main Layout: Nav Tabs on Left/Top + Content on Right */}
      <div className="explainer-body">
        {/* Navigation Sidebar */}
        <nav className="explainer-nav">
          <div className="explainer-nav__header">GUIDE CHAPTERS</div>
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`explainer-nav__item ${activeSection === s.id ? "active" : ""}`}
              onClick={() => setActiveSection(s.id)}
            >
              <span className="explainer-nav__icon">{s.icon}</span>
              <span className="explainer-nav__label">{s.title}</span>
            </button>
          ))}
        </nav>

        {/* Chapter Content Container */}
        <main className="explainer-content">
          {/* SECTION 1: THE BIG PICTURE */}
          {activeSection === "overview" && (
            <div className="explainer-card">
              <div className="explainer-card__tag">CHAPTER 1</div>
              <h2>What Problem Does CyberSentinel Solve?</h2>
              
              <div className="analogy-box">
                <div className="analogy-box__title">💡 The Bank Robbery Analogy:</div>
                <p>
                  Imagine a high-security bank. The bank has security guards at the front entrance, 
                  motion sensors in the hallway, digital badges on office doors, and a massive steel vault inside.
                  <br /><br />
                  Normally, banks only find out their security is weak <strong>after</strong> a burglar breaks in. 
                  <strong> CyberSentinel is a team of digital master burglars hired by the bank</strong> to run 
                  simulated break-ins every day. They test every window, vent, and keycard reader to prove 
                  exactly how an intruder could reach the vault — and then immediately hand the bank manager 
                  a list of exact repairs needed to lock them out.
                </p>
              </div>

              <h3>In Simple Terms:</h3>
              <ul className="layman-list">
                <li>
                  <strong>Before CyberSentinel:</strong> Security teams stare at thousands of boring vulnerability alerts 
                  on spreadsheets, unsure which ones hackers can actually combine into a real attack.
                </li>
                <li>
                  <strong>With CyberSentinel:</strong> We connect the dots into an interactive 3D map. 
                  You pick an entry door and a valuable target, click <em>Simulate Attack</em>, and watch 
                  the computer calculate the exact path a hacker would take in real time!
                </li>
              </ul>

              <div className="flow-steps">
                <div className="flow-step">
                  <div className="flow-step__num">1</div>
                  <div className="flow-step__name">Pick Targets</div>
                  <p>Choose where the hacker enters and what they want to steal.</p>
                </div>
                <div className="flow-arrow">➔</div>
                <div className="flow-step">
                  <div className="flow-step__num">2</div>
                  <div className="flow-step__name">Simulate Attack</div>
                  <p>Mathematical algorithms calculate the easiest path.</p>
                </div>
                <div className="flow-arrow">➔</div>
                <div className="flow-step">
                  <div className="flow-step__num">3</div>
                  <div className="flow-step__name">AI Fixes It</div>
                  <p>GenAI prescribes exact patches to block the hacker.</p>
                </div>
                <div className="flow-arrow">➔</div>
                <div className="flow-step">
                  <div className="flow-step__num">4</div>
                  <div className="flow-step__name">Save in Warehouse</div>
                  <p>Google BigQuery archives the run to spot systemic chokepoints.</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: THE 3D NETWORK */}
          {activeSection === "network" && (
            <div className="explainer-card">
              <div className="explainer-card__tag">CHAPTER 2</div>
              <h2>The 3D Network: The Digital Building Floor Plan</h2>
              
              <div className="analogy-box">
                <div className="analogy-box__title">💡 The Floor Plan Analogy:</div>
                <p>
                  Think of our 3D graph as an architectural blueprint of an entire company building:
                  <br />
                  • <strong>The Nodes (Dots)</strong> are individual rooms or devices (like the reception computer, the elevator controller, or the main vault).
                  <br />
                  • <strong>The Edges (Lines)</strong> are hallways and doors connecting those rooms together.
                </p>
              </div>

              <h3>What Do the Colors Mean?</h3>
              <div className="grid-cards">
                <div className="info-badge-card border-blue">
                  <span className="badge-dot dot-blue" />
                  <h4>Blue / Cyan Nodes</h4>
                  <p><strong>Perimeter Assets:</strong> Computers facing the public internet (like web portals and login pages). Hackers usually start here.</p>
                </div>
                <div className="info-badge-card border-purple">
                  <span className="badge-dot dot-purple" />
                  <h4>Purple Nodes</h4>
                  <p><strong>Internal Workstations & Servers:</strong> Office computers, jump hosts, and employee laptops that sit behind the firewall.</p>
                </div>
                <div className="info-badge-card border-gold">
                  <span className="badge-dot dot-gold" />
                  <h4>Gold / Yellow Nodes</h4>
                  <p><strong>Target Crown Jewels:</strong> The database storing customer credit cards, or the bank SWIFT money transfer terminal.</p>
                </div>
                <div className="info-badge-card border-red">
                  <span className="badge-dot dot-red" />
                  <h4>Glowing Red Pulsing Path</h4>
                  <p><strong>The Active Attack Route:</strong> The exact sequence of computers the hacker broke into during this simulation run.</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: ATTACK SIMULATION */}
          {activeSection === "simulation" && (
            <div className="explainer-card">
              <div className="explainer-card__tag">CHAPTER 3</div>
              <h2>How Attack Simulation Works: "Lateral Movement"</h2>

              <div className="analogy-box">
                <div className="analogy-box__title">💡 The Stepping Stone Analogy:</div>
                <p>
                  A burglar cannot magically teleport into the bank vault from the street outside. 
                  Instead, they break into a first-floor window, walk through an unlocked hallway, 
                  pick the lock on a manager's office, steal the master keycard, and finally open the vault.
                </p>
              </div>

              <h3>Why It's Called "Lateral Movement" (Hop-by-Hop):</h3>
              <p>
                In cybersecurity, each step from one compromised computer to another is called a <strong>"Hop"</strong>:
              </p>
              <div className="hop-sequence">
                <div className="hop-item">
                  <div className="hop-badge">Hop 1 (Beachhead)</div>
                  <strong>Public API Gateway</strong>
                  <p>Hacker finds an unpatched web flaw and gets inside the company network.</p>
                </div>
                <div className="hop-connector">➔</div>
                <div className="hop-item">
                  <div className="hop-badge">Hop 2 (Pivot)</div>
                  <strong>DMZ Bastion Host</strong>
                  <p>Hacker steals admin login credentials stored in server memory.</p>
                </div>
                <div className="hop-connector">➔</div>
                <div className="hop-item">
                  <div className="hop-badge">Hop 3 (Privilege Escalation)</div>
                  <strong>Database Proxy</strong>
                  <p>Hacker leverages a zero-day flaw to gain full root supervisor rights.</p>
                </div>
                <div className="hop-connector">➔</div>
                <div className="hop-item target">
                  <div className="hop-badge">Hop 4 (Destination)</div>
                  <strong>SWIFT Wire Terminal</strong>
                  <p>Hacker initiates unauthorized wire transfers. Mission accomplished.</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: THE 3 ALGORITHMS */}
          {activeSection === "algorithms" && (
            <div className="explainer-card">
              <div className="explainer-card__tag">CHAPTER 4</div>
              <h2>The 3 AI Brains: Dijkstra vs. A* vs. PIGNN</h2>
              <p>
                CyberSentinel doesn't just guess paths. It gives you 3 different mathematical engines to choose from. 
                Here is what each one does:
              </p>

              <div className="engine-comparison">
                <div className="engine-card">
                  <div className="engine-header">
                    <span className="engine-icon">📍</span>
                    <div>
                      <h3>1. Top-K Dijkstra</h3>
                      <span className="engine-tag">The GPS Navigator</span>
                    </div>
                  </div>
                  <p>
                    <strong>How it works:</strong> Just like Google Maps calculates the route with the least traffic, 
                    Dijkstra checks every connected road and finds the path of least resistance (weakest security defenses).
                  </p>
                  <div className="analogy-mini">
                    <strong>Real-world analogy:</strong> A burglar checking every single door in order until they find the path with the fewest locks.
                  </div>
                </div>

                <div className="engine-card">
                  <div className="engine-header">
                    <span className="engine-icon">🧭</span>
                    <div>
                      <h3>2. A* Search</h3>
                      <span className="engine-tag">The Smart Compass</span>
                    </div>
                  </div>
                  <p>
                    <strong>How it works:</strong> Similar to Dijkstra, but with a "hunch" (heuristic). 
                    It always prioritizes doors that move physically closer towards the vault, making it faster on huge networks.
                  </p>
                  <div className="analogy-mini">
                    <strong>Real-world analogy:</strong> A burglar using a compass to always walk in the general direction of the vault room.
                  </div>
                </div>

                <div className="engine-card featured">
                  <div className="engine-header">
                    <span className="engine-icon">⚡</span>
                    <div>
                      <h3>3. Physics-Informed GNN (PIGNN)</h3>
                      <span className="engine-tag">Our Deep Learning Innovation</span>
                    </div>
                  </div>
                  <p>
                    <strong>How it works:</strong> A PyTorch Neural Network trained on thousands of simulated attack patterns. 
                    It borrows laws from physics (like heat diffusion or electric flow) to calculate the <em>probability</em> 
                    of an attacker slipping through unnoticed.
                  </p>
                  <div className="analogy-mini">
                    <strong>Real-world analogy:</strong> Water poured onto the roof of a house. Water doesn't measure door locks with a ruler; 
                    it naturally finds the cracks and flaws through physics. PIGNN predicts lateral flow the same way!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: DYNAMIC WEIGHT MANAGEMENT (DWM) */}
          {activeSection === "dwm" && (
            <div className="explainer-card">
              <div className="explainer-card__tag">CHAPTER 5</div>
              <h2>Dynamic Weight Management (DWM): How Doors Get Easier or Harder</h2>
              
              <div className="analogy-box">
                <div className="analogy-box__title">💡 The Lock Strength Analogy:</div>
                <p>
                  In old security tools, every door lock is given a static score (like "Lock Grade 8.0"). 
                  <br />
                  But in the real world, lock strength changes every day! 
                  If someone posts a video online showing how to open that lock with a bobby pin, 
                  that lock is suddenly useless. <strong>That is what DWM does.</strong>
                </p>
              </div>

              <h3>The 4 Factors of DWM:</h3>
              <div className="dwm-factors">
                <div className="factor-item">
                  <span className="factor-icon">🎯</span>
                  <strong>1. CVSS Base Score</strong>
                  <p>The theoretical flaw rating from 1 to 10 given by security experts.</p>
                </div>
                <div className="factor-item">
                  <span className="factor-icon">🚨</span>
                  <strong>2. CISA KEV (Known Exploited)</strong>
                  <p>Is this flaw actively being exploited right now by real criminals? If YES, the door opens almost instantly.</p>
                </div>
                <div className="factor-item">
                  <span className="factor-icon">🌍</span>
                  <strong>3. Perimeter Exposure</strong>
                  <p>Is this server exposed directly to the internet, or is it buried deep in a secure basement?</p>
                </div>
                <div className="factor-item">
                  <span className="factor-icon">⏳</span>
                  <strong>4. Patch Availability & Age</strong>
                  <p>Has a fix been available for 500 days that the company forgot to install? The older the unpatched flaw, the riskier it is.</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: GEN AI NARRATIVE & AUTO-FIX */}
          {activeSection === "genai" && (
            <div className="explainer-card">
              <div className="explainer-card__tag">CHAPTER 6</div>
              <h2>The AI Security Agent: The Storyteller & The Doctor</h2>
              
              <p>
                Once the algorithm calculates the attack path, our <strong>Groq / Llama 3.3 Large Language Model (LLM)</strong> 
                steps in to play two vital roles:
              </p>

              <div className="dual-role-grid">
                <div className="role-card">
                  <div className="role-icon">🎙️</div>
                  <h3>Role 1: The Live Heist Commentator</h3>
                  <p>
                    Instead of showing a boring list of IP addresses, the AI streams a play-by-play narrative in real time:
                  </p>
                  <div className="quote-snippet">
                    <em>"The adversary begins by weaponizing CVE-2021-41773 on Public API Gateway 1 to bypass directory normalization. 
                    From there, they pivot into the DMZ Bastion Host, harvesting administrator session tokens..."</em>
                  </div>
                </div>

                <div className="role-card">
                  <div className="role-icon">🩺</div>
                  <h3>Role 2: The Security Doctor (Auto-Fix)</h3>
                  <p>
                    After explaining the attack, it immediately writes a concrete prescription to patch every weak link:
                  </p>
                  <div className="quote-snippet">
                    <em>"Action 1: Upgrade Apache to version 2.4.51 or higher.<br />
                    Action 2: Enforce network segmentation ACLs on port 22 between DMZ and Core Database."</em>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: THE DATA WAREHOUSE */}
          {activeSection === "warehouse" && (
            <div className="explainer-card">
              <div className="explainer-card__tag">CHAPTER 7</div>
              <h2>The Google BigQuery Data Warehouse: The Enterprise Memory Bank</h2>
              
              <div className="analogy-box">
                <div className="analogy-box__title">💡 The Flight Recorder Analogy:</div>
                <p>
                  When airplanes fly, a "black box" flight data recorder stores every dial, altitude change, and pilot decision. 
                  If anything goes wrong, engineers look at hundreds of flight recordings to spot patterns.
                  <br /><br />
                  <strong>Our Google BigQuery Data Warehouse is the Black Box of CyberSentinel.</strong> 
                  Every time a simulation runs, every single hop, risk score, and server is stored in a 
                  <strong> Ralph Kimball Star Schema</strong>.
                </p>
              </div>

              <h3>Why Do We Need It?</h3>
              <ul className="layman-list">
                <li>
                  <strong>Spotting "Chokepoints":</strong> If you run 50 different attack simulations and notice that 
                  an internal server called <em>"DMZ Bastion Jump Host"</em> shows up in 42 of them, 
                  <strong> that server is a critical chokepoint!</strong> 
                  Fixing that single machine cuts off 84% of all possible burglary routes.
                </li>
                <li>
                  <strong>Boardroom Compliance:</strong> The Chief Information Security Officer (CISO) can prove to auditors 
                  and the board that security defenses are tested, tracked, and measured historically over months and quarters.
                </li>
                <li>
                  <strong>Live Read-Only SQL Console:</strong> Analysts can write custom SQL queries with Star Joins 
                  and see instant results right in our UI!
                </li>
              </ul>
            </div>
          )}

          {/* SECTION 8: 2-MINUTE PRESENTATION SCRIPT */}
          {activeSection === "script" && (
            <div className="explainer-card">
              <div className="explainer-card__tag">CHAPTER 8</div>
              <h2>🎤 The 2-Minute Presentation Script (Cheat Sheet)</h2>
              <p>
                Need to explain the entire project to an examiner, professor, or friend in 2 minutes? 
                Read or memorize these 4 paragraphs:
              </p>

              <div className="script-container">
                <div className="script-block">
                  <div className="script-timer">0:00 - 0:30</div>
                  <h4>1. The Problem & Purpose</h4>
                  <p className="script-text">
                    "Good morning. Our project is <strong>CyberSentinel</strong>. 
                    In modern organizations, cybersecurity teams are overwhelmed by thousands of isolated vulnerability alerts. 
                    They know individual computers have bugs, but they cannot tell which ones an attacker can chain together 
                    to breach critical assets like the bank's wire transfer terminal. CyberSentinel solves this by simulating 
                    realistic, multi-hop lateral attack paths before real attackers can exploit them."
                  </p>
                </div>

                <div className="script-block">
                  <div className="script-timer">0:30 - 1:00</div>
                  <h4>2. The 3D Engine & Hybrid AI Models</h4>
                  <p className="script-text">
                    "We model the entire enterprise as an interactive 3D network graph using Three.js and WebGL. 
                    To calculate how an attacker moves, we built a hybrid engine: 
                    heuristic graph algorithms like <strong>Top-K Dijkstra and A*</strong> for absolute least-resistance routes, 
                    and a <strong>Physics-Informed Graph Neural Network (PIGNN) in PyTorch</strong> that models attack flow 
                    probabilistically like water finding cracks in a dam. We enrich every edge with <strong>Dynamic Weight Management (DWM)</strong>, 
                    factoring in real-world zero-day status from the CISA Known Exploited Vulnerabilities catalog."
                  </p>
                </div>

                <div className="script-block">
                  <div className="script-timer">1:00 - 1:30</div>
                  <h4>3. Generative AI Real-Time Streaming</h4>
                  <p className="script-text">
                    "Once a path is computed, our integrated GenAI agent (powered by Groq and Llama 3.3) streams a play-by-play 
                    tactical narrative of the intrusion in real time. Following the narrative, it auto-generates actionable 
                    remediation instructions, prescribing specific vendor patch versions and firewall rules to neutralize each vulnerable hop."
                  </p>
                </div>

                <div className="script-block">
                  <div className="script-timer">1:30 - 2:00</div>
                  <h4>4. Enterprise Data Warehouse on BigQuery</h4>
                  <p className="script-text">
                    "Finally, for enterprise intelligence, every simulation run is streamed asynchronously into our 
                    <strong> Google BigQuery Data Warehouse</strong> structured in a <strong>Ralph Kimball Star Schema</strong>. 
                    Through multidimensional OLAP querying and our interactive SQL console, security leaders can run Star Joins 
                    to identify systemic chokepoints and audit defensive improvements over time. Thank you."
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 9: JARGON BUSTER */}
          {activeSection === "glossary" && (
            <div className="explainer-card">
              <div className="explainer-card__tag">CHAPTER 9</div>
              <h2>📖 The Jargon Buster (Cyber & DW Terms in Plain English)</h2>
              
              <div className="glossary-grid">
                <div className="glossary-card">
                  <div className="glossary-term">CVE</div>
                  <div className="glossary-pronounce">(Common Vulnerabilities & Exposures)</div>
                  <p>A global serial number for a specific software bug (e.g. <code>CVE-2021-41773</code>). Think of it like a recall notice on a car part.</p>
                </div>

                <div className="glossary-card">
                  <div className="glossary-term">CVSS</div>
                  <div className="glossary-pronounce">(Common Vulnerability Scoring System)</div>
                  <p>A standard danger score from 0.0 (harmless) to 10.0 (catastrophic) showing how easily a bug can be exploited.</p>
                </div>

                <div className="glossary-card">
                  <div className="glossary-term">CISA KEV</div>
                  <div className="glossary-pronounce">(Known Exploited Vulnerabilities)</div>
                  <p>The US Cybersecurity Agency’s list of software bugs that hackers are <em>actually actively using</em> in the wild right now.</p>
                </div>

                <div className="glossary-card">
                  <div className="glossary-term">Lateral Movement</div>
                  <div className="glossary-pronounce">(Hop-by-hop traversal)</div>
                  <p>A hacker moving sideways from one office computer to another inside a network until they find what they want.</p>
                </div>

                <div className="glossary-card">
                  <div className="glossary-term">Star Schema</div>
                  <div className="glossary-pronounce">(Kimball DW Architecture)</div>
                  <p>A database design where one central table of measurements (Fact table) is connected to descriptive lookup tables (Dimensions) like a star.</p>
                </div>

                <div className="glossary-card">
                  <div className="glossary-term">Surrogate Key</div>
                  <div className="glossary-pronounce">(Synthetic integer ID)</div>
                  <p>A clean, short number ID generated by the warehouse to make searching and joining millions of rows lightning fast.</p>
                </div>

                <div className="glossary-card">
                  <div className="glossary-term">PIGNN</div>
                  <div className="glossary-pronounce">(Physics-Informed Graph Neural Network)</div>
                  <p>An AI model that learns how attacks spread across connected networks by following physical laws like flow and resistance.</p>
                </div>

                <div className="glossary-card">
                  <div className="glossary-term">Chokepoint</div>
                  <div className="glossary-pronounce">(Strategic Bottleneck)</div>
                  <p>A single hallway or computer that most attack routes must pass through. If you protect it, you stop almost all attacks!</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
