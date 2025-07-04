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

### 🔧 MCP Tools

1. **`load-timeback-specs`** - Load all TimeBack OpenAPI specifications
2. **`analyze-api-endpoints`** - Analyze endpoints with filtering by API, tag, or method
3. **`search-api-documentation`** - Search across all API documentation
4. **`compare-data-models`** - Compare schemas between different APIs
5. **`generate-integration-mapping`** - Create integration templates
6. **`validate-api-integration`** - Validate integration configurations
7. **`generate-api-documentation`** - Generate comprehensive API docs
8. **`analyze-codebase-integration`** - Analyze your codebase and recommend TimeBack integrations

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
# Edit .env with your TimeBack API credentials
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
├── services/         # API services (OpenAPI parser, auth)
├── tools/            # MCP tool implementations
├── resources/        # MCP resource handlers
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
