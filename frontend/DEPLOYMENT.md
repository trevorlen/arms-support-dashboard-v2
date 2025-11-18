# Deployment Guide - Azure Static Web Apps

Complete guide to deploying the ARMS Support Dashboard to Azure.

## 📋 Prerequisites

- Azure account with active subscription
- Azure CLI installed (optional)
- GitHub account (for CI/CD)
- Running Flask API on PythonAnywhere

## 🚀 Deployment Options

### Option 1: Azure Static Web Apps (Recommended) - FREE

Best for React apps. Includes:
- ✅ Free SSL certificate
- ✅ Global CDN
- ✅ Custom domains
- ✅ CI/CD from GitHub
- ✅ 100 GB bandwidth/month (free tier)

**Deployment Methods:**
- **A) VS Code Extension** (Easiest - see below)
- **B) Azure Portal** (GUI)
- **C) Azure CLI** (Command line)

### Option 2: Azure App Service

For full Node.js hosting with server-side capabilities.

### Option 3: Azure Blob Storage + CDN

Cheapest option for static files only.

---

## 🎯 Option 1A: Azure Static Web Apps - VS Code Extension (EASIEST)

### Prerequisites

1. **Install Azure Static Web Apps Extension**:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search "Azure Static Web Apps"
   - Click "Install"

2. **Install Azure Account Extension** (if not already):
   - Search "Azure Account"
   - Click "Install"

### Deployment Steps

#### Step 1: Sign in to Azure

1. Press `Ctrl+Shift+P` to open Command Palette
2. Type "Azure: Sign In"
3. Follow prompts to authenticate

#### Step 2: Build Your App

Open terminal in VS Code (Ctrl+\`) and run:
```bash
cd ARMS-Support-Dashboard
npm install
npm run build
```

#### Step 3: Deploy with Extension

1. **Open Azure Extension Panel**:
   - Click Azure icon in left sidebar
   - Expand "Static Web Apps" section

2. **Create Static Web App**:
   - Click "+" icon next to "Static Web Apps"
   - Follow prompts:

   **Wizard Steps:**
   ```
   1. Name: arms-support-dashboard
   2. Region: East US 2 (or closest)
   3. Build preset: React
   4. App location: /
   5. Build location: dist
   6. Subscription: Select your subscription
   7. Resource Group: Create new "arms-support-rg"
   ```

3. **Wait for Deployment**:
   - Extension will build and deploy
   - Progress shown in Output panel
   - Takes 2-3 minutes

4. **View Your App**:
   - Right-click your app in Azure panel
   - Select "Browse Site"
   - Your dashboard opens in browser!

#### Step 4: Configure Environment Variables

1. **In VS Code Azure Panel**:
   - Right-click your Static Web App
   - Select "Open in Portal"

2. **Add Environment Variable**:
   - Click "Configuration" in left menu
   - Click "+ Add"
   - Name: `VITE_API_URL`
   - Value: `https://yourusername.pythonanywhere.com/api`
   - Click "Save"

3. **Redeploy** (to apply variables):
   - In VS Code, right-click your app
   - Select "Deploy to Static Web App"
   - Select the `dist` folder
   - Confirm deployment

#### Step 5: Get Your URL

Your app URL appears in VS Code:
- Check Output panel
- Or right-click app → "Copy URL to Clipboard"

Format: `https://<random-name>.azurestaticapps.net`

### Quick Redeploy After Changes

After making code changes:

```bash
# 1. Build
npm run build

# 2. Deploy (in VS Code)
# Right-click app → "Deploy to Static Web App" → Select dist folder
```

**Or use Command Palette:**
```
Ctrl+Shift+P → "Static Web Apps: Deploy to Static Web App"
```

### Extension Features

**Right-Click Options on Your App:**
- 📱 **Browse Site** - Open in browser
- 🚀 **Deploy to Static Web App** - Redeploy
- 📋 **Copy URL to Clipboard** - Get URL
- 🌐 **Open in Portal** - Manage in Azure Portal
- 🗑️ **Delete** - Remove app
- 🔄 **Refresh** - Reload app list

**Output Panel Features:**
- Build logs
- Deployment status
- Error messages
- Success confirmation with URL

---

## 🎯 Option 1B: Azure Static Web Apps - Portal (Detailed)

### Step 1: Prepare Your Code

1. **Build the project**:
   ```bash
   cd ARMS-Support-Dashboard
   npm install
   npm run build
   ```

2. **Test the build**:
   ```bash
   npm run preview
   ```
   Open http://localhost:4173 to verify

3. **Configure API URL for production**:

   Create `.env.production`:
   ```env
   VITE_API_URL=https://yourusername.pythonanywhere.com/api
   ```

4. **Rebuild with production config**:
   ```bash
   npm run build
   ```

### Step 2: Push to GitHub

1. **Initialize Git** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - ARMS Dashboard"
   ```

2. **Create GitHub repository**:
   - Go to https://github.com/new
   - Name: `arms-support-dashboard`
   - Create repository

3. **Push code**:
   ```bash
   git remote add origin https://github.com/yourusername/arms-support-dashboard.git
   git branch -M main
   git push -u origin main
   ```

### Step 3: Create Azure Static Web App

#### Via Azure Portal (GUI):

1. **Go to Azure Portal**: https://portal.azure.com

2. **Create Resource**:
   - Click "+ Create a resource"
   - Search "Static Web Apps"
   - Click "Create"

3. **Configure Basics**:
   - **Subscription**: Select your subscription
   - **Resource Group**: Create new (e.g., "arms-support-rg")
   - **Name**: `arms-support-dashboard`
   - **Plan**: Free
   - **Region**: East US 2 (or closest to you)
   - **Source**: GitHub

4. **Authorize GitHub**:
   - Click "Sign in with GitHub"
   - Authorize Azure

5. **Configure Build**:
   - **Organization**: Your GitHub username
   - **Repository**: arms-support-dashboard
   - **Branch**: main
   - **Build Preset**: React
   - **App location**: `/`
   - **Api location**: (leave empty)
   - **Output location**: `dist`

6. **Review + Create**:
   - Click "Review + create"
   - Click "Create"

7. **Wait for deployment** (2-3 minutes):
   - Azure will create GitHub Actions workflow
   - First deployment will start automatically

#### Via Azure CLI:

```bash
# Login to Azure
az login

# Create resource group
az group create --name arms-support-rg --location eastus2

# Create static web app
az staticwebapp create \
  --name arms-support-dashboard \
  --resource-group arms-support-rg \
  --source https://github.com/yourusername/arms-support-dashboard \
  --location eastus2 \
  --branch main \
  --app-location "/" \
  --output-location "dist" \
  --login-with-github
```

### Step 4: Configure Environment Variables

1. **In Azure Portal**:
   - Go to your Static Web App
   - Click "Configuration" (left menu)
   - Click "+ Add"

2. **Add Variables**:
   ```
   Name: VITE_API_URL
   Value: https://yourusername.pythonanywhere.com/api
   ```

3. **Save and wait for redeployment**

### Step 5: Get Your URL

Your app will be available at:
```
https://<random-name>.azurestaticapps.net
```

Example: `https://proud-forest-0a1b2c3d4.azurestaticapps.net`

### Step 6: Configure Custom Domain (Optional)

1. **In Azure Portal**:
   - Go to Static Web App
   - Click "Custom domains"
   - Click "+ Add"

2. **Add Domain**:
   - Enter your domain (e.g., `dashboard.arms.com`)
   - Follow DNS configuration instructions
   - Azure provides free SSL certificate

---

## 🔧 Continuous Deployment

### Automatic Deployments

Azure Static Web Apps automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update dashboard"
git push

# Azure automatically:
# 1. Detects push
# 2. Runs GitHub Action
# 3. Builds app
# 4. Deploys to Azure
# 5. Updates live site (2-3 minutes)
```

### GitHub Actions Workflow

Azure creates `.github/workflows/azure-static-web-apps-*.yml`:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main

jobs:
  build_and_deploy_job:
    runs_on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          output_location: "dist"
```

### Manual Deployment

To deploy manually:

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy ./dist
```

---

## 🌐 Option 2: Azure App Service

### Quick Deploy:

1. **Build project**:
   ```bash
   npm run build
   ```

2. **Create App Service**:
   ```bash
   az webapp up \
     --name arms-support-dashboard \
     --resource-group arms-support-rg \
     --runtime "NODE:18-lts" \
     --sku F1
   ```

3. **Deploy**:
   ```bash
   az webapp deployment source config-zip \
     --name arms-support-dashboard \
     --resource-group arms-support-rg \
     --src dist.zip
   ```

---

## 📦 Option 3: Azure Blob Storage (Static Files)

### Steps:

1. **Create Storage Account**:
   ```bash
   az storage account create \
     --name armsdashboard \
     --resource-group arms-support-rg \
     --location eastus2 \
     --sku Standard_LRS
   ```

2. **Enable Static Website**:
   ```bash
   az storage blob service-properties update \
     --account-name armsdashboard \
     --static-website \
     --index-document index.html
   ```

3. **Upload Files**:
   ```bash
   az storage blob upload-batch \
     --account-name armsdashboard \
     --destination '$web' \
     --source dist/
   ```

4. **Get URL**:
   ```
   https://armsdashboard.z13.web.core.windows.net
   ```

---

## 🔒 Security Configuration

### CORS Setup

Ensure your Flask API (PythonAnywhere) allows requests from Azure:

**In `api.py`:**
```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://proud-forest-0a1b2c3d4.azurestaticapps.net",
            "https://dashboard.arms.com",
            "http://localhost:3000"
        ]
    }
})
```

### Environment Variables

**Never commit**:
- `.env` files
- API keys
- Secrets

**Always use**:
- Azure Configuration settings
- Environment variables in deployment

---

## 📊 Monitoring & Analytics

### Application Insights

1. **Enable in Azure Portal**:
   - Go to Static Web App
   - Click "Application Insights"
   - Click "Enable"

2. **View Metrics**:
   - Page views
   - Load times
   - Errors
   - API calls

---

## 🐛 Troubleshooting

### Build Fails

**Problem**: GitHub Action fails to build

**Solutions**:
1. Check `package.json` scripts
2. Verify Node version in workflow
3. Check build logs in GitHub Actions tab

### API Connection Failed

**Problem**: Dashboard can't connect to API

**Solutions**:
1. Verify `VITE_API_URL` in Azure Configuration
2. Check CORS settings in Flask API
3. Test API URL directly in browser
4. Check PythonAnywhere API is running

### Environment Variables Not Working

**Problem**: `VITE_API_URL` not applied

**Solutions**:
1. Redeploy after setting variables
2. Ensure variable name starts with `VITE_`
3. Check Azure Configuration saved properly

### Site Shows Old Version

**Problem**: Updates not appearing

**Solutions**:
1. Check GitHub Action completed successfully
2. Clear browser cache (Ctrl+Shift+R)
3. Wait 2-3 minutes for CDN to update

---

## 💰 Cost Estimate

### Azure Static Web Apps (Free Tier)

| Resource | Free Tier | Cost |
|----------|-----------|------|
| Bandwidth | 100 GB/month | $0 |
| Build Minutes | 50/month | $0 |
| Custom Domain | Unlimited | $0 |
| SSL Certificate | Included | $0 |
| **Total** | - | **$0/month** |

**Beyond Free Tier**:
- Additional bandwidth: $0.20/GB
- Standard tier (for more features): $9/month

---

## 🎯 Post-Deployment Checklist

- [ ] Dashboard loads successfully
- [ ] API connection works
- [ ] All three dashboards render correctly
- [ ] Date range selector functions
- [ ] Refresh button works
- [ ] Charts display data
- [ ] Mobile view is responsive
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] GitHub Actions workflow running

---

## 📧 Update Email Template

Update your weekly email to link to the dashboard:

```html
Subject: ARMS Weekly Support Report - Week of Nov 18

Hi Team,

📊 View this week's interactive dashboard:
https://arms-support-dashboard.azurestaticapps.net

Quick Stats:
• 150 tickets created
• 12 system issues
• 8 require dev assistance

The dashboard includes real-time data with:
✓ Platform breakdown
✓ League analysis
✓ Hour-by-hour trends

---
ARMS Support Team
```

---

## 🚀 Next Steps

After successful deployment:

1. **Test thoroughly** on different devices
2. **Share URL** with team
3. **Set up monitoring** with Application Insights
4. **Configure alerts** for downtime
5. **Plan regular updates** via GitHub pushes

---

## 📞 Support

For deployment issues:
- Check [Azure Static Web Apps docs](https://docs.microsoft.com/azure/static-web-apps/)
- Review GitHub Actions logs
- Check Azure Portal activity log

---

**Deployment complete! 🎉**

Your dashboard is now live and accessible worldwide with automatic updates from GitHub!
