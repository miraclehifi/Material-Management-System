# 一分三科面料组智能录入系统 — Claude 项目配置

> SDD 项目入口。所有 AI 行为约束见 `.claude/rules/sdd/`。

---

## 项目概述

面料样品管理员使用的协作录入工具。上传/拍摄面料标签图片，OCR 自动识别并填入结构化数据库，多人实时共享同一数据集，最终导出 Excel 归档。

**技术栈**：原生 HTML5 / CSS3 / JavaScript ES6+，无框架、无构建工具  
**外部库**：Tesseract.js（OCR）、SheetJS/xlsx（Excel 导出）、Font Awesome 图标  
**后端**：REST API（`tables/` 路径，推测为 PocketBase 或类似轻量数据库服务）  
**数据表**：`fabric_records`（面料记录）、`fabric_sessions`（录入批次）

---

## 目录结构

```text
Material-Management-System/
├── index.html          # 桌面端主页面
├── mobile.html         # 移动端页面（独立 UI）
├── js/
│   ├── app.js          # 主逻辑：表格管理、OCR 流程、导出
│   ├── ocr-parser.js   # OCR 解析引擎：多块分割、成分解析、编号推理
│   ├── sync.js         # 实时同步：轮询 + 在线心跳
│   └── history.js      # 历史记录：session 管理
├── css/
│   └── style.css       # 全局样式
└── specs/              # SDD 规格目录
```

---

## 构建与开发命令

```bash
# 无构建步骤，直接用浏览器打开
start index.html        # Windows
open index.html         # macOS/Linux
```

---

## 项目模块

7 个 Feature，详见 [feature-roadmap.md](specs/product/feature-roadmap.md)  
关键模块：OCR图片识别(F-001)、面料数据表格管理(F-002)、多人实时同步(F-003)

---

## SDD 规则索引

- 核心约定 → `.claude/rules/sdd/conventions.md`
- 路由规则 → `.claude/rules/sdd/routing.md`
- 记忆规则 → `.claude/rules/sdd/memory.md`

---

## 快速命令

| 命令 | 用途 |
| ------ | ------ |
| `/sdd:define-feature` | 定义新功能需求 |
| `/sdd:progress` | 查看开发进度 |
| `/sdd:resume` | 断点续作 |
| `/sdd:adopt-dive` | 代码级深度规格提取 |
