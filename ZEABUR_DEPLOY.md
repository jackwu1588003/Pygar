# Zeabur 部署指南

## ✅ 修正內容

### 問題
Zeabur 使用環境變量 `PORT` 來動態分配端口，但原始配置硬編碼了端口 8000。

### 解決方案

已更新以下文件以支持動態端口：

#### 1. Dockerfile 修改

```dockerfile
# 設置默認端口（Zeabur 會覆蓋此值）
ENV PORT=8000

# 動態暴露端口
EXPOSE ${PORT}

# Health check 使用 PORT 環境變量
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://localhost:{os.getenv(\"PORT\", \"8000\")}/health')"

# 啟動命令使用 PORT 環境變量
CMD uvicorn backend.main:socket_app --host 0.0.0.0 --port ${PORT}
```

**改動說明**：
- ✅ 使用 `ENV PORT=8000` 設置默認值
- ✅ `EXPOSE ${PORT}` 動態端口暴露
- ✅ CMD 命令使用 `${PORT}` 環境變量
- ✅ Health check 讀取環境變量

#### 2. 新增 start.sh（備用方案）

如果環境變量在 CMD 中無法正確展開，可使用啟動腳本：

```dockerfile
# 在 Dockerfile 中添加
COPY start.sh .
RUN chmod +x start.sh
CMD ["./start.sh"]
```

## 🚀 Zeabur 部署步驟

### 方法一：GitHub 連接部署（推薦）

1. **推送代碼到 GitHub**
   ```bash
   git add .
   git commit -m "Fix Zeabur port configuration"
   git push origin main
   ```

2. **在 Zeabur 創建項目**
   - 訪問 [Zeabur Dashboard](https://zeabur.com)
   - 點擊 "New Project"
   - 選擇你的 GitHub 倉庫

3. **自動部署**
   - Zeabur 自動檢測 Dockerfile
   - 自動設置 PORT 環境變量
   - 自動構建和部署

4. **訪問應用**
   - Zeabur 會提供一個公開 URL
   - 如：`https://your-app.zeabur.app`

### 方法二：Zeabur CLI 部署

1. **安裝 CLI**
   ```bash
   npm install -g @zeabur/cli
   ```

2. **登錄**
   ```bash
   zeabur login
   ```

3. **部署**
   ```bash
   zeabur deploy
   ```

## 🔧 環境變量配置

Zeabur 會自動設置以下變量：

| 變量 | 說明 | 默認值 |
|------|------|--------|
| `PORT` | 應用監聽端口 | 由 Zeabur 動態分配 |

### 可選環境變量

可在 Zeabur Dashboard 設置：

```bash
# 在 Zeabur Dashboard > Settings > Environment Variables 添加
LOG_LEVEL=info
MAX_PLAYERS=100
TICK_RATE=20
```

## 📊 驗證部署

### 1. 檢查日誌
在 Zeabur Dashboard 查看部署日誌：
```
Game server started!
Tick rate: 20.0 TPS
Initial food count: 200
Uvicorn running on http://0.0.0.0:XXXX
```

### 2. 測試 Health Check
```bash
curl https://your-app.zeabur.app/health
```

應返回：
```json
{
  "status": "healthy",
  "players": 0,
  "food": 200
}
```

### 3. 測試遊戲
訪問 `https://your-app.zeabur.app` 並開始遊戲

## 🐛 故障排除

### 問題：應用無法啟動
**解決方案**：
- 檢查 Zeabur 日誌
- 確認 Dockerfile 語法正確
- 驗證 requirements.txt 包含所有依賴

### 問題：WebSocket 連接失敗
**解決方案**：
- 確認使用 HTTPS（Zeabur 自動提供）
- 檢查 Socket.IO CORS 設置
- 驗證客戶端使用正確的 URL

### 問題：端口監聽錯誤
**解決方案**：
- ✅ 已修復！使用 `${PORT}` 環境變量
- 確認 Dockerfile CMD 正確
- 檢查日誌中的端口號

## 📝 本地測試

測試修改後的 Dockerfile：

```bash
# 構建鏡像
docker build -t pygar .

# 使用自定義端口運行
docker run -p 3000:3000 -e PORT=3000 pygar

# 訪問 http://localhost:3000
```

## ✅ 檢查清單

部署前確認：
- [x] Dockerfile 使用 `${PORT}` 環境變量
- [x] CMD 命令正確配置
- [x] Health check 端點可訪問
- [x] requirements.txt 完整
- [x] 代碼已推送到 GitHub
- [ ] 在 Zeabur 創建項目
- [ ] 驗證部署成功
- [ ] 測試遊戲功能

## 🎮 部署後功能

部署到 Zeabur 後，你的遊戲將支持：
- ✅ 全球訪問（公開 URL）
- ✅ HTTPS 自動配置
- ✅ WebSocket 支持
- ✅ 移動端觸覺反饋（HTTPS 必需）
- ✅ 自動擴展
- ✅ CDN 加速

---

**現在 Zeabur 應該可以正確監聽端口了！** 🚀
