# CyberSentinel DWM Data Warehouse Implementation Log

This document tracks the step-by-step implementation of the BigQuery Data Warehouse integration for CyberSentinel.

## Table of Contents
1. [Part 1: Setup and Foundation](#part-1-setup-and-foundation) - Completed
2. [Part 2: Warehouse ETL & Data Ingestion](#part-2-warehouse-etl--data-ingestion) - Completed
3. [Part 3: Live Simulation Logging](#part-3-live-simulation-logging) - Completed
4. [Part 4: Analytics API](#part-4-analytics-api) - Completed
5. [Part 5: Frontend UI (Security Intelligence)](#part-5-frontend-ui-security-intelligence) - Completed
6. [Part 6: Final Scripts & Deployment](#part-6-final-scripts--deployment) - In Progress (Awaiting Push)

---

## Part 1: Setup and Foundation

**What we did:**
- Created `backend/requirements.txt` to include `google-cloud-bigquery` and core dependencies.
- Updated `backend/.env.example` with `GOOGLE_CLOUD_PROJECT` and `BIGQUERY_DATASET` configuration variables.
- Initialized the `backend/warehouse/` package.
- Created `backend/warehouse/client.py` which sets up the BigQuery client factory using environment variables.
- Authored `backend/warehouse/sql/001_schema.sql` to define the primary Star Schema (dimensions: time, network, node, cve, algorithm, weighting, simulation; fact: `fact_cyber_risk`).

**Why we did it:**
Before any data can be ingested or queried, we must have the database schema defined and a secure, centralized way for the backend to communicate with Google BigQuery. This lays the groundwork for the ETL pipeline.

**What it was before:**
The project did not have a standardized `requirements.txt` file at the root of `backend/`, nor did it have any concept of a database schema or client. Everything was entirely file-based (JSON).

**How it connects to other parts:**
- The SQL schema defines the exact structure that our upcoming ETL scripts (Part 2) will load data into.
- The `client.py` will be imported by our logger (to save simulation history) and our query endpoints (to serve the UI).

---

## Part 2: Warehouse ETL & Data Ingestion

**What we did:**
- Created `backend/warehouse/schema.py` containing Pydantic models for `DimNetwork`, `DimNode`, `DimCve`, and `FactCyberRisk`.
- Built `backend/warehouse/etl.py`, a robust ETL script that loops through the JSON folders in `backend/data/networks/`.
- The script automatically generates surrogate integer keys and transforms the static JSON state into Star Schema dimension records and baseline `BASELINE_VULNERABILITY` fact records.
- Implemented a graceful try/except block around the BigQuery `insert_rows_json` call so that the codebase doesn't crash during local simulation if GCP credentials aren't present yet.

**Why we did it:**
Data Mining relies on structured data. We need to convert our existing hierarchical, heterogeneous JSON arrays into flat, analytically queryable tables. The ETL script handles this dimensionality reduction and transformation automatically.

**What it was before:**
Previously, the JSON was only parsed by `graph.py` inside memory at simulation time. There was no mechanism to sync the baseline state of the networks into a database.

**How it connects to other parts:**
- Once the dimensions and baseline facts are loaded, any simulated attacks (which we will log in Part 3) will be able to join against these dimensions to retrieve contextual details (like node exposure, or CVE CVSS base scores).

---

## Part 3: Live Simulation Logging

**What we did:**
- Created `backend/warehouse/logger.py` with asynchronous functions to build `FactCyberRisk` rows. 
- The logger parses the Top-K paths from the simulation output and constructs one observation row per hop of every path. It also generates unique surrogate keys for the simulation run and individual paths.
- Updated `backend/main.py` to use FastAPI's `BackgroundTasks`. We injected our new logger functions into the `/simulate` and `/fix` POST endpoints.

**Why we did it:**
The goal of the Data Warehouse is to preserve history. We need to log every simulation ran and every fix applied so that we can mine this data later to find patterns (like common pivot points or risk trends over time). We use `BackgroundTasks` specifically so that logging to BigQuery does not slow down the real-time Server-Sent Events (SSE) streaming to the UI.

**What it was before:**
Previously, simulations were ephemeral. Once you refreshed the browser, the simulation was gone forever and no record of the attack path was stored anywhere.

**How it connects to other parts:**
- These new `FactCyberRisk` rows (created by `logger.py`) join directly onto the dimensions we loaded in Part 2.
- In Part 4, we will create analytical API endpoints to query these very rows and display the attack history in the UI.

---

## Part 4: Analytics API

**What we did:**
- Created `backend/warehouse/queries.py` to store our analytical queries (e.g., counting high-risk nodes, retrieving simulation history, finding frequent pivot nodes).
- Added a safe wrapper (`execute_query`) that blocks SQL mutations like `DROP`, `DELETE`, or `UPDATE` to prevent the UI from altering the database.
- Hooked up new FastAPI endpoints in `backend/main.py`: `GET /warehouse/summary`, `GET /warehouse/attack-history`, `GET /warehouse/attack-patterns`, and a generic `POST /warehouse/query`.

**Why we did it:**
The React frontend needs a way to fetch all this new historical and analytical data to display the Security Intelligence dashboard. The `POST /warehouse/query` endpoint also satisfies the requirement for a read-only SQL Query Console.

**What it was before:**
The FastAPI server was entirely built for real-time simulation logic (via SSE), with no endpoints returning aggregated JSON metrics or supporting freeform queries.

**How it connects to other parts:**
- These endpoints act as the bridge between the BigQuery warehouse (populated in Parts 2 and 3) and the React Frontend UI (which we will build in Part 5).

---

## Part 5: Frontend UI (Security Intelligence)

**What we did:**
- Built `frontend/src/api/warehouse.js` to handle asynchronous fetching from our new backend endpoints.
- Created `frontend/src/components/warehouse/WarehouseDashboard.jsx` along with its sub-components: `WarehouseSummary`, `AttackHistory`, `AttackPatterns`, and `QueryConsole`.
- Added CSS styling to match the dark, hacker-themed aesthetic of CyberSentinel.
- Updated `App.jsx` and `Header.jsx` to include a global workspace toggle, allowing the user to seamlessly switch between the operational **Simulation** workspace and the analytical **Security Intelligence** workspace.

**Why we did it:**
A Data Warehouse is only as good as the interface used to query it. We needed a dedicated space that wouldn't clutter the main simulation view. This dashboard allows Security Operations Center (SOC) analysts to review aggregate risk, hunt for recurring infrastructure targets (frequent pivots), and run raw SQL against the warehouse.

**What it was before:**
The frontend only had a single view (the simulation dashboard). There was no concept of workspaces, and historical/analytical data was not presented to the user at all.

**How it connects to other parts:**
- The `WarehouseDashboard` fetches data from the endpoints built in Part 4.
- The SQL `QueryConsole` submits queries to the `execute_query` wrapper we built, safely retrieving ad-hoc answers directly from the BigQuery schema defined in Part 1.

---

## Part 6: Final Scripts & Deployment

**What we did:**
- Created `scripts/warehouse_bootstrap.py`.
- This script imports the ETL logic and the BigQuery client. It acts as a single-command deployment trigger to initialize the warehouse state on GCP.
- *(Pending)* Git add/commit/push to the repository.

**Why we did it:**
We need an easy way to initialize the warehouse when moving from local development to the actual Google Cloud deployment.

**What it was before:**
No such automation scripts existed for the Data Warehouse.

**How it connects to other parts:**
- It leverages the `etl.py` built in Part 2 and connects using `client.py` from Part 1, rounding out the complete implementation lifecycle of the Phase 2 plan.

