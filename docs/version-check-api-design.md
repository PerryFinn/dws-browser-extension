# 浏览器扩展版本检查接口设计文档

## 1. 接口概述

### 1.1 功能描述
为浏览器扩展提供版本更新检查服务，支持动态配置更新信息和下载地址。

### 1.2 业务价值
- 自动检测扩展更新，提升用户体验
- 可配置的更新提示和下载链接

## 2. 接口规范

### 2.1 基本信息

| 属性 | 值 |
|------|-----|
| **接口名称** | 获取扩展版本信息 |
| **请求方式** | `GET` |
| **接口路径** | `/extension/info` |
| **完整 URL** | `http://172.20.124.81:12306/extension/info` |
| **Content-Type** | `application/json` |

### 2.2 请求参数

**无请求参数**

当前实现为简单的 GET 请求，不携带任何查询参数或请求体。

### 2.3 响应格式

#### 成功响应（HTTP 200）

```json
{
  "version": "1.3.0",
  "downloadUrl": "http://example.com/downloads/extension-1.3.0.zip",
  "message": "新版本包含重要功能更新和性能优化"
}
```

#### 响应字段定义

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `version` | string | **是** | 最新版本号（语义化版本） | `"1.3.0"` |
| `downloadUrl` | string | 否 | 下载链接，为空时使用扩展主页 | `"http://cdn.example.com/ext-1.3.0.zip"` |
| `message` | string | 否 | 更新说明，支持纯文本 | `"修复已知问题，提升稳定性"` |

#### 错误响应

```json
// HTTP 404 - 接口不存在
{
  "error": "Not Found"
}

// HTTP 500 - 服务器错误
{
  "error": "Internal Server Error",
  "message": "无法获取版本信息"
}
```

## 3. 业务逻辑

### 3.1 版本比较规则

前端使用 `compare-versions` 库进行语义化版本比较：

- 远程版本 > 本地版本 → 显示更新提示
- 远程版本 ≤ 本地版本 → 不显示提示
- 版本号格式：`MAJOR.MINOR.PATCH`（如 `1.2.3`）
- 支持前缀 `v`（自动去除）

### 3.2 缓存策略

前端实现了双层缓存机制：

| 场景 | 缓存时间 | 触发条件 |
|------|----------|----------|
| 成功响应 | 6 小时（可配置） | 默认行为 |
| 失败响应 | 5 分钟（固定） | 网络错误或格式错误 |
| 强制检查 | 跳过缓存 | 用户点击"重新检查" |

失败缓存不会启动后台定时器；5 分钟后再次打开 popup/options 或点击重新检查等触发版本检查时，会重新请求接口。

### 3.3 更新 URL 解析逻辑

```
优先级：downloadUrl > package.json.homepage
```

- 接口返回 `downloadUrl` → 使用该链接
- 接口未返回 `downloadUrl` → 回退到扩展主页

## 4. 数据模型

### 4.1 数据库表设计

```sql
CREATE TABLE extension_versions (
    id SERIAL PRIMARY KEY,
    extension_id VARCHAR(100) NOT NULL DEFAULT 'dws-browser-extension',
    version VARCHAR(50) NOT NULL,
    download_url TEXT,
    message TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(extension_id, version)
);

CREATE INDEX idx_extension_active
ON extension_versions(extension_id, is_active)
WHERE is_active = true;
```

### 4.2 示例数据

```sql
INSERT INTO extension_versions (extension_id, version, download_url, message, is_active)
VALUES
('dws-browser-extension', '1.3.0', 'http://cdn.example.com/ext-1.3.0.zip', '新增版本检查功能，优化用户体验', true);
```

## 5. 后端实现建议

### 5.1 技术栈推荐

| 层级 | 推荐方案 | 备选方案 |
|------|----------|----------|
| **语言/框架** | Node.js + Express | Python FastAPI / Go Gin |
| **数据库** | PostgreSQL | MySQL / SQLite |
| **缓存** | Redis | 内存缓存（小规模） |
| **部署** | Docker + Nginx | 直接部署 |

### 5.2 核心实现逻辑（伪代码）

```javascript
// GET /extension/info
app.get('/extension/info', async (req, res) => {
  try {
    // 1. 尝试从缓存获取
    const cached = await cache.get('extension:latest');
    if (cached) {
      return res.json(cached);
    }

    // 2. 从数据库查询最新版本
    const latestVersion = await db.query(`
      SELECT version, download_url, message
      FROM extension_versions
      WHERE extension_id = 'dws-browser-extension'
        AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (!latestVersion) {
      return res.status(404).json({ error: 'No version found' });
    }

    // 3. 构造响应
    const response = {
      version: latestVersion.version,
      downloadUrl: latestVersion.download_url,
      message: latestVersion.message
    };

    // 4. 写入缓存（TTL: 1 小时）
    await cache.set('extension:latest', response, 'EX', 3600);

    // 5. 返回响应
    res.json(response);
  } catch (error) {
    console.error('Version check failed:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '无法获取版本信息'
    });
  }
});
```

### 5.3 管理接口（可选）

为支持动态管理，可扩展以下接口：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/admin/versions` | `GET` | 获取版本列表 |
| `/admin/versions` | `POST` | 创建新版本 |
| `/admin/versions/:id` | `PUT` | 更新版本信息 |
| `/admin/versions/:id` | `DELETE` | 删除版本 |
| `/admin/versions/:id/activate` | `POST` | 激活版本 |
| `/admin/versions/:id/deactivate` | `POST` | 停用版本 |

## 6. 配置管理

### 6.1 前端可配置项

| 配置项 | 存储位置 | 默认值 | 说明 |
|--------|----------|--------|------|
| `versionCheckUrl` | LocalStorage | `http://172.20.124.81:12306/extension/info` | 检查更新的 URL |
| `versionCheckTtlMinutes` | LocalStorage | `360`（6 小时） | 缓存有效期（分钟） |

### 6.2 配置界面位置

`Options` → `Settings` → `Base` → 版本检查设置区域

## 7. 错误处理

### 7.1 前端容错机制

| 错误类型 | 处理方式 | 重试策略 |
|----------|----------|----------|
| 网络超时 | 请求超过 10 秒主动中止，并记录错误 | 写入 5 分钟失败缓存，之后下次触发检查时重试 |
| HTTP 错误（4xx/5xx） | 记录状态码 | 写入 5 分钟失败缓存，之后下次触发检查时重试 |
| JSON 解析失败 | 记录错误信息 | 写入 5 分钟失败缓存，之后下次触发检查时重试 |
| 字段格式错误 | `version` 缺失、为空或不是合法语义化版本时记录格式错误 | 写入 5 分钟失败缓存，之后下次触发检查时重试 |

### 7.2 后端监控建议

- 记录接口访问日志（IP、User-Agent、时间）
- 监控响应时间（P50/P95/P99）
- 告警：错误率 > 5% 或 P95 > 1s

## 8. 安全考虑

### 8.1 接口安全

- **CORS**：配置允许的域名
- **Rate Limiting**：限制单 IP 请求频率（如 100 次/小时）
- **输入验证**：版本号格式校验（防止注入）

### 8.2 数据安全

- 敏感配置（如 API Key）不应暴露在响应中
- 定期备份版本数据

## 9. 部署与运维

### 9.1 部署清单

- [ ] 配置域名（可选）
- [ ] 初始化数据库表结构
- [ ] 部署后端服务
- [ ] 配置反向代理（Nginx，可选）
- [ ] 设置日志收集
- [ ] 配置监控告警
- [ ] 测试接口可用性

### 9.2 运维建议

- 使用 PM2 或 systemd 管理进程
- 配置 Nginx 静态缓存（TTL: 1 分钟，可选）
- 定期清理过期日志
- 版本数据定期备份

## 10. 测试用例

### 10.1 接口测试

```bash
# 正常请求
curl -X GET "http://172.20.124.81:12306/extension/info"

# 预期响应
{
  "version": "1.3.0",
  "downloadUrl": "http://example.com/ext-1.3.0.zip",
  "message": "新版本更新说明"
}
```

### 10.2 边界测试

| 场景 | 预期行为 |
|------|----------|
| 数据库无记录 | 返回 404 |
| `version` 字段为空 | 返回 500 |
| `downloadUrl` 为空 | 前端回退到 homepage |
| 网络超时 | 请求超过 10 秒主动中止，写入失败缓存；之后下次触发检查时重试 |
| 版本号格式错误 | 写入失败缓存，5 分钟内不重复请求；之后下次触发检查时重试 |

---

**文档版本**: 1.2
**最后更新**: 2026/05/28
**维护者**: DWS Browser Extension Team
