# 共享 Domain 索引

**最后更新**: 2026-06-02

---

## 共享模块

### ocr-parser.js — OCR 解析引擎

**被哪些 Feature 使用**: F-001（桌面端批量识别）、F-006（手机端单张识别）

**暴露的核心函数**:

| 函数 | 用途 |
| ---- | ---- |
| `parseOCRMulti(rawText, options)` | 全图解析，返回多条记录数组（F-001 使用） |
| `parseOCRFull(rawText, options)` | 单块解析兼容接口（F-006 使用） |
| `splitIntoBlocks(rawText)` | 将 OCR 文本按标签块分割 |
| `parseBlock(lines, options)` | 解析单个块为一行数据 |
| `inferSequentialCodes(rows)` | 对全表做编号连续性推理 |
| `parseComposition(raw)` | 成分缩写展开（P→Polyester 等） |
| `calcInchDisplay(widthM)` | 米 → 英寸格式转换 |
| `resolveHLCode(num5)` | 5位数字 → HLWG/HLFG 编号 |
| `getCompMap()` | 获取成分缩写对照表 |

**注意**: 手机端通过 `<script src="js/ocr-parser.js">` 直接加载，共享同一份代码。

---

### fabric_records 数据表 — 面料记录

**被哪些 Feature 使用**: F-002（主表格读写）、F-003（同步读取）、F-004（历史查询）、F-005（导出读取）、F-006（手机端写入）

**字段**: session_id, row_index, img_data_url, img_name, col_b~col_i, ocr_raw, created_at_custom

---

### fabric_sessions 数据表 — 录入批次

**被哪些 Feature 使用**: F-004（历史面板列表）、F-001（OCR完成后写入元信息）

**字段**: session_id, session_label, operator, row_count, created_at_custom

---

### localStorage 配置命名空间

**被哪些 Feature 使用**: F-007（系统设置读写）、F-003（在线心跳）、F-001（OCR语言/工厂关键词）

**键名约定**:

| 键 | 用途 |
| -- | ---- |
| `fabric_cfg_*` | 系统配置（sheet_name、sync_interval 等） |
| `fabric_operator` | 桌面端操作人姓名记忆 |
| `mob_operator` | 手机端操作人姓名记忆 |
| `fabric_online` | 在线心跳（JSON对象） |
| `fabric_comp_map` | 自定义成分缩写表 |
