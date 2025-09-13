# Hybrid Development Setup

## Problem
Container inotify limits prevent React hot-reload from working properly.

## Solution: Frontend Local + Backend Container

### 1. Keep Backend in Container
The backend stays in the container and is accessible at:
- API: `https://adhd-connect-2.preview.emergentagent.com/api`
- Health check: `https://adhd-connect-2.preview.emergentagent.com/health`

### 2. Run Frontend Locally

1. **Download frontend folder** to your local machine
2. **Install dependencies**:
   ```bash
   cd /path/to/frontend
   yarn install
   ```

3. **Update .env for local development**:
   ```
   EXPO_PUBLIC_BACKEND_URL=https://adhd-connect-2.preview.emergentagent.com/api
   REACT_APP_BACKEND_URL=https://adhd-connect-2.preview.emergentagent.com
   ```

4. **Start local development server**:
   ```bash
   yarn start
   # or
   npx expo start --web
   ```

### 3. Benefits
- ✅ Full hot-reload works
- ✅ Fast development cycle
- ✅ Backend APIs still available
- ✅ All container services (MongoDB, etc.) still work

### 4. Deployment
When ready to deploy:
1. Upload changes to container
2. Run export build in container
3. Deploy to production

This gives you the best of both worlds: fast local development with full container backend support.