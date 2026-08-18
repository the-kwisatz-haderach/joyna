---
name: api-doc-generator
description: Automatically generate OpenAPI 3.0 specifications from your API codebase.
---

# API Documentation Generator

Automatically generate OpenAPI 3.0 specifications from your API codebase.

## Overview

This skill scans your API routes, controllers, and handlers to produce:

- **OpenAPI 3.0 Spec** - Complete YAML/JSON specification
- **Endpoint Catalog** - All routes with methods, parameters, and responses
- **Schema Definitions** - Request/response body schemas from types
- **Authentication Docs** - Security scheme documentation

## Supported Frameworks

- Express.js / Fastify / Hono
- Next.js API Routes / Route Handlers
- Django REST Framework
- Flask / FastAPI
- Spring Boot
- Ruby on Rails

## Usage

Invoke with: "Generate API documentation for this project"

Options:

- "Generate OpenAPI spec in YAML format"
- "Document the /api/users endpoints"
- "Create a Swagger spec with example responses"

## Output

Generates an `openapi.yaml` or `openapi.json` file at your project root that can be used with Swagger UI, Redoc, or any OpenAPI-compatible tool.
