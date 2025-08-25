# Flint Project V0 Server

## Overview

A NestJS-based REST API server for financial scenario modeling and SKU management. This application provides endpoints for calculating revenue, COGS (Cost of Goods Sold), and profit scenarios with dynamic growth projections over time.

## Architecture

### Technology Stack
- **Framework**: NestJS 10.x with TypeScript
- **Runtime**: Node.js ≥22.0.0
- **Database**: Supabase (PostgreSQL)
- **Testing**: Jest
- **Containerization**: Docker & Docker Compose
- **Hot Reload**: Webpack HMR / Nodemon

### Project Structure
```
src/
├── app.module.ts          # Root application module
├── main.ts                # Application entry point
├── scenarios/             # Scenario calculation module
│   ├── scenarios.controller.ts
│   ├── scenarios.service.ts
│   └── scenarios.module.ts
├── skus/                  # SKU management module
│   ├── skus.controller.ts
│   ├── skus.service.ts
│   └── skus.module.ts
└── supabase/             # Supabase integration module
    ├── supabase.module.ts
    └── supabase.service.ts
```

## Features

### Core Functionality

#### 1. **Revenue SKU Management**
- Store and retrieve revenue SKUs with configurable parameters:
  - Upfront deposits
  - Monthly recurring revenue
  - Active revenue periods
  - Deposit refund timing

#### 2. **COGS Tracking**
- Monthly COGS breakdown by SKU
- Phase-based cost allocation
- Aggregated COGS calculations

#### 3. **Financial Scenario Modeling**
- **Waterfall Analysis**: Fixed scenario calculations with predefined SKU quantities
- **Dynamic Scenarios**: Customizable growth projections with three growth types:
  - Percentage growth
  - Incremental growth
  - No growth (static)

#### 4. **Comprehensive Financial Metrics**
- Monthly revenue totals
- Monthly COGS totals
- Gross income calculations
- Profit margin percentages
- Cumulative gross profit tracking

## Database Schema

### Tables

#### `revenue_skus`
- `sku_id` (PK): Unique SKU identifier
- `sku_name`: Display name
- `upfront_deposit`: Initial deposit amount
- `selection_period_months`: Duration of selection period
- `active_revenue_start_month`: Month when recurring revenue begins
- `active_revenue_end_month`: Optional end month for revenue
- `monthly_revenue`: Recurring monthly amount
- `deposit_refund_month`: Optional month for deposit refund
- `cogs_sku_id` (FK): Reference to associated COGS SKU

#### `cogs_skus`
- `sku_id` (PK): Unique COGS SKU identifier
- `sku_name`: Display name
- `total_cogs`: Total cost of goods sold
- `description`: Optional description

#### `cogs_monthly_breakdown`
- `breakdown_id` (PK): Unique breakdown identifier
- `sku_id` (FK): Reference to COGS SKU
- `month_number`: Month in lifecycle (1-60)
- `cogs_amount`: Cost amount for the month
- `phase`: Optional phase designation

## API Endpoints

### Scenarios
- `GET /scenarios/waterfall` - Calculate predefined waterfall scenario
- `POST /scenarios/generate` - Generate dynamic scenario with custom parameters

### SKUs
- `GET /skus/revenue` - List all revenue SKUs
- `GET /skus/cogs` - List all COGS SKUs
- `GET /skus/revenue/:id/cogs-breakdown` - Get COGS breakdown for a revenue SKU

### Health Check
- `GET /health` - Application health status

## Installation

### Prerequisites
- Node.js ≥22.0.0
- npm or yarn
- Docker (optional, for containerized deployment)
- Supabase account and project

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd flintProjectV0Server
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
PORT=8080
NODE_ENV=development
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up database schema in Supabase using `schema.sql` as reference

## Development

### Local Development
```bash
# Standard development with auto-restart
npm run start:dev

# Development with hot module replacement
npm run start:hot

# Debug mode with inspector
npm run start:debug
```

### Docker Development
```bash
# Build and run with docker-compose (development profile)
npm run docker:dev

# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run
```

## Testing

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Production Deployment

### Building for Production
```bash
# Compile TypeScript to JavaScript
npm run build

# Start production server
npm start
```

### Docker Production
```bash
# Using docker-compose
docker-compose up -d

# Manual Docker commands
docker build -t flint-server .
docker run -p 8080:8080 --env-file .env flint-server
```

## API Usage Examples

### Generate Dynamic Scenario
```bash
POST /scenarios/generate
Content-Type: application/json

{
  "name": "Q1 Growth Projection",
  "skuItems": [
    {
      "skuId": "R10",
      "startMonth": 1,
      "quantity": 100,
      "growthType": "percentage",
      "growthValue": 10
    },
    {
      "skuId": "R20",
      "startMonth": 3,
      "quantity": 50,
      "growthType": "increment",
      "growthValue": 5
    }
  ]
}
```

### Response Structure
```json
{
  "monthlyDetails": [
    {
      "month": 1,
      "total": 15000,
      "formattedTotal": "$15,000.00"
    }
  ],
  "monthlyCogsDetails": [...],
  "monthlyGrossIncomeDetails": [...],
  "monthlyProfitMarginDetails": [...],
  "monthlyCumulativeGrossProfitDetails": [...]
}
```

## Configuration Files

- `nodemon.json` - Nodemon configuration for development
- `jest.config.js` - Jest testing configuration
- `tsconfig.json` - TypeScript compiler options
- `webpack.config.js` - Webpack bundling configuration
- `webpack-hmr.config.js` - Hot module replacement configuration
- `docker-compose.yml` - Docker services configuration

## Health Monitoring

The application includes health checks for Docker deployment:
- Endpoint: `GET /health`
- Docker health check interval: 30s
- Timeout: 10s
- Retries: 3

## Security Considerations

- CORS is enabled for cross-origin requests
- Environment variables for sensitive configuration
- Supabase Row Level Security (RLS) should be configured
- Use HTTPS in production environments

## Performance Optimization

- Efficient database queries with Supabase client
- Batch processing for scenario calculations
- Caching strategies for frequently accessed SKU data
- Docker multi-stage builds for optimized images

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure port 8080 is available or modify in `.env`
2. **Supabase connection**: Verify SUPABASE_URL and SUPABASE_ANON_KEY
3. **Node version**: Confirm Node.js ≥22.0.0 is installed
4. **Docker permissions**: May need sudo for Docker commands on Linux

### Debugging
- Check application logs: `docker logs flint-server`
- Verify environment variables are loaded correctly
- Test Supabase connection independently
- Use debug mode: `npm run start:debug`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes with descriptive messages
4. Write/update tests as needed
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or feature requests, please open an issue in the project repository.