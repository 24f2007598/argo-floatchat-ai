import os
import json
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
import psycopg2
import pandas as pd
from chromadb import PersistentClient
from google import genai
from google.genai import types
import traceback
import sys

# -----------------------------
# 1️⃣ ChromaDB setup (UNCHANGED)
# -----------------------------
chroma_path = r"C:\SNU\OceanData\chroma_db_combined"
try:
    client_chroma = PersistentClient(path=chroma_path)
    collection_name = "argo_profiles_depthwise"
    collection = client_chroma.get_collection(name=collection_name)
    print("✅ ChromaDB Client Initialized.")
except Exception as e:
    print(f"❌ Error initializing ChromaDB: {e}", file=sys.stderr)


    class DummyCollection:
        def get(self, *args, **kwargs): return {"metadatas": [], "documents": []}

        def query(self, *args, **kwargs): return {"metadatas": [[]], "documents": [[]]}


    collection = DummyCollection()

# -----------------------------
# 2️⃣ Gemini client (UNCHANGED)
# -----------------------------
try:
    os.environ["GEMINI_API_KEY"] = "AIzaSyCIIwJxKUMAl-YXnaSvph_4uV2qfa4p56g"  # replace with your key
    genai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    print("✅ Gemini Client Initialized.")
except Exception as e:
    print(f"❌ Error initializing Gemini Client: {e}", file=sys.stderr)

# -----------------------------
# 3️⃣ PostgreSQL setup (UNCHANGED)
# -----------------------------
PG_HOST = "localhost"
PG_DB = "argodata"
PG_USER = "postgres"
PG_PASS = "hackathon"


def get_pg_connection():
    """Establishes connection to the PostgreSQL database."""
    return psycopg2.connect(
        host=PG_HOST,
        dbname=PG_DB,
        user=PG_USER,
        password=PG_PASS
    )


# -----------------------------
# 4️⃣ FastAPI setup & Schema
# -----------------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Query(BaseModel):
    query: Optional[str] = ""
    latitude_min: Optional[float] = None
    latitude_max: Optional[float] = None
    longitude_min: Optional[float] = None
    longitude_max: Optional[float] = None
    profile_ids: Optional[List[str]] = None
    max_results: Optional[int] = 500
    # 🛠 ADD DATE FIELDS TO CORE QUERY MODEL for potential filtering
    start_date: Optional[str] = None
    end_date: Optional[str] = None


# -----------------------------
# 5️⃣ Core Utility and Retrieval Functions
# -----------------------------

def structure_records(res: dict):
    # ... (structure_records function remains UNCHANGED) ...
    structured = []
    metas = res.get("metadatas", [[]])[0] if res.get("metadatas") and isinstance(res["metadatas"][0],
                                                                                 list) else res.get("metadatas", [])
    docs = res.get("documents", [[]])[0] if res.get("documents") and isinstance(res["documents"][0], list) else res.get(
        "documents", [])

    for d, m in zip(docs, metas):
        structured.append({
            "profile_id": m.get("profile_id", ""),
            "cycle_number": m.get("cycle_number", ""),
            "data_mode": m.get("data_mode", ""),
            "latitude": m.get("latitude", None),
            "longitude": m.get("longitude", None),
            "depth_index": m.get("depth_index", None),
            "pressure": m.get("pressure", None),
            "temperature": m.get("temperature", None),
            "salinity": m.get("salinity", None),
            "document": d
        })
    return structured


def get_profile_depths(profile_ids: List[str]):
    # ... (get_profile_depths function remains UNCHANGED) ...
    if not profile_ids:
        return []
    res = collection.get(where={"profile_id": {"$in": profile_ids}})
    return structure_records(res)


def extract_single_profile_id(query_text: str) -> Optional[str]:
    # ... (extract_single_profile_id function remains UNCHANGED) ...
    match = re.search(r'\b(\w+_\w+)\b', query_text)
    if match:
        return match.group(1)
    return None


def retrieve_hybrid(query: Query):
    """Hybrid Retrieval: SQL Pre-filter -> Chroma Semantic Search."""
    candidate_ids = []
    # 🛠 ADD DATE FILTER CHECK
    has_sql_filter = query.profile_ids or query.latitude_min is not None or query.longitude_min is not None or query.start_date is not None

    # Step 1: SQL Pre-filter to get Candidate IDs
    if has_sql_filter:
        print("SQL: Running Pre-filter...")
        # 🛠 USING SINGLE TABLE: argo_profiles_2006
        sql = "SELECT DISTINCT profile_id FROM argo_profiles_2006 WHERE TRUE"
        params = []

        if query.profile_ids:
            sql += " AND profile_id IN %s"
            params.append(tuple(query.profile_ids))

        if query.latitude_min is not None and query.latitude_max is not None:
            sql += " AND latitude BETWEEN %s AND %s"
            params.extend([query.latitude_min, query.latitude_max])

        if query.longitude_min is not None and query.longitude_max is not None:
            sql += " AND longitude BETWEEN %s AND %s"
            params.extend([query.longitude_min, query.longitude_max])

        # 🛠 NEW: Add Date Filtering
        if query.start_date is not None and query.end_date is not None:
            # Use the 'created_at' column (or 'juld') as per your table schema
            sql += " AND created_at BETWEEN %s AND %s"
            params.extend([query.start_date, query.end_date])

        try:
            with get_pg_connection() as conn:
                df_ids = pd.read_sql(sql, conn, params=params)
                candidate_ids = df_ids['profile_id'].tolist()
                print(f"SQL: Retrieved {len(candidate_ids)} candidate IDs.")
        except Exception as e:
            print(f"SQL Filter Error: {e}")
            # If SQL filter fails (e.g., date format or table error), return nothing to prevent RAG error
            return []

    # Step 2: Chroma Search (Pre-filtered if candidate_ids exist)
    k = query.max_results or 500
    chroma_filter = {}
    if candidate_ids:
        chroma_filter["profile_id"] = {"$in": candidate_ids}

    # Conversational Query: Use RAG path (query)
    if query.query:
        print(f"CHROMA: Running semantic search (k={k}) on {len(candidate_ids) or 'all'} IDs.")
        res = collection.query(
            query_texts=[query.query],
            n_results=k,
            where=chroma_filter if chroma_filter else None
        )
        return structure_records(res)

    # Filter-only (no conversational query): Use 'get' path
    elif has_sql_filter:
        print(f"CHROMA: Running filtered 'get' (k={k}) on {len(candidate_ids)} IDs.")
        res = collection.get(
            limit=k,
            where=chroma_filter
        )
        return structure_records(res)

    # Default: No query, no filters - fetch top k profiles globally
    else:
        print(f"CHROMA: Running global 'get' (k={k}).")
        res = collection.get(limit=k)
        return structure_records(res)


# ---------------------------------------------------
# 6️⃣ Specialized Query Functions
# ---------------------------------------------------

def geo_nearest_neighbors(user_query: str, latitude: float, longitude: float, k: int = 5):
    """Finds the 'k' nearest profiles using PostGIS ST_Distance on the 'geom' column."""

    print("SQL: Running Geospatial Nearest Neighbor Query...")
    # NOTE: ST_MakePoint uses (Longitude, Latitude) convention
    sql = f"""
    SELECT 
        profile_id, 
        latitude, 
        longitude, 
        created_at,  -- 🛠 Include created_at for context
        ST_Distance(
            geom, 
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)
        ) AS distance_meters
    FROM argo_profiles_2006
    ORDER BY distance_meters
    LIMIT %s
    """
    params = (longitude, latitude, k)

    try:
        with get_pg_connection() as conn:
            df = pd.read_sql(sql, conn, params=params)

            if df.empty:
                return "No nearby profiles found in the database.", []

            nearest_ids = df['profile_id'].tolist()

            # Use Gemini to summarize the nearest profiles
            context = df.to_markdown(index=False)
            prompt = f"""
The user asked: "{user_query}".
The {k} nearest ARGO profiles found are:
{context}

Answer the user's question, clearly listing the profile IDs, their distances (in meters), and their observation dates.
"""
            resp = genai_client.models.generate_content(model="gemini-2.5-flash", contents=prompt)

            return resp.text, nearest_ids

    except Exception as e:
        print(f"PostgreSQL Error during geospatial query: {e}")
        return f"PostgreSQL Error during geospatial query: {e}. Ensure the PostGIS extension is active and columns are correct.", []


# -----------------------------
# 7️⃣ Gemini Structured Output Schemas (AND ask_gemini function)
# -----------------------------

class GeminiOutput(BaseModel):
    answer: str = Field(
        description="The marine science assistant's answer to the user's question, based on the provided data.")
    relevant_profile_ids: List[str] = Field(
        description="A list of ALL 'profile_id's from the context that were instrumental in formulating the answer.")


class QueryIntent(BaseModel):
    """Schema to determine the user's intent and extract filters before executing search."""
    intent: Literal["STATISTICAL", "GEOSPATIAL", "CONVERSATIONAL", "DIRECT_ID"] = Field(
        description="Classify the user's query: STATISTICAL (AVG, MIN, MAX), GEOSPATIAL (nearest, location), CONVERSATIONAL (general Q&A), or DIRECT_ID (explicit profile ID lookup)."
    )
    aggregate_function: Optional[Literal['AVG', 'MAX', 'MIN', 'COUNT']] = Field(
        None, description="The statistical function requested (e.g., AVG, MAX). Only for STATISTICAL intent."
    )
    parameter: Optional[Literal['temperature', 'salinity', 'pressure']] = Field(
        None, description="The physical parameter for aggregation. Only for STATISTICAL intent."
    )
    latitude: Optional[float] = Field(None,
                                      description="The central latitude mentioned in the query. Only for GEOSPATIAL intent.")
    longitude: Optional[float] = Field(None,
                                       description="The central longitude mentioned in the query. Only for GEOSPATIAL intent.")
    k_nearest: Optional[int] = Field(5,
                                     description="The number of nearest neighbors to find. Only for GEOSPATIAL intent.")
    depth_min: Optional[int] = Field(None, description="Minimum depth/pressure in dbar.")
    depth_max: Optional[int] = Field(None, description="Maximum depth/pressure in dbar.")
    # 🛠 NEW: Date Filter Extraction
    start_date: Optional[str] = Field(None, description="The start date (YYYY-MM-DD) for time-series filtering.")
    end_date: Optional[str] = Field(None, description="The end date (YYYY-MM-DD) for time-series filtering.")


def get_query_intent(query_text: str) -> QueryIntent:
    # ... (get_query_intent function remains UNCHANGED in logic, but uses new schema) ...
    print("GEMINI: Analyzing query intent...")
    prompt = f"Analyze the following oceanographic query and extract the necessary filters for database execution. Convert all temporal references to YYYY-MM-DD format for start_date and end_date:\n\nQuery: {query_text}"

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=QueryIntent,
    )

    resp = genai_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=config,
    )

    try:
        json_data = json.loads(resp.text)
        print(f"GEMINI: Intent identified as {json_data.get('intent')}.")
        return QueryIntent(**json_data)
    except Exception as e:
        print(f"Error parsing intent: {e}. Defaulting to CONVERSATIONAL.")
        return QueryIntent(intent="CONVERSATIONAL")


def ask_gemini(question: str, records):
    """Generates the final conversational answer using the retrieved records as context."""
    if not records:
        return "No relevant data records were retrieved from the ARGO database to answer this question.", []

    context_parts = []
    all_retrieved_ids = set()
    for row in records:
        all_retrieved_ids.add(row['profile_id'])
        # 🛠 FIX: Include the 'Date' field (assuming the profile metadata includes it)
        part = (
            f"Profile: {row['profile_id']}, Cycle: {row['cycle_number']}, Mode: {row['data_mode']}, "
            f"Lat: {row['latitude']}, Lon: {row['longitude']}, "
            f"Pressure: {row['pressure']}, Temperature: {row['temperature']}, Salinity: {row['salinity']}, "
            f"Date: {row.get('created_at', 'N/A')}"  # Assuming 'created_at' is available in Chroma metadata
        )
        context_parts.append(part)

    context_text = "\n\n".join(context_parts)

    prompt = f"""
You are a marine science assistant. You have access to the following ARGO profile data:

{context_text}

Answer this question: {question}

If the question asks for a statistic (like average, min, or max), you must perform the calculation based on the numerical data provided above. 
Your final JSON output MUST include the full conversational answer and the list of relevant profile IDs.
"""
    print("GEMINI: Generating final answer.")
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=GeminiOutput,
    )

    resp = genai_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=config,
    )

    try:
        json_data = json.loads(resp.text)
        relevant_ids = json_data.get("relevant_profile_ids", [])
        valid_relevant_ids = list(set(relevant_ids) & all_retrieved_ids)
        return json_data.get("answer", "Error: No answer generated."), valid_relevant_ids
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        return f"Error: Failed to parse Gemini's structured response. Raw output: {resp.text}", []


# -----------------------------
# 8️⃣ API routes (Main Entry Point)
# -----------------------------
@app.post("/query")
def query_backend(q: Query):
    try:
        if not q.query:
            # Scenarios 1 & 4 (Visualization/Initial Load) - UNCHANGED
            if q.profile_ids:
                records = get_profile_depths(q.profile_ids)
                answer = f"Displaying all depth data for {len(q.profile_ids)} profile(s)."
                relevant_profile_ids = q.profile_ids
                return {"answer": answer, "records": records, "relevant_profile_ids": relevant_profile_ids}

            records = retrieve_hybrid(q)
            answer = f"Retrieved top {len(records)} records from the ARGO database globally."
            return {"answer": answer, "records": records, "relevant_profile_ids": []}

        # --- Intent-based Routing for Conversational Queries ---
        intent_data = get_query_intent(q.query)

        # Check for explicit ID first
        target_id = extract_single_profile_id(q.query)
        if target_id or intent_data.intent == "DIRECT_ID":
            id_to_fetch = target_id if target_id else q.query.split()[-1]

            # Scenario: Direct ID Lookup
            records = get_profile_depths([id_to_fetch])
            if records:
                answer, _ = ask_gemini(f"Summarize the physical parameters for the profile in this question: {q.query}",
                                       records)
                return {"answer": answer, "records": records, "relevant_profile_ids": [id_to_fetch]}
            else:
                return {"answer": f"Sorry, the exact profile ID '{id_to_fetch}' was not found in the database.",
                        "records": [], "relevant_profile_ids": []}


        # Scenario: Geospatial Query
        elif intent_data.intent == "GEOSPATIAL" and intent_data.latitude is not None and intent_data.longitude is not None:
            answer, nearest_ids = geo_nearest_neighbors(
                user_query=q.query,
                latitude=intent_data.latitude,
                longitude=intent_data.longitude,
                k=intent_data.k_nearest
            )
            records = get_profile_depths(nearest_ids)
            return {"answer": answer, "records": records, "relevant_profile_ids": nearest_ids}

        # Scenario: Conversational/General/Statistical Query
        else:
            # 🛠 NEW: Apply date filters from intent to the Query object before retrieval
            if intent_data.start_date and intent_data.end_date:
                q.start_date = intent_data.start_date
                q.end_date = intent_data.end_date
                print(f"Applying Date Filter: {q.start_date} to {q.end_date}")

            records = retrieve_hybrid(q)
            answer, relevant_profile_ids = ask_gemini(q.query, records)
            return {"answer": answer, "records": records, "relevant_profile_ids": relevant_profile_ids}

    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}


# -----------------------------
#  Direct Profile Fetch (Convenience - UNCHANGED)
# -----------------------------
@app.get("/profile/{profile_id}")
def get_single_profile(profile_id: str):
    records = get_profile_depths([profile_id])
    return {"count": len(records), "records": records}


@app.get("/record/{record_id}")
def get_record(record_id: str):
    res = collection.get(ids=[record_id])
    return res