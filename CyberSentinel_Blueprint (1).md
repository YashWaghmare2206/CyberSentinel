**CYBERSENTINEL**

**AI-Powered Cyber Attack Prediction Platform**

_Complete Project Blueprint - Hackathon 2025_

**_Predict. Prevent. Protect._**

PS10 - Generative AI for Cyber Attack Prediction | Banking Domain | Gen AI + Graph Analysis

_Document Contents: Problem Statement Analysis • Root Cause • Solution Design • Architecture • Build Plan • Code Guide_

# **Table of Contents**

**SECTION 1 - PROBLEM STATEMENT**

# **1\. The Problem Statement - PS10**

## **1.1 Official PS10 Statement**

**PS10 - Generative AI for Cyber Attack Prediction**

_Banks face persistent threats from malware, phishing attacks, and network intrusion. Traditional security systems react after attacks occur. The goal is to build a Generative AI powered system that can predict cyber attacks before they happen by analyzing vulnerability data, network topology, and past attack logs - generating predicted attack vectors, recommending security fixes, and producing automated incident response plans._

## **1.2 Breaking Down What PS10 Is Really Asking**

Let us decode every part of the problem statement so the requirements are crystal clear before a single line of code is written.

| **PS10 Phrase**                               | **What It Actually Means**                                                                                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Banks face persistent threats"**           | This sets the domain - banking. Every design decision must be made thinking about a bank's infrastructure: public-facing APIs, internal app servers, core banking systems, customer databases.     |
| **"Malware, phishing, network intrusion"**    | These are the three main attack categories the system must understand and reason about. Each has different entry points into a bank network.                                                       |
| **"Traditional systems react after attacks"** | This is the core gap being asked to fill. SIEM tools, firewalls, and IDS systems alert you after a breach. PS10 wants prediction before it happens.                                                |
| **"Generative AI powered"**                   | The key differentiator. Not just ML classifiers. The word Generative AI specifically means using LLMs - models that can reason, generate narratives, and explain their thinking in human language. |
| **"Analyze vulnerability data"**              | CVE (Common Vulnerabilities and Exposures) databases - the public record of every known software security flaw with severity scores.                                                               |
| **"Network topology"**                        | A map of how all servers, APIs, databases, and firewalls connect to each other inside the bank's infrastructure.                                                                                   |
| **"Past attack logs"**                        | Historical records of what attacks happened, when, which systems were hit, and how far the attacker got.                                                                                           |
| **"Predicted attack vectors"**                | The OUTPUT: specific paths an attacker would take through the network, explained step by step.                                                                                                     |
| **"Automated incident response"**             | Actionable fix instructions generated automatically - not just an alert, but telling the team exactly what to patch and how.                                                                       |

**SECTION 2 - THE REAL-WORLD PROBLEM**

# **2\. The Real-World Problem in Banking Cybersecurity**

## **2.1 The Scale of the Threat**

Banking is the most targeted sector for cyber attacks globally. Understanding the scale helps justify why an AI prediction system is not just useful - it is urgently needed.

| **\$6.08B**<br><br>Average annual cybercrime cost per bank | **277 days**<br><br>Average time to detect and contain a breach | **95%**<br><br>Of breaches involve human or process error | **4,800+**<br><br>New CVEs discovered every month globally |
| ---------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |

## **2.2 The Core Problem - Why Current Systems Fail**

Banks today use a combination of tools: firewalls, SIEM (Security Information and Event Management) systems, intrusion detection systems, and antivirus software. Every single one of these tools shares one fatal flaw - they are reactive. They sound the alarm after the attacker is already inside.

| **KEY** | _Imagine a burglar alarm that only rings after someone has already stolen your jewellery and left the building. That is exactly how traditional bank cybersecurity works today._ |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

There are three specific gaps in the current approach:

### **Gap 1 - CVE Data Exists But Is Not Connected to Your Network**

The National Vulnerability Database (NVD) publishes thousands of CVEs every month. Each CVE describes a specific software vulnerability - for example, CVE-2024-21413 describes a critical flaw in Microsoft Outlook that allows remote code execution. Banks know these vulnerabilities exist. But no existing tool automatically asks: "Which of our specific servers are running the vulnerable software, and if an attacker exploits this, which other systems can they reach from there?" This connection - between public CVE data and the bank's own network map - is the missing piece.

### **Gap 2 - Network Topology Is Never Analysed as an Attack Surface**

Banks have detailed network diagrams - which server connects to which, which APIs are public-facing, which databases are only accessible internally. But these diagrams are treated as operational documents, not as attack surface maps. Nobody runs pathfinding algorithms on them to ask: "What is the shortest path from the public internet to the customer account database?"

### **Gap 3 - No System Thinks Like an Attacker**

Human penetration testers (red teamers) simulate attacks manually. They think like attackers - probing for weak points, chaining vulnerabilities, pivoting from one compromised system to the next. This is expensive, slow (weeks of work), and happens infrequently (maybe once a year). There is no automated system that does this continuously and explains its reasoning in plain English.

## **2.3 A Concrete Real-World Example**

To make the problem tangible, here is a real-world attack scenario that CyberSentinel is designed to predict before it happens.

| **REAL ATTACK SCENARIO - The 2016 Bangladesh Bank Heist (\$81 Million Stolen)**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The attackers studied SWIFT (Society for Worldwide Interbank Financial Telecommunication) network connections for months before striking. They found: 1. An unpatched vulnerability in the bank's printer connected to the SWIFT terminal 2. The printer shared a network segment with the SWIFT workstation 3. The SWIFT workstation had credentials stored in plain text 4. Once on the SWIFT terminal, attackers could issue real transfer orders This is a textbook kill chain - four hops, each exploiting a known weakness. A system like CyberSentinel, fed the bank's network topology and CVE data, would have mapped this exact path and flagged it as CRITICAL weeks earlier. |

This example illustrates the exact problem CyberSentinel solves - connecting the dots between known vulnerabilities and the specific network paths they enable, BEFORE an attacker does.

**SECTION 3 - WHY SELECT THIS PROJECT**

# **3\. Why PS10 Is the Best Choice for This Hackathon**

## **3.1 The Three Criteria for a Winning Hackathon Project**

A winning hackathon project must score high on three dimensions simultaneously: real-world impact (does it solve a genuine problem?), technical depth (does it use interesting technology in a non-trivial way?), and wow factor (does the demo make judges stop and pay attention?). PS10 with CyberSentinel scores the highest across all three.

| **Problem Statement**              | **Core Technology Used**                                                              | **Differentiation Score** |
| ---------------------------------- | ------------------------------------------------------------------------------------- | ------------------------- |
| **PS10 - Cyber Attack Prediction** | Gen AI agent + Graph analysis + Streaming - three distinct AI layers working together | Highest                   |
| **PS3 - Fund Flow Graph**          | Graph analytics + Neo4j - technically interesting but no Gen AI narrative             | High                      |
| **PS1 - Internal Fraud Detection** | Anomaly detection + Behavioral profiling - solid but common approach                  | Medium                    |
| **PS5 - Complaint Dashboard**      | NLP + Sentiment analysis - straightforward, many teams will attempt similar           | Low                       |
| **PS7 - Self-Service Platform**    | Conversational AI - well-understood problem with many existing demos                  | Low                       |

## **3.2 Why PS10 Stands Out - Six Specific Reasons**

### **Reason 1 - The Demo Is Visually Dramatic**

When a judge watches a network graph with nodes turning red one by one as an AI streams its attacker reasoning in real time - word by word - that is a fundamentally different experience from watching a chart or a table. The visual + narrative combination is unique to this project. No other problem statement in this list offers that combination.

### **Reason 2 - The Problem Is Universally Understood**

You do not need to explain what a cyber attack is to any judge in a banking hackathon. The problem resonates instantly. Compare this to PS3 (fund flow graphs) which requires explaining graph theory concepts, or PS1 (internal fraud) which requires explaining behavioral profiling. PS10's problem statement - banks get hacked, we predict it before it happens - lands in under 10 seconds.

### **Reason 3 - Gen AI Is the Core, Not a Gimmick**

Many teams add an LLM as an afterthought - a chatbot on the side or a summary generator. In CyberSentinel, the Gen AI is the central engine. It is the component that makes the system work. The pathfinding gives raw data; the LLM turns it into actionable intelligence. Judges who understand AI will immediately see this is a genuine Gen AI application, not a superficial wrapper.

### **Reason 4 - Technical Depth Is Visible**

The architecture has multiple distinct technical layers: data ingestion and graph construction, pathfinding algorithms, risk scoring, LLM prompt engineering, streaming SSE (Server-Sent Events), and a React visualization. Each layer is something that can be explained individually during judging. This depth - having multiple interesting things to point at - is a significant advantage during Q&A.

### **Reason 5 - Real-World Deployment Is Plausible**

Judges in banking hackathons often ask: "Could this be deployed at a real bank?" CyberSentinel has a credible answer. A real bank could connect this system to its existing network scanner (replacing the mock JSON with live data), integrate with the NVD API (replacing mock CVEs with real ones), and have a working system. This plausibility is more persuasive than many other problem statements.

### **Reason 6 - Completely Free to Build**

The entire stack costs ₹0. Python, FastAPI, NetworkX, React, and Vite are all open source. The LLM layer can use Groq's free API (Llama 3) or Google's Gemini Flash free tier. No cloud hosting is needed for a hackathon demo - everything runs on a laptop. This means zero time wasted on billing setups, quotas, or deployment issues during the critical 24 hours.

| **WHY** | _Bottom line: PS10 is the project where a judge stops talking to the person next to them, looks at your screen, and says 'wait - what is that doing?' That moment is what wins hackathons._ |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

**SECTION 4 - THE SOLUTION**

# **4\. CyberSentinel - The Solution in Detail**

## **4.1 What CyberSentinel Does - Plain English**

CyberSentinel is a web application that takes a bank's network map and a list of known software vulnerabilities as input, builds a mathematical model of every possible path an attacker could follow through the network, and then uses a Large Language Model to reason through the most dangerous paths - producing a step-by-step kill chain narrative, a visual attack map, and specific instructions to fix every vulnerability it found.

| **EXAMPLE - What CyberSentinel Produces in 8 Seconds**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INPUT: Bank network with 15 nodes. 6 CVEs assigned across nodes. User clicks "Simulate Attack" ───────────────────────────────────────────────────── AI STREAMING OUTPUT (appears word by word on screen): ───────────────────────────────────────────────────── "Step 1: I begin at the Public API Gateway. This server is running Apache 2.4.49, which is vulnerable to CVE-2021-41773 - a path traversal flaw with CVSS score 9.8 (Critical). With a crafted HTTP request, I gain shell access. Step 2: From the API Gateway, I discover the App Server on the internal network. SSH keys are stored in environment variables (misconfiguration). I pivot using stolen credentials. Step 3: The App Server has read access to the Customer Database running PostgreSQL 12.1 - vulnerable to CVE-2021-3393. I extract the entire customer table: 2.4 million records. SEVERITY: CRITICAL. Attack path length: 3 hops. Time to exploit with basic tooling: estimated 2-4 hours." ───────────────────────────────────────────────────── AUTO-FIX: Patch Apache to 2.4.51+. Rotate SSH keys. Move DB to isolated VLAN. Enable query auditing. |

## **4.2 The Four Core Components**

### **Component 1 - Data Layer (JSON Files)**

Two JSON files form the foundation. The first is the network topology file - a list of nodes (servers, databases, APIs, firewalls) and edges (connections between them). The second is the CVE data file - a list of which CVEs apply to which node, along with their CVSS severity scores. In the hackathon version, these files are hand-crafted to represent a realistic bank. In a production system, they would be auto-populated by a network scanner and the National Vulnerability Database API.

| **EXAMPLE - network_topology.json (simplified)**                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| { "nodes": \[ {"id": "api_gw", "name": "Public API Gateway", "type": "public"}, {"id": "app_srv", "name": "App Server", "type": "internal"}, {"id": "core_db", "name": "Core Banking Database", "type": "critical"}, {"id": "firewall","name": "Internal Firewall", "type": "control"} \], "edges": \[ {"from": "api_gw", "to": "app_srv", "protocol": "HTTPS"}, {"from": "app_srv", "to": "core_db", "protocol": "PostgreSQL"}, {"from": "firewall","to": "core_db", "protocol": "admin"} \] } |

### **Component 2 - Graph Engine (NetworkX)**

NetworkX is a Python library for working with graphs (mathematical networks). It loads the JSON topology data and creates an in-memory graph where nodes represent bank systems and edges represent connections. The engine then runs Dijkstra's shortest path algorithm - modified to find paths weighted by vulnerability severity rather than distance - to identify the top attack paths from the public internet entry point to each critical target.

| **ANALOGY** | _Analogy: Think of the bank network as a city map. The attacker starts at the city gates (public API). The treasure is the vault (core DB). NetworkX finds every possible street route to the vault, then ranks them by how many unlocked doors exist along the way._ |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

### **Component 3 - The Gen AI Reasoning Agent (LLM)**

This is the star component. Once the graph engine has identified the top attack paths, the data is sent to a Large Language Model (Claude, Groq/Llama, or Gemini) with a carefully crafted system prompt. The LLM is instructed to think like a red-team attacker and produce a narrative kill chain - explaining each step in plain English. The output streams back token by token via Server-Sent Events, creating the live typewriter effect on the frontend.

| **EXAMPLE - The Exact System Prompt Sent to the LLM**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SYSTEM PROMPT: "You are a senior red-team security expert at a top bank. Given a bank network graph and a list of CVE vulnerabilities, your job is to think exactly like an attacker would. Output a numbered kill chain showing: 1. Which node to attack first and why 2. How to exploit the specific CVE (name it by ID) 3. How to pivot to the next node 4. What the end target is and what data is at risk Be specific. Name the CVEs. Name the nodes by their actual labels. End with a severity verdict: CRITICAL / HIGH / MEDIUM. Keep it under 300 words. Stream your response." USER MESSAGE (built dynamically by FastAPI): "Network graph: \[JSON\] Vulnerable path: API Gateway (CVE-2021-41773, CVSS 9.8) → App Server (CVE-2022-0847, CVSS 7.8) → Core Banking DB (CVE-2021-3393, CVSS 6.5) Generate the attack simulation." |

### **Component 4 - React Dashboard (The UI)**

The React frontend has three visual panels working simultaneously. The left panel shows the network graph as an interactive diagram using React Flow - nodes are colored by risk severity (red for critical, amber for medium, green for safe) and the attack path animates node by node. The right panel shows the LLM's streaming output - each word appears in real time as the AI generates it. The bottom panel shows the auto-generated fix instructions produced by a second LLM call after the simulation completes.

**SECTION 5 - SYSTEM ARCHITECTURE**

# **5\. Complete System Architecture**

## **5.1 Architecture Overview - Layer by Layer**

The architecture has four layers stacked on top of each other. Each layer has a single responsibility. Data flows upward through the layers - raw JSON becomes a graph, the graph becomes risk scores, risk scores become an AI narrative, the narrative becomes a visual dashboard.

| **Layer**                              | **Responsibility and Technology**                                                                                                                                                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Layer 1 - Data Inputs**              | Two JSON files: bank network topology (nodes + edges) and CVE vulnerability data (CVE IDs + CVSS scores per node). For the hackathon these are static mock files. In production they would connect to live network scanners and the NVD API. |
| **Layer 2 - Python Backend (FastAPI)** | A REST API server built with FastAPI. It hosts all business logic: loading JSON, building the graph, running pathfinding, scoring risks, calling the LLM API, and streaming the response back. This is where all the intelligence lives.     |
| **Layer 3 - Gen AI Agent (LLM API)**   | A call to an external LLM (Groq, Gemini, or Claude). The backend sends the attack path data + system prompt and receives a streaming kill-chain narrative in return. This is the only external dependency in the entire system.              |
| **Layer 4 - React Frontend**           | A single-page React application. It has three panels: network graph visualization (React Flow), streaming AI output panel, and risk cards / fix suggestions. It connects to the backend via REST and SSE (Server-Sent Events for streaming). |

## **5.2 Request Lifecycle - What Happens When You Click "Simulate Attack"**

Understanding the complete request lifecycle is critical for building the system. Here is the exact sequence of events from button click to final output, with timing estimates.

| **Step & Timing**              | **What Happens**                                                                                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Step 1 (0ms)**               | Judge clicks 'Simulate Attack' button in the React UI. React fires a POST request to the FastAPI /simulate endpoint.                                                                                       |
| **Step 2 (5ms)**               | FastAPI receives the request. It loads the network topology JSON and CVE JSON from disk into memory.                                                                                                       |
| **Step 3 (20ms)**              | FastAPI builds a NetworkX directed graph from the topology data. Each node gets a risk weight based on its CVE's CVSS score.                                                                               |
| **Step 4 (50ms)**              | NetworkX runs modified Dijkstra pathfinding from the entry node (public API gateway) to each critical target node. Returns top 3 attack paths ranked by total risk score.                                  |
| **Step 5 (100ms)**             | FastAPI constructs the LLM prompt - embedding the top attack path data and CVE details into the user message. Sends the request to the LLM API with streaming enabled.                                     |
| **Step 6 (500ms-8s)**          | The LLM API begins streaming its response token by token. FastAPI uses SSE (Server-Sent Events) to push each token to the React frontend as it arrives.                                                    |
| **Step 7 (simultaneous)**      | React receives each SSE token and appends it to the streaming text panel. Simultaneously, React uses the attack path data to animate graph nodes - turning them red one by one in sync with the narrative. |
| **Step 8 (after stream ends)** | A second API call is made to the LLM with a different prompt: 'Given these vulnerabilities, write specific fix instructions.' The response populates the auto-fix panel.                                   |

## **5.3 Technology Stack - Every Tool Explained**

| **Technology**            | **Why This Choice**                                                                                                                                                | **Cost**              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| **Python 3.10+**          | Primary backend language. Well-supported, fast to write, excellent library ecosystem for data and AI work.                                                         | Free - open source    |
| **FastAPI**               | Modern Python web framework. Chosen specifically because it has built-in SSE (streaming) support, automatic API docs, and is very fast to develop with.            | Free - open source    |
| **NetworkX**              | Python graph analysis library. Used to build the bank network as a mathematical graph and run pathfinding algorithms. No database required - everything in memory. | Free - open source    |
| **Groq API (Llama 3)**    | Free LLM inference API. Llama 3 70B gives excellent reasoning quality. The API is completely free with generous rate limits. Signup takes 2 minutes at groq.com.   | Free - no card needed |
| **Google Gemini Flash**   | Alternative free LLM API. Gemini 1.5 Flash offers 15 requests/minute and 1 million tokens/day free. More than sufficient for a 24-hour hackathon.                  | Free - no card needed |
| **Claude API (optional)** | Anthropic's Claude claude-sonnet-4-5 model. Best reasoning quality. \$5 free signup credit covers entire hackathon usage. Use if best output quality is needed.    | ~₹0 with free credit  |
| **React + Vite**          | Frontend JavaScript framework. Vite is the build tool - extremely fast hot reload for development. This is the industry standard for modern React projects.        | Free - open source    |
| **React Flow**            | React library for interactive node-edge graph visualization. Handles the animated network diagram. Free tier is fully sufficient for the hackathon.                | Free - open source    |
| **Mock JSON files**       | Hand-crafted network topology and CVE data. No database, no cloud setup, no cost. 15 nodes, 6 CVEs - enough to demonstrate the full system convincingly.           | Free - you write it   |

**SECTION 6 - STRUCTURED 24-HOUR BUILD PLAN**

# **6\. The Complete 24-Hour Build Plan**

## **6.1 Pre-Hackathon Setup (Do This the Day Before)**

The most important thing to do before the hackathon starts is to set up the development environment so that the first hour is writing code - not installing tools. Everything in this list takes about 30 minutes.

- Install Node.js v18+ from nodejs.org - required for React/Vite frontend
- Install Python 3.10+ from python.org - required for backend
- Create a free account at groq.com - takes 2 minutes, no payment info needed
- Generate and save the Groq API key - store it in a .env file, never hardcode it
- Run: npm install -g create-vite - pre-download the Vite scaffolding tool
- Run: pip install fastapi uvicorn networkx python-dotenv httpx - pre-download all Python packages
- Test the Groq API with a simple Python script to confirm the key works
- Create a GitHub repository for the project - commit and push setup files

| **CRITICAL** | _If you do nothing else from this document, do the pre-hackathon setup. Teams that start the hackathon waiting for downloads or fixing API key issues lose 2-3 critical hours._ |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

## **6.2 Phase 1 - Data and Graph Foundation (Hours 0 to 2)**

The first two hours are about building the foundation. Nothing visible gets built yet - this is purely data and backend infrastructure. But if this phase is done correctly, everything else builds on solid ground.

### **Task 1.1 - Create Mock Network Topology JSON**

Create a file called data/network.json with 15 nodes representing a realistic bank network. Include: 1 public API gateway, 2 web application servers, 1 load balancer, 2 internal API services, 1 message queue, 2 application databases, 1 core banking system, 1 customer data warehouse, 1 internal firewall, 1 admin console, and 1 SWIFT terminal (the ultimate target). Add edges connecting them as they would be in a real bank.

| **EXAMPLE - One Node Entry in network.json**                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| { "id": "api_gateway_01", "name": "Public REST API Gateway", "type": "public_facing", "ip": "10.0.1.1", "software": "Apache 2.4.49", "os": "Ubuntu 20.04", "criticality": 6 } |

### **Task 1.2 - Create Mock CVE Data JSON**

Create a file called data/cves.json assigning real CVE IDs (from the NVD website) to your nodes. Use 6-8 CVEs total. Include for each: the CVE ID, CVSS score (0-10), affected software, description, and the node ID it applies to. Using real CVE IDs makes the demo significantly more credible - judges can look them up and verify they are real.

| **EXAMPLE - One CVE Entry in cves.json**                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| { "cve_id": "CVE-2021-41773", "node_id": "api_gateway_01", "cvss_score": 9.8, "severity": "CRITICAL", "description": "Path traversal flaw in Apache 2.4.49 allows remote code execution without authentication", "exploit_type": "Remote Code Execution", "patch": "Upgrade Apache to version 2.4.51 or later" } |

### **Task 1.3 - Build the FastAPI Project Structure**

Create the backend project structure. The project should have a clean layout from the start - this saves significant time during the demo when a judge asks to see the code.

| **Project Folder Structure**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cybersentinel/ ├── backend/ │ ├── main.py ← FastAPI app entry point │ ├── graph.py ← NetworkX graph logic │ ├── scorer.py ← Risk scoring functions │ ├── llm.py ← LLM API calls + streaming │ ├── data/ │ │ ├── network.json ← Bank topology mock data │ │ └── cves.json ← CVE vulnerability data │ └── .env ← API keys (NEVER commit this) ├── frontend/ │ ├── src/ │ │ ├── App.jsx │ │ ├── components/ │ │ │ ├── NetworkGraph.jsx │ │ │ ├── StreamPanel.jsx │ │ │ └── RiskCards.jsx │ └── package.json └── README.md |

### **Task 1.4 - Implement the Graph Engine**

In graph.py, write the code that loads the JSON files, builds the NetworkX directed graph, assigns risk weights to each node based on its CVE CVSS score, and runs pathfinding. The pathfinding should return the top 3 attack paths from the entry node to the most critical target nodes, ranked by total risk score.

| **EXAMPLE - Core Graph Logic in graph.py**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| import networkx as nx import json def build_graph(network_path, cve_path): with open(network_path) as f: network = json.load(f) with open(cve_path) as f: cves = {c\["node_id"\]: c for c in json.load(f)} G = nx.DiGraph() for node in network\["nodes"\]: cve = cves.get(node\["id"\]) risk = cve\["cvss_score"\] if cve else 0 G.add_node(node\["id"\], \*\*node, risk=risk, cve=cve) for edge in network\["edges"\]: G.add_edge(edge\["from"\], edge\["to"\]) return G def find_attack_paths(G, entry="api_gateway_01", target="swift_terminal"): # Weight = inverse of risk (high risk = low weight = preferred path) for u, v in G.edges(): G\[u\]\[v\]\["weight"\] = 10 - G.nodes\[v\].get("risk", 0) try: path = nx.dijkstra_path(G, entry, target, weight="weight") return \[{"path": path, "nodes": \[G.nodes\[n\] for n in path\]}\] except nx.NetworkXNoPath: return \[\] |

## **6.3 Phase 2 - Gen AI Agent Core (Hours 2 to 6)**

This is the most important phase. The Gen AI agent is the heart of the project and the feature that will win the hackathon. Spend more time here than anywhere else - a well-crafted prompt is worth more than polished UI.

| **TIP** | _Spend at least 2 of these 4 hours on prompt engineering alone. Run 20+ test prompts. The difference between a good kill-chain narrative and a great one is entirely in the prompt. This is where judges will be most impressed._ |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

### **Task 2.1 - Set Up the LLM Client in llm.py**

Write a Python function that takes an attack path object, constructs the full prompt, sends it to the Groq API with streaming enabled, and yields tokens as a Python generator. The streaming is done using the httpx library's async streaming client.

| **EXAMPLE - LLM Streaming Function in llm.py**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| import httpx, os from dotenv import load_dotenv load_dotenv() SYSTEM_PROMPT = """ You are a senior red-team cybersecurity expert at a major bank. Given a network graph and CVE vulnerability list, think EXACTLY like an attacker. Output a numbered kill chain: 1. Which node to attack first and the specific CVE to exploit 2. Exactly how to execute the exploit (technical but readable) 3. How to pivot to the next node using credentials or flaws found 4. What data is at risk at the final target End with: SEVERITY: CRITICAL/HIGH/MEDIUM and estimated time. """ async def stream_attack_simulation(attack_path: dict): user_msg = f"Network path: {attack_path\['path'\]}\\n" for node in attack_path\["nodes"\]: if node.get("cve"): user_msg += f" {node\['name'\]}: {node\['cve'\]\['cve_id'\]} " user_msg += f"(CVSS {node\['cve'\]\['cvss_score'\]}) - " user_msg += f"{node\['cve'\]\['description'\]}\\n" async with httpx.AsyncClient() as client: async with client.stream("POST", "<https://api.groq.com/openai/v1/chat/completions>", headers={"Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}"}, json={"model": "llama3-70b-8192", "stream": True, "messages": \[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_msg}\]} ) as response: async for line in response.aiter_lines(): if line.startswith("data: ") and "\[DONE\]" not in line: import json chunk = json.loads(line\[6:\]) token = chunk\["choices"\]\[0\]\["delta"\].get("content", "") if token: yield token |

### **Task 2.2 - Create the /simulate SSE Endpoint in main.py**

Create a FastAPI endpoint that: receives a POST request, runs the graph pathfinding, and then returns an SSE (Server-Sent Events) streaming response where each event contains one token from the LLM. This is what creates the typewriter effect in the browser.

| **EXAMPLE - SSE Streaming Endpoint in main.py**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| from fastapi import FastAPI from fastapi.responses import StreamingResponse from graph import build_graph, find_attack_paths from llm import stream_attack_simulation app = FastAPI() G = build_graph("data/network.json", "data/cves.json") @app.post("/simulate") async def simulate(): paths = find_attack_paths(G) if not paths: return {"error": "No attack paths found"} top_path = paths\[0\] async def event_generator(): # First send the path data for graph animation import json yield f"data: {json.dumps({'type': 'path', 'data': top_path})}\\n\\n" # Then stream the LLM narrative async for token in stream_attack_simulation(top_path): yield f"data: {json.dumps({'type': 'token', 'data': token})}\\n\\n" yield "data: \[DONE\]\\n\\n" return StreamingResponse(event_generator(), media_type="text/event-stream") |

### **Task 2.3 - Prompt Engineering - Getting the Best Output**

The system prompt is the single most important piece of code in the project. Iterate on it until the output is detailed, specific, and narratively compelling. Here are the principles for a great attacker simulation prompt:

- Always specify the persona: 'You are a senior red-team expert' - role assignment dramatically improves output quality
- Require CVE IDs to be named explicitly: 'Name the CVE IDs and CVSS scores' - this makes the output credible and verifiable
- Require node names to be used: 'Refer to each server by its exact name' - this personalizes the output to the specific network
- Add a length constraint: 'Keep under 300 words' - prevents rambling and keeps the stream tight and impactful
- Require a verdict at the end: 'End with SEVERITY: CRITICAL/HIGH/MEDIUM' - gives judges a clear takeaway
- Ask for time estimates: 'Estimate how long this attack would take a skilled attacker' - adds realism

## **6.4 Phase 3 - React Frontend Dashboard (Hours 6 to 14)**

With the backend complete and tested, build the React frontend. Start with Vite scaffolding, then build the three main components: the network graph, the streaming text panel, and the risk cards.

### **Task 3.1 - Scaffold the React Project**

Run the following commands to create the React project with Vite and install all required dependencies. This should take under 5 minutes.

| **Terminal Commands - Frontend Setup**                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cd cybersentinel/ npx create-vite@latest frontend --template react cd frontend npm install npm install reactflow axios npm run dev # verify it runs on localhost:5173 |

### **Task 3.2 - Build the NetworkGraph Component**

The NetworkGraph component is the visual centerpiece. It uses React Flow to render the bank network as an interactive diagram. Nodes are colored by risk level: red (#E74C3C) for critical, orange (#F39C12) for medium, green (#2ECC71) for low or no CVE. When the attack simulation runs, the component animates each node in the attack path to red in sequence, timed to match the streaming narrative.

| **UI TIP** | _Design tip: Make the network graph fill the left 60% of the screen. The streaming text panel fills the right 40%. This ratio gives the graph enough space to be visually impressive while keeping the narrative readable._ |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

### **Task 3.3 - Build the StreamPanel Component**

The StreamPanel component listens to the SSE stream from the backend and renders each token as it arrives. The key implementation detail is appending tokens to a React state string - React's re-rendering on each state update creates the typewriter effect automatically. Add a blinking cursor at the end of the current text using a CSS animation.

| **EXAMPLE - StreamPanel Core Logic**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| import { useState, useEffect } from "react"; function StreamPanel({ isSimulating }) { const \[text, setText\] = useState(""); useEffect(() => { if (!isSimulating) return; setText(""); // Clear previous const es = new EventSource("<http://localhost:8000/simulate>"); // Note: EventSource only supports GET. // For POST+SSE use fetch() with ReadableStream instead. es.onmessage = (e) => { if (e.data === "\[DONE\]") { es.close(); return; } const msg = JSON.parse(e.data); if (msg.type === "token") { setText(prev => prev + msg.data); } }; return () => es.close(); }, \[isSimulating\]); return ( &lt;div className="stream-panel"&gt; &lt;pre&gt;{text}&lt;span className="cursor"&gt;\|&lt;/span&gt;&lt;/pre&gt; &lt;/div&gt; ); } |

### **Task 3.4 - Build the RiskCards Component**

The RiskCards component renders a card for each vulnerable node in the attack path. Each card shows the node name, the CVE ID with a link to the NVD database, the CVSS score displayed as a colored badge, and a one-line description of the vulnerability. These appear at the bottom of the dashboard and give judges something to point at during questions.

## **6.5 Phase 4 - Auto-Fix Agent and Polish (Hours 14 to 20)**

With the core functionality working, add the second Gen AI agent (the fix generator) and spend time on visual polish. A polished demo is significantly more convincing than a functional-but-rough one.

### **Task 4.1 - Build the Auto-Fix Generator**

Add a second endpoint to FastAPI: POST /fix. This endpoint takes the same attack path data and sends it to the LLM with a different system prompt - one that asks for specific, actionable remediation steps for each CVE found in the attack path. The output should be concrete: exact version numbers to upgrade to, specific firewall rules, configuration changes.

| **EXAMPLE - Auto-Fix System Prompt**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIX_PROMPT = """ You are a senior DevSecOps engineer at a major bank. Given a list of CVEs found in an attack path, write specific remediation steps for each vulnerability. For each CVE, provide: 1. Exact patch/upgrade command (e.g. apt upgrade apache2=2.4.51) 2. Configuration change needed (specific file and line) 3. Network-level mitigation (firewall rule if applicable) 4. Priority: implement within \[1 hour / 24 hours / 1 week\] Be specific. Include exact version numbers, file paths, and command syntax. A junior sysadmin should be able to follow these instructions without further guidance. """ |

### **Task 4.2 - Visual Polish Checklist**

Go through this checklist before the demo. Each item takes under 15 minutes but significantly improves the judge's impression.

- Add a severity badge to the top of the dashboard - a large colored pill saying CRITICAL / HIGH / MEDIUM that appears after simulation completes
- Add a risk score number (0-10) to each node in the network graph - visible on hover
- Add a 'Simulate Attack' button with a loading animation (spinning indicator) while the LLM is streaming
- Add a 'Reset' button that clears all red nodes and the stream panel for a clean second demo
- Add color-coded borders to RiskCards: red border for CVSS 8+, orange for 5-7, green for below 5
- Set the page title to 'CyberSentinel - Cyber Attack Prediction' in the browser tab
- Use a dark background (#0A0F2C) for the dashboard - it looks more like a real security operations center

## **6.6 Phase 5 - Demo Preparation (Hours 20 to 24)**

The last four hours are not for building - they are for preparing. A project that is 80% built but demonstrated perfectly will often beat a project that is 100% built but demonstrated poorly.

### **Task 5.1 - Freeze the Feature Set**

At the 20-hour mark, stop building new features. Whatever is built is what gets demonstrated. Every minute after this point goes toward rehearsing, documenting, and hardening what already exists. This is one of the most common mistakes in hackathons - teams keep building until the last minute and then stumble on the demo.

### **Task 5.2 - Prepare the Demo Script**

Write and rehearse a 5-minute demo script. The script should have four parts. In the first 60 seconds, state the problem: banks get hacked because their security tools react after the fact - show one statistic. In the next 60 seconds, state the solution: CyberSentinel predicts attacks before they happen by simulating attacker thinking with Gen AI. In the next 2 minutes, run the live demo: open the dashboard, show the network, click Simulate Attack, let the graph animate and the AI stream in silence - do not talk while the AI is streaming, let the output speak for itself. In the final minute, point at the auto-fix panel and explain the end-to-end value.

### **Task 5.3 - Prepare for Common Judge Questions**

Judges in banking hackathons consistently ask the same questions. Prepare answers in advance.

| **Question**                                         | **Prepared Answer**                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **How does it work if the network data is fake?**    | In a real deployment, the network JSON would be generated automatically by a network scanner like Nmap or a SIEM integration. The AI logic and architecture are identical - only the data source changes. We built with mock data to demonstrate the system without needing access to a real bank network. |
| **What if the LLM gives wrong information?**         | The LLM narrates the paths found by the graph algorithm - it cannot invent paths that do not exist in the data. The graph engine provides the factual backbone; the LLM provides the explanation. Think of it as GPS navigation (graph) with a human voice (LLM) reading out the directions.               |
| **How is this different from existing SIEM tools?**  | Every SIEM tool on the market alerts after a threat is detected. CyberSentinel predicts before. No existing commercial tool uses an LLM to simulate attacker reasoning and narrate a kill chain from your specific network topology.                                                                       |
| **Can it handle a real bank's 10,000-node network?** | For the hackathon, 15 nodes demonstrate the concept clearly. At scale, NetworkX handles graphs with hundreds of thousands of nodes efficiently. The LLM would be called with summarized path data, not the full graph - standard RAG (Retrieval Augmented Generation) patterns apply.                      |
| **What is the cost to run this at a real bank?**     | The infrastructure cost is near zero - Python and React are free. The only variable cost is the LLM API. At typical bank usage (100 simulations per day), the monthly LLM cost would be approximately \$15-50 depending on the model chosen.                                                               |

**SECTION 7 - QUICK REFERENCE**

# **7\. Quick Reference - Commands, APIs, and Checklist**

## **7.1 All Terminal Commands in Order**

| **Complete Setup Commands - Run These in Order**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| \# ─── BACKEND SETUP ─────────────────────────────────── mkdir cybersentinel && cd cybersentinel python -m venv venv && source venv/bin/activate pip install fastapi uvicorn networkx python-dotenv httpx mkdir backend && cd backend # Create .env file: echo "GROQ_API_KEY=your_key_here" > .env # ─── FRONTEND SETUP ────────────────────────────────── cd .. && npx create-vite@latest frontend --template react cd frontend && npm install && npm install reactflow axios # ─── RUN THE PROJECT ───────────────────────────────── # Terminal 1 - Backend: cd backend && uvicorn main:app --reload --port 8000 # Terminal 2 - Frontend: cd frontend && npm run dev # Open: <http://localhost:5173> |

## **7.2 Real CVE IDs to Use in Mock Data**

Use these real, verified CVE IDs in the mock data. They are all publicly documented, credible, and represent the exact type of vulnerabilities that appear in real bank breaches.

| **CVE ID**         | **CVSS** | **Description and Banking Relevance**                                                                      |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| **CVE-2021-41773** | 9.8      | Apache 2.4.49 - path traversal allowing remote code execution. Used in real attacks days after disclosure. |
| **CVE-2022-0847**  | 7.8      | 'Dirty Pipe' - Linux kernel privilege escalation. Allows any user to become root on affected servers.      |
| **CVE-2021-3393**  | 6.5      | PostgreSQL - partial-index queries can leak data to unauthorized users. Directly relevant to banking DBs.  |
| **CVE-2022-22965** | 9.8      | 'Spring4Shell' - remote code execution in Spring Framework. Affects most Java-based banking applications.  |
| **CVE-2021-44228** | 10.0     | 'Log4Shell' - critical RCE in Log4j logging library. Present in millions of enterprise Java applications.  |
| **CVE-2022-1388**  | 9.8      | F5 BIG-IP - unauthenticated RCE in network load balancers. Common in banking infrastructure.               |

## **7.3 Final 24-Hour Checklist**

Use this checklist to track progress during the hackathon. Mark each item as it is completed.

| **Checkpoint**          | **Success Criteria**                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| **\[ \] Pre-hackathon** | Node.js, Python, Groq API key all set up. Project folder created. Git repository initialized. |
| **\[ \] Hour 0-1**      | network.json created with 15 nodes. cves.json created with 6 real CVE IDs. Data validated.    |
| **\[ \] Hour 1-2**      | FastAPI project scaffolded. graph.py complete. find_attack_paths() returns correct results.   |
| **\[ \] Hour 2-4**      | llm.py complete. Groq API returns streaming response. System prompt tested 10+ times.         |
| **\[ \] Hour 4-6**      | /simulate endpoint returns SSE stream. Backend tested end-to-end with curl or Postman.        |
| **\[ \] Hour 6-8**      | React project created. NetworkGraph component renders all 15 nodes with correct colors.       |
| **\[ \] Hour 8-12**     | StreamPanel connects to SSE stream. Tokens appear word by word. Typewriter effect works.      |
| **\[ \] Hour 12-14**    | RiskCards component shows CVE details. Full dashboard layout assembled and responsive.        |
| **\[ \] Hour 14-17**    | /fix endpoint complete. Auto-fix panel appears after simulation. Second LLM call works.       |
| **\[ \] Hour 17-20**    | All polish items from Task 4.2 complete. Full end-to-end demo runs without errors.            |
| **\[ \] Hour 20-22**    | Demo script written and rehearsed 3 times. Judge Q&A answers prepared.                        |
| **\[ \] Hour 22-24**    | Backup screen recording made. README updated. Code committed and pushed to GitHub.            |

| **FINAL** | _One final advice: when the AI is streaming during the demo, say nothing. Let the text appear on screen in silence. The judges will read it. That 8-second silence while an AI narrates an attack path is more powerful than any words you can say._ |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

**SECTION 8 - COMPLETE SOFTWARE & TOOLS GUIDE**

# **8\. Every Software and Tool You Need - With Free Alternatives**

This section is the complete reference for every piece of software required to build CyberSentinel. For every tool, you will find: what it does, the exact download link, the installation command, whether it is free, and the best free alternative if it has a cost. Everything listed here has been verified to work together on Windows, macOS, and Linux.

| **COST** | _Every single tool needed to build CyberSentinel is either completely free or has a completely free alternative that works just as well for a hackathon. Your total cost is ₹0._ |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

## **8.1 System-Level Software - Install These First**

These are foundational tools that must be installed before anything else. They are the runtime environments that all other software depends on.

### **Python 3.10 or Higher**

| **Detail**           | **Information**                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**       | The programming language used for the entire backend - graph engine, API server, risk scoring, and LLM calls. Python is the industry standard for AI and data work.                                              |
| **Cost**             | Completely FREE - open source, always will be.                                                                                                                                                                   |
| **Download link**    | <https://www.python.org/downloads/> - click the big yellow button for your OS.                                                                                                                                   |
| **Install command**  | Windows: run the .exe installer. Tick 'Add Python to PATH' during install. macOS: python3 --version (pre-installed on most Macs, update if below 3.10) Linux: sudo apt install python3.10 python3-pip            |
| **Verify install**   | Open terminal and type: python --version Should print: Python 3.10.x or higher                                                                                                                                   |
| **Free alternative** | No alternative needed - Python itself is free. If Python is unavailable for any reason, Node.js can run the entire backend using JavaScript (Fastify + js-graph-algorithms), but Python is strongly recommended. |

### **Node.js v18 or Higher (with npm)**

| **Detail**           | **Information**                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What it is**       | The JavaScript runtime required to run React and Vite. npm (Node Package Manager) comes bundled with it and is used to install all frontend libraries.                   |
| **Cost**             | Completely FREE - open source.                                                                                                                                           |
| **Download link**    | <https://nodejs.org/en/download> - download the LTS (Long Term Support) version.                                                                                         |
| **Install command**  | Windows/macOS: run the installer from nodejs.org. Linux: curl -fsSL <https://deb.nodesource.com/setup_18.x> \| sudo -E bash - && sudo apt install nodejs                 |
| **Verify install**   | node --version (should print v18.x.x or higher) npm --version (should print 9.x.x or higher)                                                                             |
| **Free alternative** | Bun (<https://bun.sh>) - a faster alternative to Node.js that is also free. Use 'bun install' instead of 'npm install'. However, Node.js is more stable and recommended. |

### **Git (Version Control)**

| **Detail**           | **Information**                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**       | Version control system. Used to save code checkpoints during the hackathon, collaborate with teammates, and submit the project to GitHub for judging.           |
| **Cost**             | Completely FREE - open source.                                                                                                                                  |
| **Download link**    | <https://git-scm.com/downloads> - all platforms supported.                                                                                                      |
| **Install command**  | Windows: run Git for Windows installer (includes Git Bash terminal). macOS: git --version (triggers automatic install on first use) Linux: sudo apt install git |
| **Verify install**   | git --version (should print git version 2.x.x)                                                                                                                  |
| **Free alternative** | GitHub Desktop (<https://desktop.github.com>) - free GUI app if command-line git feels uncomfortable. Does the same thing with a visual interface.              |

### **A Code Editor - VS Code (Recommended)**

| **Detail**                 | **Information**                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**             | The application where you write all the code. VS Code is the most popular editor for Python and JavaScript development, with excellent extensions for both.                                                                               |
| **Cost**                   | Completely FREE - open source by Microsoft.                                                                                                                                                                                               |
| **Download link**          | <https://code.visualstudio.com/download>                                                                                                                                                                                                  |
| **Recommended extensions** | Python (by Microsoft) - Python language support ES7+ React Snippets - React shortcuts Pylance - Python type checking Thunder Client - test API endpoints without leaving VS Code DotENV - highlights .env files                           |
| **Free alternatives**      | PyCharm Community Edition (<https://www.jetbrains.com/pycharm/download>) - free, excellent for Python. Vim / NeoVim - free, terminal-based, steep learning curve. Sublime Text - free for evaluation, one-time \$99 license for full use. |

## **8.2 Python Backend Libraries - Install via pip**

All Python libraries are installed using pip, the Python package manager. Run the master install command below once, and all backend dependencies will be ready.

| **Master Install Command - Run This Once**                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pip install fastapi uvicorn networkx python-dotenv httpx # Verify everything installed correctly: pip list \| grep -E 'fastapi\|uvicorn\|networkx\|dotenv\|httpx' |

### **FastAPI**

| **Detail**             | **Information**                                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**       | The web framework for the Python backend. Handles all HTTP requests, API routes, and SSE (streaming) responses. Chosen because it is the fastest Python framework to develop with and has built-in streaming support.       |
| **Download / install** | <https://fastapi.tiangolo.com>                                                                                                                                                                                              |
| **Cost**               | Completely FREE - open source.                                                                                                                                                                                              |
| **Free alternatives**  | Flask (pip install flask) - older, simpler framework. Free but requires manual SSE setup. Django (pip install django) - full-featured but heavyweight for a hackathon. Bottle - ultra-minimal, free, single-file framework. |

### **Uvicorn**

| **Detail**             | **Information**                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**       | The ASGI server that runs the FastAPI application. Think of it as the engine that makes the API accessible on localhost:8000. Required to run FastAPI locally. |
| **Download / install** | pip install uvicorn (no separate download)                                                                                                                     |
| **Cost**               | Completely FREE - open source.                                                                                                                                 |
| **Free alternatives**  | Hypercorn (pip install hypercorn) - alternative ASGI server, also free. Either works.                                                                          |

### **NetworkX**

| **Detail**             | **Information**                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**       | Python library for creating, analysing, and running algorithms on graphs (networks). This is what builds the bank network model and finds attack paths using Dijkstra's algorithm. |
| **Download / install** | <https://networkx.org>                                                                                                                                                             |
| **Cost**               | Completely FREE - open source, maintained by academia.                                                                                                                             |
| **Free alternatives**  | igraph (pip install python-igraph) - faster for very large graphs, also free. Graph-tool - extremely fast, free, but harder to install on Windows.                                 |

### **python-dotenv**

| **Detail**             | **Information**                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What it does**       | Loads environment variables (like your API key) from a .env file into Python. This keeps your secret API key out of the code so it cannot be accidentally committed to GitHub. |
| **Download / install** | pip install python-dotenv                                                                                                                                                      |
| **Cost**               | Completely FREE - open source.                                                                                                                                                 |
| **Free alternatives**  | os.environ directly - just set environment variables in the terminal before running. No library needed but less convenient.                                                    |

### **httpx**

| **Detail**             | **Information**                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**       | Modern HTTP client for Python. Used to make async (non-blocking) requests to the LLM API with streaming support. Standard requests library does not support async streaming. |
| **Download / install** | pip install httpx                                                                                                                                                            |
| **Cost**               | Completely FREE - open source.                                                                                                                                               |
| **Free alternatives**  | aiohttp (pip install aiohttp) - alternative async HTTP library, also free. requests (pip install requests) - simpler but does not support async streaming properly.          |

## **8.3 LLM (AI) APIs - The Brain of CyberSentinel**

This is the most critical choice in the entire stack. The LLM API is what generates the attacker simulation narrative. All three options below work with nearly identical code - only the API endpoint URL and authentication header change between them.

| **REC** | _Recommendation for hackathon: Start with Groq (Option A). It is free, fast, and requires no payment info. If the output quality is not good enough, switch to Claude or Gemini - it is a 2-line code change._ |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

### **Option A - Groq API with Llama 3 (RECOMMENDED - Completely Free)**

| **Detail**             | **Information**                                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**         | Groq is an AI inference company that offers free API access to Meta's Llama 3 models. Llama 3 70B is an open-source model with excellent reasoning ability - sufficient for compelling attack narratives. |
| **Cost**               | COMPLETELY FREE. No credit card required. No hidden costs. Generous free tier with rate limits that are more than sufficient for a hackathon.                                                             |
| **Sign up link**       | <https://console.groq.com> - click 'Sign Up', use Google/GitHub login. Takes under 2 minutes.                                                                                                             |
| **Get API key**        | After login: click 'API Keys' in the left sidebar → 'Create API Key' → copy the key → paste into your .env file as: GROQ_API_KEY=gsk_xxxxxxxxxxxx                                                         |
| **Rate limits (free)** | 30 requests per minute, 14,400 requests per day, 500,000 tokens per minute. Far more than needed for any hackathon.                                                                                       |
| **Models available**   | llama3-70b-8192 (recommended - best quality) llama3-8b-8192 (faster, slightly lower quality) mixtral-8x7b-32768 (good alternative)                                                                        |
| **Code to use it**     | API endpoint: <https://api.groq.com/openai/v1/chat/completions> Header: Authorization: Bearer YOUR_GROQ_API_KEY Body format: OpenAI-compatible JSON (same format as ChatGPT API)                          |

### **Option B - Google Gemini Flash API (Free Tier - No Card Needed)**

| **Detail**          | **Information**                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**      | Google's Gemini 1.5 Flash model via the AI Studio API. Flash is optimized for speed - it streams responses very quickly, which makes the typewriter effect look especially impressive. |
| **Cost**            | FREE TIER: 15 requests per minute, 1 million tokens per day, 1,500 requests per day. No payment required for the free tier. Paid tier available but not needed.                        |
| **Sign up link**    | <https://aistudio.google.com> - sign in with your Google account. Immediately available.                                                                                               |
| **Get API key**     | After login: click 'Get API Key' → 'Create API key in new project' → copy key → add to .env as: GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxx                                                    |
| **Best for**        | Teams that already have a Google account and want the fastest setup. Gemini Flash streams very quickly which makes the demo look very polished.                                        |
| **Model to use**    | gemini-1.5-flash (fast, free tier) gemini-1.5-pro (higher quality, lower free rate limit)                                                                                              |
| **Code difference** | Different API endpoint and SDK: pip install google-generativeai from google import genai - slightly different code structure from Groq.                                                |

### **Option C - Anthropic Claude API (Best Quality - ~₹0 with Free Credit)**

| **Detail**             | **Information**                                                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**         | Anthropic's Claude claude-sonnet-4-5 - the highest quality reasoning model available. Produces the most detailed, accurate, and compelling attack narratives of all three options. Recommended if maximum output quality matters most. |
| **Cost**               | \$5 free credit on signup - covers approximately 400-600 full attack simulations. More than enough for an entire hackathon plus development. After credit runs out: ~\$0.003 per simulation.                                           |
| **Sign up link**       | <https://console.anthropic.com> - sign up, verify email, add a phone number for free credit activation.                                                                                                                                |
| **Get API key**        | After login: click 'API Keys' → 'Create Key' → copy → add to .env as: ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx                                                                                                                        |
| **Model to use**       | claude-sonnet-4-5-20251022 (best quality, moderate speed) claude-haiku-4-5 (faster, very low cost if free credit runs out)                                                                                                             |
| **Why it is the best** | Claude follows complex instructions most reliably, produces the most coherent multi-step kill-chain narratives, and handles edge cases (unusual network topologies) much better than open-source alternatives.                         |

### **LLM API Comparison Table**

| **Feature**        | **Groq (Llama 3)** | **Gemini Flash** | **Claude claude-sonnet-4-5** | **OpenAI GPT-4o**        |
| ------------------ | ------------------ | ---------------- | ---------------------------- | ------------------------ |
| **Cost**           | FREE               | FREE tier        | ~₹0 (free credit)            | \$5 free then paid       |
| **Card needed?**   | No                 | No               | No                           | Yes                      |
| **Output quality** | Very good          | Good             | Best                         | Excellent                |
| **Speed**          | Very fast          | Very fast        | Fast                         | Medium                   |
| **Signup time**    | 2 minutes          | 1 minute         | 3 minutes                    | 5 minutes                |
| **Recommended?**   | YES (1st choice)   | YES (2nd choice) | YES (3rd choice)             | Only if team has account |

## **8.4 Frontend (React) Libraries - Install via npm**

All frontend libraries are installed using npm inside the frontend/ folder. Run the master install command after creating the React project.

| **Frontend Master Install Commands**                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| \# Step 1: Create the React project with Vite npx create-vite@latest frontend --template react # Step 2: Move into the project folder cd frontend # Step 3: Install base dependencies npm install # Step 4: Install CyberSentinel-specific libraries npm install reactflow axios # Step 5: Start development server npm run dev # Open browser at: <http://localhost:5173> |

### **React 18**

| **Detail**            | **Information**                                                                                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**      | The JavaScript UI library. Everything the user sees on screen is a React component. React handles updating the DOM efficiently when data changes - critical for the real-time streaming effect.                                                                                                         |
| **How to install**    | Included automatically when you run: npx create-vite@latest frontend --template react                                                                                                                                                                                                                   |
| **Cost**              | Completely FREE - open source, maintained by Meta.                                                                                                                                                                                                                                                      |
| **Free alternatives** | Vue.js (<https://vuejs.org>) - free, similar concept, slightly easier learning curve. Use 'npm create vue@latest' instead. Svelte (<https://svelte.dev>) - free, compiles to vanilla JS, fastest runtime performance. Vanilla JavaScript - no library at all. More code to write but zero dependencies. |

### **Vite**

| **Detail**            | **Information**                                                                                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**      | The build tool and development server for React. Vite starts a local server at localhost:5173 with instant hot reload - every time you save a file, the browser updates in under 100ms without refreshing. |
| **How to install**    | Included automatically with the create-vite command above. No separate install.                                                                                                                            |
| **Cost**              | Completely FREE - open source.                                                                                                                                                                             |
| **Free alternatives** | Create React App (npx create-react-app) - older, slower, but free. Vite is strongly preferred for new projects. Parcel (<https://parceljs.org>) - zero-config bundler, also free.                          |

### **React Flow (@xyflow/react)**

| **Detail**            | **Information**                                                                                                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**      | The library that renders the interactive network graph - the nodes and edges showing the bank's systems. Handles drag-and-drop, zoom, pan, node coloring, and edge animations. This is what makes the attack path visualization possible.                                                    |
| **How to install**    | npm install @xyflow/react (Note: the package name changed from 'reactflow' to '@xyflow/react' in v12. Both work.)                                                                                                                                                                            |
| **Cost**              | FREE for open source and personal use. The core library used in CyberSentinel is completely free.                                                                                                                                                                                            |
| **Free alternatives** | Vis.js Network (npm install vis-network) - free, more basic, no React integration. D3.js (npm install d3) - free, extremely powerful but requires much more custom code for graph layouts. Cytoscape.js (npm install cytoscape) - free, designed specifically for biological/network graphs. |

### **Axios**

| **Detail**            | **Information**                                                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What it does**      | HTTP client for making API calls from the React frontend to the FastAPI backend. Used for the initial POST /simulate request that starts the simulation.                                                                                   |
| **How to install**    | npm install axios                                                                                                                                                                                                                          |
| **Cost**              | Completely FREE - open source.                                                                                                                                                                                                             |
| **Free alternatives** | Fetch API - built into every browser, completely free, no install needed. Use 'fetch()' instead of 'axios.post()'. Slightly more verbose but zero dependency. SWR (npm install swr) - free, adds caching and auto-refresh on top of fetch. |

## **8.5 Optional but Highly Useful Tools**

These tools are not required to build CyberSentinel, but each one will save significant time during the hackathon. All are free.

### **Postman or Thunder Client**

| **Detail**        | **Information**                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**  | API testing tool. Used to test your FastAPI endpoints (POST /simulate, POST /fix) without needing the frontend. Invaluable for debugging the backend in isolation.                                   |
| **How to get it** | Postman: <https://www.postman.com/downloads> (free account) Thunder Client: VS Code extension - install from VS Code Extensions panel (search 'Thunder Client'). Recommended - stays inside VS Code. |
| **Cost**          | Both completely FREE for basic use.                                                                                                                                                                  |
| **Alternatives**  | curl - command-line tool, built into macOS and Linux. Also on Windows via Git Bash. No install needed: curl -X POST <http://localhost:8000/simulate>                                                 |

### **GitHub / GitHub Desktop**

| **Detail**        | **Information**                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**  | Code hosting and version control. Upload your code to GitHub so teammates can collaborate, and so judges can review your submission after the hackathon. |
| **How to get it** | GitHub account: <https://github.com> (free) GitHub Desktop app: <https://desktop.github.com> (free GUI)                                                  |
| **Cost**          | Completely FREE for public repositories.                                                                                                                 |
| **Alternatives**  | GitLab (<https://gitlab.com>) - free, similar to GitHub. Bitbucket (<https://bitbucket.org>) - free for small teams.                                     |

### **Insomnia**

| **Detail**        | **Information**                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What it does**  | Alternative to Postman for API testing. Cleaner interface, faster to use for SSE (streaming) endpoint testing. Particularly good for testing the streaming /simulate endpoint. |
| **How to get it** | <https://insomnia.rest/download> - free desktop app.                                                                                                                           |
| **Cost**          | Completely FREE for core features.                                                                                                                                             |
| **Alternatives**  | Postman (see above) or Thunder Client (see above).                                                                                                                             |

### **JSON Formatter browser extension**

| **Detail**        | **Information**                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**  | A browser extension that makes JSON files readable in the browser with syntax highlighting and collapsible sections. Useful when testing API responses manually. |
| **How to get it** | Chrome: search 'JSON Formatter' in Chrome Web Store - install the one by callumlocke (free). Firefox: built-in JSON viewer, no extension needed.                 |
| **Cost**          | Completely FREE.                                                                                                                                                 |
| **Alternatives**  | No alternative needed - the browser's built-in developer tools (F12) can pretty-print JSON in the Network tab.                                                   |

### **draw.io (for planning)**

| **Detail**        | **Information**                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**  | Free online diagramming tool. Use it to sketch the network topology before writing the JSON file - much easier to design 15 nodes visually than in a text editor. |
| **How to get it** | <https://app.diagrams.net> - works in browser, no login, no install needed.                                                                                       |
| **Cost**          | Completely FREE.                                                                                                                                                  |
| **Alternatives**  | Excalidraw (<https://excalidraw.com>) - free, hand-drawn style, also browser-based. Figma (free tier) - for more polished diagrams.                               |

## **8.6 Master Installation Checklist - Run in This Exact Order**

Follow this checklist in order. Each step builds on the previous one. Completing this entire list should take approximately 30-45 minutes on a fresh machine.

| **#**  | **What to Install**           | **Command / Action**                                              | **Verify With**              |
| ------ | ----------------------------- | ----------------------------------------------------------------- | ---------------------------- |
| **1**  | **Python 3.10+**              | Download from python.org, run installer, tick 'Add to PATH'       | python --version             |
| **2**  | **pip (Python package mgr)**  | Comes with Python. Update it: python -m pip install --upgrade pip | pip --version                |
| **3**  | **Node.js v18+**              | Download from nodejs.org (LTS version), run installer             | node --version               |
| **4**  | **npm**                       | Comes with Node.js automatically                                  | npm --version                |
| **5**  | **Git**                       | Download from git-scm.com, run installer                          | git --version                |
| **6**  | **VS Code**                   | Download from code.visualstudio.com, run installer                | Open app manually            |
| **7**  | **FastAPI + Uvicorn**         | pip install fastapi uvicorn                                       | uvicorn --version            |
| **8**  | **NetworkX**                  | pip install networkx                                              | python -c 'import networkx'  |
| **9**  | **python-dotenv + httpx**     | pip install python-dotenv httpx                                   | python -c 'import dotenv'    |
| **10** | **Groq API key**              | Sign up at groq.com, create key, save in backend/.env             | Test with Python script      |
| **11** | **React project (Vite)**      | npx create-vite@latest frontend --template react && cd frontend   | npm run dev → localhost:5173 |
| **12** | **React Flow + Axios**        | npm install @xyflow/react axios (inside frontend/ folder)         | npm list reactflow           |
| **13** | **Postman or Thunder Client** | Download from postman.com or install VS Code extension            | Open app manually            |

## **8.7 Complete Cost Summary**

Every tool used in CyberSentinel, its cost, and the free alternative if one exists.

| **Tool / Software**    | **Cost**         | **Free Alternative**        | **Notes**                           |
| ---------------------- | ---------------- | --------------------------- | ----------------------------------- |
| **Python 3.10+**       | **FREE**         | N/A - Python itself is free | Download from python.org            |
| **Node.js v18+**       | **FREE**         | Bun (bun.sh)                | Download from nodejs.org            |
| **Git**                | **FREE**         | N/A - Git is free           | Download from git-scm.com           |
| **VS Code**            | **FREE**         | PyCharm Community           | Download from code.visualstudio.com |
| **FastAPI**            | **FREE**         | Flask, Bottle               | pip install fastapi                 |
| **Uvicorn**            | **FREE**         | Hypercorn                   | pip install uvicorn                 |
| **NetworkX**           | **FREE**         | igraph, Graph-tool          | pip install networkx                |
| **python-dotenv**      | **FREE**         | os.environ directly         | pip install python-dotenv           |
| **httpx**              | **FREE**         | aiohttp, requests           | pip install httpx                   |
| **React 18 + Vite**    | **FREE**         | Vue.js, Svelte              | npx create-vite@latest              |
| **React Flow**         | **FREE**         | D3.js, Vis.js, Cytoscape    | npm install @xyflow/react           |
| **Axios**              | **FREE**         | Fetch API (built-in)        | npm install axios                   |
| **Groq API (Llama 3)** | **FREE**         | Gemini Flash (also free)    | groq.com - no card needed           |
| **Gemini Flash API**   | **FREE tier**    | Groq API (also free)        | aistudio.google.com                 |
| **Claude API**         | **~₹0 (credit)** | Groq or Gemini (both free)  | \$5 free credit on signup           |
| **Postman / Thunder**  | **FREE**         | curl (built-in to terminal) | postman.com or VS Code ext          |
| **GitHub**             | **FREE**         | GitLab, Bitbucket           | github.com - free account           |

**Total Cost to Build CyberSentinel**

Using Groq + Gemini (both free): **₹0.00 - completely free.**

Using Claude API (best quality): **~₹0 - covered entirely by the \$5 free signup credit.**

All other software (Python, Node, React, FastAPI, NetworkX, Git, VS Code, React Flow): **₹0.00 - all open source.**

_- End of CyberSentinel Project Blueprint -_

**Predict. Prevent. Protect.**