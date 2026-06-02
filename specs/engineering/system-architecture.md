# 系统架构概览

**最后更新**: 2026-06-02

---

## 架构类型

纯前端 + 轻量后端数据库服务，无服务端业务逻辑层。

## 系统拓扑

```text
┌─────────────────────────────────┐
│          用户浏览器              │
│                                 │
│  ┌──────────────┐  ┌──────────┐ │
│  │  桌面端       │  │ 手机端   │ │
│  │  index.html  │  │mobile.html│ │
│  │              │  │          │ │
│  │ app.js       │  │(内联脚本)│ │
│  │ sync.js      │  │          │ │
│  │ history.js   │  │          │ │
│  │ ocr-parser.js│◄─┤(共享)    │ │
│  └──────┬───────┘  └────┬─────┘ │
│         │               │       │
│    Tesseract.js (本地OCR引擎)    │
│    SheetJS/xlsx (本地Excel导出)  │
└─────────┼───────────────┼───────┘
          │  REST API     │
          ▼               ▼
┌─────────────────────────────────┐
│   后端数据库服务（推测PocketBase）│
│                                 │
│   tables/fabric_records         │
│   tables/fabric_sessions        │
└─────────────────────────────────┘
```

## 技术栈

| 层 | 技术 | 版本 |
| -- | ---- | ---- |
| 前端框架 | 原生 HTML/CSS/JS | ES6+ |
| OCR 引擎 | Tesseract.js | 5.x（CDN） |
| Excel 导出 | SheetJS/xlsx | 0.18.5（CDN） |
| 图标 | Font Awesome | 6.4.0（CDN） |
| 字体 | Noto Sans SC | Google Fonts |
| 后端 | REST API `tables/*` | 未知（推测 PocketBase） |
| 数据同步 | 短轮询（HTTP polling） | 默认15秒 |

## 数据流

```text
图片上传
  → Tesseract.js OCR
  → ocr-parser.js 解析（多块分割、字段提取）
  → 填入 tableRows 内存状态
  → renderTable() 渲染 DOM
  → saveRowToDB() POST fabric_records
  → sync.js 轮询拉取其他端的新数据
```

## 数据模型（前端推断）

### fabric_records

| 字段 | 说明 |
| ---- | ---- |
| id | 数据库自增 ID |
| session_id | 所属录入批次 |
| session_time | 批次时间 |
| row_index | 行序号 |
| img_data_url | 图片缩略图 Base64 |
| img_name | 原始文件名 |
| col_b ~ col_i | 面料字段（见产品愿景） |
| ocr_raw | OCR 原始识别文本（最多5000字符） |
| created_at_custom | 本地时间字符串 |

### fabric_sessions

| 字段 | 说明 |
| ---- | ---- |
| session_id | 批次 ID |
| session_label | 批次显示名（时间+操作人） |
| operator | 操作人姓名 |
| row_count | 本批次记录条数 |
| created_at_custom | 本地时间字符串 |

## 已知约束

- 无用户认证，所有人共享同一数据集
- 数据同步依赖轮询，非实时推送（最多15秒延迟）
- 图片以 Base64 存储在数据库，存储量受缩略图尺寸影响
- OCR 在浏览器本地运行，首次加载需下载 Tesseract 语言包（~50MB）
- 无离线支持，依赖后端 API 可达
