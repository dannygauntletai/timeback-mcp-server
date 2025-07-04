# TimeBack MCP Server

A comprehensive Model Context Protocol (MCP) server for the TimeBack 1EdTech platform that helps developers sync data models, manage integrations, and work with educational technology APIs.

## Overview

The TimeBack MCP Server provides a unified interface for working with all five TimeBack 1EdTech APIs:

- **QTI (Question & Test Interoperability)** - Assessment engine for educational assessments
- **OneRoster** - Student information and roster data exchange
- **Caliper** - Learning analytics and activity tracking
- **PowerPath** - Mastery learning and personalized learning paths
- **CASE** - Competencies and Academic Standards Exchange

## Features

### 🛠️ Developer Tools
- **Multi-API Integration** - Work with all 5 TimeBack APIs through a single interface
- **Data Model Synchronization** - Compare and sync data models across different APIs
- **Schema Validation** - Validate data against OpenAPI specifications
- **Integration Mapping** - Generate templates for API integrations
- **Comprehensive Search** - Search across all API documentation and schemas
- **Intelligent Codebase Analysis** - Analyze your existing codebase and get tailored TimeBack integration recommendations
- **Advanced Documentation Crawler** - Automatically crawl, index, and search TimeBack documentation from multiple sources
- **Multi-Format Documentation Support** - Handle Swagger/OpenAPI, Scalar docs, Google Docs, and video content
- **Intelligent Content Extraction** - Extract code examples, API patterns, and integration guides from documentation

### 🔧 MCP Tools

#### Core API Tools
1. **`load-timeback-specs`** - Load all TimeBack OpenAPI specifications
2. **`analyze-api-endpoints`** - Analyze endpoints with filtering by API, tag, or method
3. **`search-api-documentation`** - Search across all API documentation
4. **`compare-data-models`** - Compare schemas between different APIs
5. **`generate-integration-mapping`** - Create integration templates
6. **`validate-api-integration`** - Validate integration configurations
7. **`generate-api-documentation`** - Generate comprehensive API docs

#### Intelligent Analysis Tools
8. **`analyze-codebase-integration`** - Analyze your codebase and recommend TimeBack integrations

#### Documentation Crawler Tools
9. **`crawl-timeback-documentation`** - Crawl and index comprehensive TimeBack documentation from multiple sources
10. **`search-comprehensive-docs`** - Search across all crawled documentation with advanced filtering
11. **`get-api-examples`** - Extract and retrieve code examples from documentation
12. **`compare-api-implementations`** - Compare API implementations across different documentation formats
13. **`get-integration-patterns`** - Get integration patterns and best practices from crawled content

### 📚 MCP Resources

- **`timeback://apis/overview`** - Overview of all TimeBack APIs
- **`timeback://schemas/all`** - Complete schema definitions
- **`timeback://endpoints/all`** - All API endpoints
- **`timeback://integration/templates`** - Integration templates

## Installation

1. Clone the repository:
```bash
git clone https://github.com/dannygauntletai/timeback-mcp-server.git
cd timeback-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your TimeBack API credentials and crawler settings
```

5. Initialize documentation crawler (optional):
```bash
npm run crawler:init
# Downloads and indexes initial documentation
```

## Configuration

Create a `.env` file with your TimeBack platform credentials:

```env
# TimeBack API Base URLs
TIMEBACK_QTI_BASE_URL=https://qti.alpha-1edtech.com/api
TIMEBACK_ONEROSTER_BASE_URL=https://api.alpha-1edtech.com
TIMEBACK_CALIPER_BASE_URL=https://caliper.alpha-1edtech.com
TIMEBACK_POWERPATH_BASE_URL=https://api.alpha-1edtech.com
TIMEBACK_CASE_BASE_URL=https://api.alpha-1edtech.com

# OAuth2 Configuration
OAUTH2_TOKEN_URL=https://alpha-auth-production-idp.auth.us-west-2.amazoncognito.com/oauth2/token
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret

# Server Configuration
MCP_SERVER_NAME=timeback-mcp-server
MCP_SERVER_VERSION=1.0.0
LOG_LEVEL=info

# Documentation Crawler Configuration
CRAWLER_MAX_RETRIES=3
CRAWLER_RETRY_DELAY=2000
CRAWLER_TIMEOUT=30000
CRAWLER_RATE_LIMIT=1000
CRAWLER_RESPECT_ROBOTS_TXT=true
CRAWLER_SCHEDULE_ENABLED=true
CRAWLER_SCHEDULE_INTERVAL=24h
CRAWLER_INCREMENTAL_UPDATES=true
CRAWLER_EXTRACT_CODE_EXAMPLES=true
CRAWLER_BUILD_RELATIONSHIPS=true
CRAWLER_INDEX_METADATA=true
```

## Usage

### Running the MCP Server

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

### Crawler Management

```bash
# Initialize crawler and download documentation
npm run crawler:init

# Run crawler manually
npm run crawler:run

# Check crawler status
npm run crawler:status

# Clear crawler cache
npm run crawler:clear
```

### Using with Claude Desktop

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "timeback": {
      "command": "node",
      "args": ["/path/to/timeback-mcp-server/build/index.js"],
      "env": {
        "CLIENT_ID": "your_client_id",
        "CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

## Example Usage

### Load TimeBack API Specifications
```
Use the load-timeback-specs tool to load all API specifications:
- Loads QTI, OneRoster, Caliper, PowerPath, and CASE APIs
- Parses OpenAPI specifications
- Makes all endpoints and schemas available for analysis
```

### Search API Documentation
```
Use search-api-documentation to find relevant endpoints:
- Query: "student"
- Search in: endpoints, schemas, descriptions
- Filter by specific API if needed
```

### Compare Data Models
```
Use compare-data-models to understand schema differences:
- Compare OneRoster "User" with QTI "Candidate"
- Identify common properties and differences
- Generate mapping suggestions
```

### Generate Integration Templates
```
Use generate-integration-mapping for common integrations:
- Source: OneRoster (student data)
- Target: Caliper (learning analytics)
- Use case: "sync-student-data"
```

### Analyze Your Codebase for TimeBack Integration
```
Use analyze-codebase-integration to get personalized recommendations:
- Provide path to your application codebase
- Get systematic analysis of your project structure, dependencies, and patterns
- Receive tailored TimeBack API integration suggestions
- Get specific data models, endpoints, environment variables, and implementation steps
```

**Example Usage:**
```
"How do I integrate my codebase with TimeBack?"

Input: { "projectPath": "/path/to/your/app" }

Output: Comprehensive analysis including:
- Detected project type, language, and framework
- Identified educational patterns (user management, assessments, analytics)
- Prioritized TimeBack API recommendations (OneRoster, QTI, Caliper, etc.)
- Specific integration steps and code examples
- Required environment variables and dependencies
```

This tool performs almost like a deep research call on your codebase combined with the MCP server's knowledge of TimeBack APIs, providing intelligent recommendations based on your actual application structure and needs.

## Documentation Crawler Architecture

The TimeBack MCP Server includes a sophisticated documentation crawler that automatically indexes comprehensive documentation from multiple TimeBack API sources.

### 🕷️ Crawler Capabilities

#### Supported Documentation Formats
- **Swagger/OpenAPI Documentation** - Interactive API documentation with live examples
- **Scalar Documentation** - Modern API documentation with enhanced UX
- **Google Docs** - Rich text documentation with embedded content
- **Video Content** - Loom videos and other educational content (metadata extraction)
- **Static HTML** - Traditional documentation websites

#### Crawled Documentation Sources
- **QTI API**: https://qti.alpha-1edtech.com/docs/, OpenAPI specs, Google Docs guides
- **OneRoster API**: https://api.alpha-1edtech.com/scalar/, OpenAPI specifications
- **Caliper API**: https://caliper.alpha-1edtech.com/, comprehensive analytics documentation
- **PowerPath API**: https://api.alpha-1edtech.com/scalar?api=powerpath-api, mastery learning docs
- **CASE API**: https://api.alpha-1edtech.com/scalar?api=case-api, standards documentation
- **OpenBadge & CLR**: Video walkthroughs and implementation guides

### 🔍 Advanced Documentation Tools

#### Crawl TimeBack Documentation
```
Use crawl-timeback-documentation to index all available documentation:
- Automatically discovers and crawls all TimeBack API documentation
- Extracts code examples, integration patterns, and best practices
- Builds searchable index with relationships between concepts
- Supports incremental updates and scheduling
```

#### Search Comprehensive Documentation
```
Use search-comprehensive-docs for intelligent documentation search:
- Query: "student enrollment workflow"
- Search across: all APIs, code examples, integration guides
- Filter by: API type, content format, difficulty level
- Get: relevant snippets with source links and context
```

#### Extract API Examples
```
Use get-api-examples to find implementation examples:
- API: "oneroster" 
- Functionality: "create student"
- Returns: code examples, request/response samples, integration patterns
```

#### Compare API Implementations
```
Use compare-api-implementations to understand differences:
- Source API: "oneroster" (user management)
- Target API: "caliper" (person entities)
- Functionality: "user representation"
- Returns: detailed comparison with mapping suggestions
```

#### Get Integration Patterns
```
Use get-integration-patterns for best practices:
- APIs: ["oneroster", "caliper"]
- Use Case: "student analytics pipeline"
- Difficulty: "intermediate"
- Returns: step-by-step integration patterns with code examples
```

### ⚙️ Crawler Configuration

The crawler supports extensive configuration options:

```env
# Crawler Settings
CRAWLER_MAX_RETRIES=3
CRAWLER_RETRY_DELAY=2000
CRAWLER_TIMEOUT=30000
CRAWLER_RATE_LIMIT=1000
CRAWLER_RESPECT_ROBOTS_TXT=true

# Scheduling
CRAWLER_SCHEDULE_ENABLED=true
CRAWLER_SCHEDULE_INTERVAL=24h
CRAWLER_INCREMENTAL_UPDATES=true

# Content Processing
CRAWLER_EXTRACT_CODE_EXAMPLES=true
CRAWLER_BUILD_RELATIONSHIPS=true
CRAWLER_INDEX_METADATA=true
```

### 🏗️ Crawler Architecture

#### Components
- **DocumentationCrawler** - Core crawling engine with multi-format support
- **DocumentationIndexer** - Advanced indexing with full-text search and relationships
- **DocumentationStore** - Persistent storage with versioning and caching
- **CrawlerScheduler** - Automated scheduling and incremental updates

#### Processing Pipeline
1. **Discovery** - Identify documentation sources and formats
2. **Crawling** - Extract content using format-specific parsers
3. **Processing** - Clean, structure, and enhance content
4. **Indexing** - Build searchable index with relationships
5. **Storage** - Persist with versioning and metadata
6. **Serving** - Provide fast search and retrieval through MCP tools

#### Content Enhancement
- **Code Example Extraction** - Automatically identify and extract code snippets
- **Relationship Building** - Connect related concepts across different APIs
- **Pattern Recognition** - Identify common integration patterns and best practices
- **Metadata Enrichment** - Add tags, categories, and difficulty levels

## API Integration Examples

### Student Data Synchronization
```typescript
// 1. Fetch students from OneRoster
// 2. Map to Caliper Person entities
// 3. Track learning activities
```

### Assessment Workflow
```typescript
// 1. Create assessment in QTI
// 2. Track attempts in Caliper
// 3. Update mastery in PowerPath
// 4. Map to CASE standards
```

## Development

### Project Structure
```
src/
├── config/           # Configuration management
├── server/           # Main MCP server implementation
├── services/         # Core services
│   ├── auth.ts                    # OAuth2 authentication
│   ├── openapi-parser.ts          # OpenAPI specification parsing
│   ├── codebase-analyzer.ts       # Intelligent codebase analysis
│   ├── documentation-crawler.ts   # Multi-format documentation crawler
│   ├── documentation-indexer.ts   # Advanced search and indexing
│   ├── documentation-store.ts     # Persistent storage with versioning
│   └── crawler-scheduler.ts       # Automated crawling and updates
├── utils/            # Utilities (logging, errors)
└── types/            # TypeScript type definitions
```

### Adding New Tools

1. Define tool schema in `setupToolHandlers()`
2. Implement tool logic in the server class
3. Add proper error handling and logging
4. Update documentation

### Testing

```bash
npm test
```

## TimeBack Platform APIs

### QTI (Question & Test Interoperability)
- **Purpose**: Assessment creation and delivery
- **Base URL**: https://qti.alpha-1edtech.com/api
- **Key Features**: Assessment tests, items, stimuli, scoring

### OneRoster
- **Purpose**: Student information system integration
- **Base URL**: https://api.alpha-1edtech.com
- **Key Features**: Users, classes, enrollments, grades

### Caliper
- **Purpose**: Learning analytics and activity tracking
- **Base URL**: https://caliper.alpha-1edtech.com
- **Key Features**: Learning events, entities, profiles

### PowerPath
- **Purpose**: Mastery learning and personalized paths
- **Base URL**: https://api.alpha-1edtech.com
- **Key Features**: Learning objectives, mastery tracking, adaptive paths

### CASE
- **Purpose**: Academic standards and competencies
- **Base URL**: https://api.alpha-1edtech.com
- **Key Features**: Standards frameworks, competencies, alignments

## Authentication

All TimeBack APIs use OAuth2 client credentials flow:

1. Obtain client ID and secret from TimeBack platform team
2. Configure in environment variables
3. Server automatically handles token refresh
4. Tokens are cached and reused until expiration

## Error Handling

The server includes comprehensive error handling:
- OAuth2 authentication failures
- API rate limiting
- Network connectivity issues
- Invalid data validation
- Schema parsing errors

## Logging

Configurable logging levels:
- `debug` - Detailed debugging information
- `info` - General operational messages
- `warn` - Warning conditions
- `error` - Error conditions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Support

For support with the TimeBack platform APIs, contact the 1EdTech platform team.
For issues with this MCP server, please open a GitHub issue.

---

**Built by Danny Gauntlet AI for the TimeBack 1EdTech Platform**
