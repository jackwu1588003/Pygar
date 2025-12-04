# Zeabur Deployment Guide

## ✅ Fixes Applied

### Issue
Zeabur uses the environment variable `PORT` to dynamically assign a port, but the original configuration hardcoded port 8000.

### Solution

The following files have been updated to support dynamic ports:

#### 1. Dockerfile Modification

```dockerfile
# Set default port (Zeabur will override this)
ENV PORT=8000

# Expose port dynamically
EXPOSE ${PORT}

# Health check uses PORT environment variable
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://localhost:{os.getenv(\"PORT\", \"8000\")}/health')"

# Start command uses PORT environment variable
CMD uvicorn backend.main:socket_app --host 0.0.0.0 --port ${PORT}
```

**Changes Explained**:
- ✅ Used `ENV PORT=8000` to set a default value
- ✅ `EXPOSE ${PORT}` for dynamic port exposure
- ✅ CMD command uses `${PORT}` environment variable
- ✅ Health check reads environment variable

#### 2. Added start.sh (Fallback)

If environment variables are not correctly expanded in CMD, use the startup script:

```dockerfile
# Add to Dockerfile
COPY start.sh .
RUN chmod +x start.sh
CMD ["./start.sh"]
```

## 🚀 Zeabur Deployment Steps

### Method 1: GitHub Connection (Recommended)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Fix Zeabur port configuration"
   git push origin main
   ```

2. **Create Project in Zeabur**
   - Visit [Zeabur Dashboard](https://zeabur.com)
   - Click "New Project"
   - Select your GitHub repository

3. **Automatic Deployment**
   - Zeabur automatically detects Dockerfile
   - Automatically sets PORT environment variable
   - Automatically builds and deploys

4. **Access Application**
   - Zeabur will provide a public URL
   - E.g., `https://your-app.zeabur.app`

### Method 2: Zeabur CLI Deployment

1. **Install CLI**
   ```bash
   npm install -g @zeabur/cli
   ```

2. **Login**
   ```bash
   zeabur login
   ```

3. **Deploy**
   ```bash
   zeabur deploy
   ```

## 🔧 Environment Variable Configuration

Zeabur automatically sets the following variables:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `PORT` | Application listening port | Dynamically assigned by Zeabur |

### Optional Environment Variables

Can be set in Zeabur Dashboard:

```bash
# Add in Zeabur Dashboard > Settings > Environment Variables
LOG_LEVEL=info
MAX_PLAYERS=100
TICK_RATE=20
```

## 📊 Verify Deployment

### 1. Check Logs
View deployment logs in Zeabur Dashboard:
```
Game server started!
Tick rate: 20.0 TPS
Initial food count: 200
Uvicorn running on http://0.0.0.0:XXXX
```

### 2. Test Health Check
```bash
curl https://your-app.zeabur.app/health
```

Should return:
```json
{
  "status": "healthy",
  "players": 0,
  "food": 200
}
```

### 3. Test Game
Visit `https://your-app.zeabur.app` and start the game.

## 🐛 Troubleshooting

### Issue: Application fails to start
**Solution**:
- Check Zeabur logs
- Confirm Dockerfile syntax is correct
- Verify requirements.txt contains all dependencies

### Issue: WebSocket connection failed
**Solution**:
- Confirm using HTTPS (Zeabur provides automatically)
- Check Socket.IO CORS settings
- Verify client is using the correct URL

### Issue: Port listening error
**Solution**:
- ✅ Fixed! Using `${PORT}` environment variable
- Confirm Dockerfile CMD is correct
- Check port number in logs

### Issue: ModuleNotFoundError: No module named 'fastapi'
**Solution**:
- This is usually because Zeabur's "Service Path" is set incorrectly.
- **Please ensure Service Path is set to the project root (`.`), NOT `backend`.**
- If set to `backend`, Zeabur cannot find `requirements.txt` and the `frontend` folder in the root.
- As a fallback, we have added `requirements.txt` to the `backend/` directory, but deploying from root is still recommended to ensure frontend files are available.

### Issue: Frontend files not found
**Solution**:
- Confirm Service Path is root (`.`).
- The application needs access to the `frontend/` directory to serve static files.

## 📝 Local Testing

Test the modified Dockerfile:

```bash
# Build image
docker build -t pygar .

# Run with custom port
docker run -p 3000:3000 -e PORT=3000 pygar

# Access http://localhost:3000
```

## ✅ Checklist

Confirm before deployment:
- [x] Dockerfile uses `${PORT}` environment variable
- [x] CMD command correctly configured
- [x] Health check endpoint accessible
- [x] requirements.txt complete
- [x] Code pushed to GitHub
- [ ] Create project in Zeabur
- [ ] Verify deployment success
- [ ] Test game functionality

## 🎮 Post-Deployment Features

After deploying to Zeabur, your game will support:
- ✅ Global access (Public URL)
- ✅ HTTPS automatic configuration
- ✅ WebSocket support
- ✅ Mobile haptic feedback (HTTPS required)
- ✅ Auto-scaling
- ✅ CDN acceleration

---

**Zeabur should now correctly listen to the port!** 🚀
