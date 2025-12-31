# argo-floatchat-ai
**Conversational Intelligence for ARGO Ocean Float Data**

FloatChat is an AI-driven conversational platform that converts complex ARGO ocean float data into clear, queryable insights for researchers, policymakers, and students. I built this system to allow users to ask natural language questions and receive grounded, accurate responses backed by real oceanographic data, visualizations, and downloadable outputs.

<p align="center">
  <img src="https://github.com/user-attachments/assets/1c991d62-3415-453b-93fe-da1caeb5b7c6" width="48%" />
  <img src="https://github.com/user-attachments/assets/f40d3e87-09bd-4709-8ae9-dd193d44b6a2" width="48%" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/c630f3d0-ef24-4828-897a-8ddc1f64c8e8" width="48%" />
  <img src="https://github.com/user-attachments/assets/5216a25c-62e8-42f2-b5fb-b04336d50aa5" width="48%" />
</p>

## What This Project Does

- Enables **natural language querying** over large-scale ARGO NetCDF datasets  
- Combines **SQL accuracy** with **vector-based semantic search**
- Uses **Retrieval-Augmented Generation (RAG)** to ensure answers are grounded in real data
- Provides **interactive dashboards**, summaries, and visual analytics
- Optimized for **scalability and performance** on large scientific datasets

---

## Core Idea

Ocean data is rich but inaccessible to non-experts. FloatChat bridges this gap by acting as a **conversational interface over scientific datasets**, allowing users to explore trends (e.g., salinity, temperature, depth) without writing code or SQL.

---

## System Architecture (High Level)

**End-to-End Pipeline**
1. Data ingestion (ARGO NetCDF files)
2. Preprocessing & feature extraction
3. Dual storage (SQL + Vector DB)
4. Hybrid retrieval (semantic + relational)
5. LLM-based response generation
6. Visualization & reporting



## Dual Storage Architecture

| Component | Purpose |
|---------|--------|
| **PostgreSQL** | Structured metadata, precise filters, SQL accuracy |
| **Parquet Files** | Optimized columnar storage for large measurements |
| **Vector DB (Chroma / FAISS)** | Semantic search over embeddings |

This design ensures both **precision** and **flexibility** when answering user queries.



## Hybrid Retrieval Model

FloatChat dynamically chooses the best retrieval strategy:

- **Semantic Search**  
  - Embedding-based search using Chroma / FAISS  
  - Best for conceptual or exploratory questions  

- **SQL-Based Retrieval**  
  - LLM-generated PostgreSQL queries  
  - Best for exact filters (year, depth, region, parameter)

Results from both paths are fed into a **RAG pipeline** for grounded generation.

---

## RAG Integration

I used Retrieval-Augmented Generation to:
- Prevent hallucinations
- Ground answers in real measurements
- Improve reliability for scientific use cases

Every response is generated **only after fetching relevant data** from storage.

---

## Frontend Features

- Interactive dashboard (React / ReactJS)
- Conversational chat interface
- Dynamic charts and visual summaries
- Downloadable datasets and results



## Outputs

- Visual analytics (charts, plots)
- Textual summaries (LLM-generated)
- Downloadable filtered datasets



## Tech Stack

**Frontend**
- React / ReactJS
- Interactive visualization components

**Backend & AI**
- Python
- LLM API (Gemini / OpenAI compatible)
- RAG pipeline

**Data & Storage**
- ARGO NetCDF files
- PostgreSQL
- Parquet
- Chroma / FAISS (Vector DB)



## Innovation & Uniqueness

- First **conversational platform** focused on ARGO ocean float data
- Hybrid retrieval combining **SQL + vector search**
- Dual storage optimized for **both accuracy and scale**
- Designed specifically for **scientific reliability**, not generic chat



## Use Cases

- Climate and oceanographic research
- Policy analysis and reporting
- Education and student exploration
- Data-driven storytelling for marine science


