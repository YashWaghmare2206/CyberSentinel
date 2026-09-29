from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field

# Dimensions
class DimTime(BaseModel):
    time_key: int
    full_date: date
    day: int
    month: int
    quarter: int
    year: int
    week: int

class DimNetwork(BaseModel):
    network_key: int
    network_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    node_count: Optional[int] = None

class DimNode(BaseModel):
    node_key: int
    network_key: int
    node_id: str
    name: Optional[str] = None
    type: Optional[str] = None
    exposure: Optional[str] = None
    software: Optional[str] = None

class DimCve(BaseModel):
    cve_key: int
    cve_id: str
    description: Optional[str] = None
    severity: Optional[str] = None
    published_date: Optional[datetime] = None
    cvss_base: Optional[float] = None

class DimAlgorithm(BaseModel):
    algorithm_key: int
    algorithm_name: str
    implementation_version: Optional[str] = None

class DimWeighting(BaseModel):
    weighting_key: int
    weighting_mode: str
    description: Optional[str] = None

class DimSimulation(BaseModel):
    simulation_key: int
    simulation_id: str
    started_at: datetime
    network: Optional[str] = None
    entry: Optional[str] = None
    target: Optional[str] = None
    algorithm: Optional[str] = None
    weighting: Optional[str] = None
    data_source: Optional[str] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    status: Optional[str] = None

# Central Fact
class FactCyberRisk(BaseModel):
    risk_fact_key: int
    time_key: int
    network_key: int
    node_key: int
    cve_key: Optional[int] = None
    algorithm_key: Optional[int] = None
    weighting_key: Optional[int] = None
    simulation_key: Optional[int] = None
    
    observation_type: str
    simulation_id: Optional[str] = None
    path_id: Optional[str] = None
    entry_node_id: Optional[str] = None
    target_node_id: Optional[str] = None
    
    path_rank: Optional[int] = None
    is_optimal: Optional[bool] = None
    hop_number: Optional[int] = None
    total_hops: Optional[int] = None
    total_weight: Optional[float] = None
    
    base_cvss: Optional[float] = None
    contextual_risk_score: Optional[float] = None
    edge_weight: Optional[float] = None
    
    kev_listed: Optional[bool] = None
    patch_available: Optional[bool] = None
    days_since_published: Optional[int] = None
    
    remediation_status: Optional[str] = None
    remediation_priority: Optional[str] = None
    
    event_timestamp: datetime
