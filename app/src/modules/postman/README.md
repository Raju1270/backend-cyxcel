# Postman Module

This module provides integration with the Postman API to fetch and manage Postman collections.

## Features

- Fetch all Postman collections from your workspace
- Get the latest collection (by update date)
- Get a specific collection by ID
- Returns collections in JSON format

## Configuration

Add the following environment variable to your `.env` file:

```env
POSTMAN_API_KEY=your_postman_api_key_here
```

### Getting a Postman API Key

1. Go to [Postman](https://www.postman.com/)
2. Sign in to your account
3. Navigate to your [API Keys settings](https://go.postman.co/settings/me/api-keys)
4. Click "Generate API Key"
5. Give it a name and copy the generated key
6. Add it to your environment configuration

## API Endpoints

### Get All Collections

```http
GET /postman/collections
```

Returns an array of all collections with metadata (id, name, owner, timestamps).

**Response Example:**
```json
[
  {
    "id": "12345678-1234-5678-1234-567812345678",
    "name": "My API Collection",
    "owner": "123456",
    "uid": "123456-12345678-1234-5678-1234-567812345678",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
]
```

### Get Latest Collection

```http
GET /postman/collections/latest
```

Returns the most recently updated collection with full details in JSON format.

**Response Example:**
```json
{
  "info": {
    "name": "My API Collection",
    "description": "API collection description",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Users",
      "item": [
        {
          "name": "Get All Users",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/users",
              "host": ["{{baseUrl}}"],
              "path": ["users"]
            }
          }
        }
      ]
    }
  ],
  "variable": []
}
```

### Get Collection by ID

```http
GET /postman/collections/:id
```

Returns a specific collection by its UID with full details in JSON format.

**Parameters:**
- `id` (string, required): Collection UID

**Response Example:**
Same as "Get Latest Collection" response format.

## Error Handling

The module handles the following error cases:

- **503 Service Unavailable**: Postman API key is not configured
- **404 Not Found**: No collections found in workspace
- **500 Internal Server Error**: General API errors
- **Other HTTP errors**: Propagated from Postman API with appropriate status codes

## Usage Example

### In a Controller

```typescript
import { Controller, Get } from '@nestjs/common';
import { PostmanService } from '../postman/postman.service';

@Controller('api')
export class ApiController {
  constructor(private readonly postmanService: PostmanService) {}

  @Get('documentation')
  async getApiDocumentation() {
    // Get the latest Postman collection
    const collection = await this.postmanService.getLatestCollection();
    return collection;
  }
}
```

### In a Service

```typescript
import { Injectable } from '@nestjs/common';
import { PostmanService } from '../postman/postman.service';

@Injectable()
export class DocumentationService {
  constructor(private readonly postmanService: PostmanService) {}

  async syncCollections() {
    const collections = await this.postmanService.getAllCollections();
    // Process collections...
  }
}
```

## Output Format

The module returns collections in **JSON format**, which is the native format for Postman collections (Collection v2.1.0 schema).

### Alternative Formats

If you need a different format, you can:

1. **Download as file**: Modify the controller to set appropriate headers:
   ```typescript
   @Get('collections/latest/download')
   @Header('Content-Type', 'application/json')
   @Header('Content-Disposition', 'attachment; filename="collection.json"')
   async downloadLatestCollection() {
     return await this.postmanService.getLatestCollection();
   }
   ```

2. **Export to other formats**: Use libraries like:
   - `postman-collection` - Parse and manipulate Postman collections
   - `openapi-to-postman` / `postman-to-openapi` - Convert between formats

## Technical Details

- Uses `axios` for HTTP requests
- Postman API base URL: `https://api.getpostman.com`
- API timeout: 10 seconds
- Authentication: API Key via `X-Api-Key` header

## Postman API Documentation

For more information about the Postman API, visit:
- [Postman API Documentation](https://www.postman.com/postman/workspace/postman-public-workspace/documentation/12959542-c8142d51-e97c-46b6-bd77-52bb66712c9a)
- [Collection Schema](https://schema.postman.com/)

