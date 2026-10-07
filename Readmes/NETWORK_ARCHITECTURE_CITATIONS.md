# Enterprise Bank Network Architecture & Topology Citations

This document serves as the formal architectural justification for the **Enterprise Bank (56-node)** synthetic network topology used in the CyberSentinel project.

In cybersecurity graph theory and attack simulation, arbitrary network generation leads to unrealistic pathfinding behavior. To ensure academic rigor, this network was modeled directly off of **three primary reference architectures**.

## Reference Frameworks

1. **NIST SP 1800-3 (Financial Services Identity and Access Management)**
   - *Citation:* National Institute of Standards and Technology. (2015). *NIST Special Publication 1800-3: Identity and Access Management for the Financial Services Sector*.
   - *Used for:* Core DMZ architecture, Load Balancer to Web App routing, Active Directory synchronization paths.

2. **SWIFT Customer Security Controls Framework (CSCF) v2022**
   - *Citation:* SWIFT. (2022). *Customer Security Programme (CSP) – Customer Security Controls Framework*.
   - *Used for:* Isolating the SWIFT terminal, jump hosts, and strict message queue segmentation.

3. **CISA Kubernetes Hardening Guidance**
   - *Citation:* Cybersecurity and Infrastructure Security Agency (CISA) & NSA. (2021). *Kubernetes Hardening Guidance*.
   - *Used for:* CI/CD pipeline routing (GitLab → Jenkins → Kubernetes).

---

## Detailed Structural Breakdown (Original 47 Nodes & Expansion)

The network is structurally segmented into highly distinct security enclaves. The original 47 nodes form the core banking infrastructure, while the 9 expanded nodes represent modern supply-chain and corporate back-office additions.

### 1. The Public DMZ (Demilitarized Zone) - Original Core
**Nodes:** `api_gw_1, api_gw_2, api_gw_3`, `load_balancer_1, load_balancer_2`, `vpn_gateway_1, vpn_gateway_2`, `dns_server_1, dns_server_2`, `waf_1, waf_2`
* **Structural Role:** This forms the hardened perimeter.
* **Why connected this way?** The NIST SP 1800-3 architecture mandates that no public internet traffic can directly route to an internal application server. All external API requests must terminate at an API Gateway or Load Balancer. 

### 2. Internal Application Tier - Original Core
**Nodes:** `web_app_1` through `web_app_4`, `app_server_1` through `app_server_4`, `msg_queue_1, msg_queue_2`
* **Structural Role:** Microservices and core business logic handling transactions.
* **Why connected this way?** Application servers are heavily meshed with message queues (Kafka/RabbitMQ) to ensure asynchronous transaction processing without bottlenecking the database.

### 3. Core Database & Identity Zone - Original Core
**Nodes:** `core_db_node_1` through `core_db_node_4`, `data_warehouse`, `active_directory_1`, `auth_server`
* **Structural Role:** The crown jewels of the bank, containing PII, financial ledgers, and identity tokens.
* **Why connected this way?** Web applications are connected to databases via explicit database connection strings (TCP 1433/3306) and authenticate via the `auth_server`. They are intentionally isolated from the DMZ.

### 4. Admin & Corporate Management - Original Core
**Nodes:** `admin_console_1, admin_console_2`, `log_server`, `backup_server`, `linux_legacy_node`, `win_legacy_node`
* **Structural Role:** Privileged administrative access and legacy technical debt.
* **Why connected this way?** Admin consoles have sweeping access across the application tier and database zone, making them prime targets for lateral movement (e.g., pass-the-hash attacks). Legacy nodes are intentionally included to simulate unmanaged devices (Shadow IT) that attackers commonly use as persistent footholds.

### 5. CI/CD & Kubernetes DevOps Subnet (Expansion)
**Nodes:** `gitlab_server`, `jenkins_ci`, `k8s_master`, `k8s_worker_1`
* **Why connected this way?** Based on the CISA Kubernetes Hardening Guide, modern banks deploy microservices. A developer commits code to GitLab via the corporate VPN. GitLab uses webhooks to trigger Jenkins. Jenkins uses service accounts to talk to the K8s Master API. 
* **Attack Path Relevance:** This models a **Supply Chain Attack**. If an attacker breaches the `vpn_gateway_2` and compromises `gitlab_server` (e.g., via ExifTool RCE CVE-2021-22205), they can inject malicious code that automatically deploys into a trusted `k8s_worker` pod, bypassing the DMZ entirely!

### 4. HR & Corporate Back-Office
**Nodes:** `hr_workstation_1`, `hr_file_server`, `active_directory_2`
* **Why connected this way?** Bank employees connect via `vpn_gateway_1` to their `hr_workstation`. These workstations rely on SMB file shares (`hr_file_server`) and authenticate via Kerberos to `active_directory_2`.
* **Attack Path Relevance:** Emulates a standard phishing/ransomware vector. An attacker leveraging an Outlook vulnerability (CVE-2023-23397) on the HR Workstation can use Zerologon (CVE-2020-1472) against the File Server to dump credentials and impersonate a domain admin.

### 5. Secure SWIFT Enclave
**Nodes:** `msg_queue_1`, `jump_host_1`, `swift_terminal`
* **Why connected this way?** The SWIFT CSCF strictly requires that SWIFT terminals are air-gapped or separated by dedicated jump hosts. Regular corporate traffic cannot route to it.
* **Attack Path Relevance:** Reconstructs the difficulty of the Bangladesh Bank Heist. To reach the `swift_terminal`, the graph engine must find a path that successfully tunnels through the `jump_host`, heavily restricting lateral movement.

### 6. SOC & SIEM (Security Operations Center)
**Nodes:** `siem_splunk`, `jump_host_2`
* **Why connected this way?** The SIEM ingests logs from Active Directory and API Gateways via LDAP and syslog.
* **Attack Path Relevance:** While generally defensive, if an attacker compromises the SIEM (e.g., Splunk vulnerabilities), they instantly gain a "map" of the entire network and highly privileged service accounts, creating a catastrophic pivot point.
