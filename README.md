# MCP Tool Registry

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

![Terminal Demo](demo.gif)

> **A custom implementation of the Model Context Protocol (MCP) to standardize tool discovery, authentication, and execution for AI agents.**

## 🌟 Key Features
- ✅ **Standardized MCP server implementations**
- ✅ **Role-based permission gating for tool execution**
- ✅ **Dynamic tool discovery schema generation**

## 🏗️ Architecture

```mermaid
flowchart TD
    A[LLM Agent] -->|MCP Protocol| B(Tool Registry)
    B --> C{Permission Check}
    C -->|Approved| D[Execute Web Search]
    C -->|Approved| E[Execute Code]
    D & E --> B
    B --> A
```

## 🚀 Live API Endpoint (Vercel)

This project is deployed serverless via Vercel Edge Functions. You can test the interaction directly from your terminal.

```bash
# Example Request
curl -X GET https://mcp-tool-ecosystem-41pbvvrsu-dev4aibots.vercel.app/api/health
```

## 💻 Developer Quickstart

### Prerequisites
- Python 3.11+
- Node.js (for Vercel CLI)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dev4aibots/mcp-tool-registry.git
   cd mcp-tool-registry
   ```

2. **Set up virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Add your API keys to .env
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```

## 📁 Project Structure
```
.
├── api/                  # Vercel serverless endpoints
├── src/                  # Core Python modules & agent logic
├── tests/                # Unit and integration tests
├── public/               # Static assets
├── requirements.txt      # Python dependencies
└── vercel.json           # Vercel routing configuration
```

## 📄 License
This project is licensed under the MIT License.
