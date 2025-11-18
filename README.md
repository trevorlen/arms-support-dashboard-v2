# ARMS Support Dashboard v2.0

Modern support analytics dashboard for ARMS built with React and Azure Functions.

## Architecture

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Azure Functions (Python)
- **APIs**: Freshdesk API integration
- **Hosting**: Azure Static Web Apps with integrated Functions

## Project Structure

```
ARMS-Support-Dashboard-v2/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/   # Dashboard components
│   │   ├── services/     # API client
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # Entry point
│   ├── package.json
│   └── vite.config.js
├── api/                   # Azure Functions
│   ├── function_app.py   # All API endpoints
│   ├── requirements.txt  # Python dependencies
│   └── host.json         # Functions configuration
└── .github/
    └── workflows/
        └── azure-static-web-apps.yml  # CI/CD pipeline
```

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.9, 3.10, or 3.11
- Azure Functions Core Tools v4
- Azure CLI (for deployment)

### Setup

1. **Install API dependencies**:
   ```bash
   cd api
   pip install -r requirements.txt
   ```

2. **Configure API secrets** (`api/local.settings.json`):
   ```json
   {
     "Values": {
       "FRESHDESK_API_KEY": "your_api_key",
       "FRESHDESK_DOMAIN": "your_domain"
     }
   }
   ```

3. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   ```

4. **Configure frontend** (`frontend/.env`):
   ```
   VITE_API_URL=http://localhost:7071/api
   ```

### Running Locally

**Terminal 1 - API**:
```bash
cd api
func start
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

Open http://localhost:3000

## Deployment to Azure

### 1. Create Azure Static Web App

```bash
# Login to Azure
az login

# Create resource group (if needed)
az group create --name rg-arms-dashboard --location eastus

# Create Static Web App
az staticwebapp create \
  --name arms-support-dashboard \
  --resource-group rg-arms-dashboard \
  --source https://github.com/YOUR_USERNAME/YOUR_REPO \
  --location eastus \
  --branch master \
  --app-location "/frontend" \
  --api-location "/api" \
  --output-location "dist"
```

### 2. Get Deployment Token

```bash
az staticwebapp secrets list \
  --name arms-support-dashboard \
  --resource-group rg-arms-dashboard \
  --query "properties.apiKey" --output tsv
```

### 3. Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add secret: `AZURE_STATIC_WEB_APPS_API_TOKEN` = (token from step 2)

### 4. Configure Application Settings

Set these in Azure Portal (Static Web App → Configuration):

- `FRESHDESK_API_KEY`: Your Freshdesk API key
- `FRESHDESK_DOMAIN`: Your Freshdesk subdomain (e.g., `arms`)
- `VITE_API_URL`: `/api` (for production)

### 5. Deploy

Push to master branch:
```bash
git add .
git commit -m "Deploy to Azure"
git push origin master
```

GitHub Actions will automatically build and deploy!

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/stats` - API statistics
- `GET /api/tickets` - Fetch tickets with filters
- `GET /api/ticket/{id}` - Get single ticket with conversations
- `GET /api/summary` - Summary statistics

## Dashboard Features

- **6 Interactive Views**: Platform, League, Hour of Day, Day of Week, Ticket Types, Priority/Issue Type
- **KPI Cards**: Key metrics with trends
- **Date Range Selector**: 1, 7, 14, 30, 90 days
- **Ticket Drilldown**: Click any ticket for detailed view
- **Real-time Health Monitoring**: API status indicator
- **Responsive Design**: Works on mobile, tablet, desktop

## Technology Stack

### Frontend
- React 18
- Vite 5
- Tailwind CSS 3
- Recharts (data visualization)
- Axios (HTTP client)
- date-fns (date handling)

### Backend
- Azure Functions (Python v2 model)
- Requests (HTTP library)
- Freshdesk API v2

### Deployment
- Azure Static Web Apps
- GitHub Actions CI/CD
- Automatic SSL/CDN

## Cost Estimate

With typical internal usage:
- Azure Static Web Apps: **Free tier** (100 GB bandwidth)
- Azure Functions: **Free tier** (1M requests/month)
- **Total: $0/month** for most use cases

## Support

For issues or questions, contact the development team.

---

**Version**: 2.0.0
**Last Updated**: November 2025
