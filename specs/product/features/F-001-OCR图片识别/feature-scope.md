# F-001 OCR图片识别 — Feature Scope

**创建方式**: adopt-scan 自动提取  
**最后更新**: 2026-06-02

---

## 目标

让管理员无需手动抄写，通过拍照/上传面料标签图片，自动识别并填入数据库字段，大幅减少录入时间和错误率。

## 边界

**包含**：
- 图片上传（点击 / 拖拽，支持多选）
- 图片队列管理（显示状态：等待 / 识别中 / 完成 / 失败）
- Tesseract.js OCR 识别（支持中文+英文）
- OCR 文本多块分割（单图可识别出多条记录）
- 字段解析：面料描述(B)、编号(C)、成分(D)、规格(E)、克重(F)、门幅(G/H)、工厂批号(I)
- 成分缩写自动展开（P→Polyester、C→Cotton 等）
- 编号自动推理（HLWG/HLFG 连续编号补全）
- 缩略图生成（图片压缩后存入数据库）
- OCR 识别日志（可展开查看每步详情）
- 识别进度展示（百分比进度条）

**不包含**：
- 图片预处理/增强（无二值化、去噪等）
- 云端 OCR（仅本地 Tesseract.js）
- 条形码/二维码扫描
- 批量导入 Excel

## 核心能力

1. 支持拖拽或点击上传多张图片，进入识别队列
2. 点击「全部识别」批量处理队列中所有待识别图片
3. 单图多条：一张图片可解析出多行面料记录
4. OCR 完成后自动将识别结果填入桌面表格
5. 识别失败时标记错误状态，不影响其余图片

## 涉及端

| 端 | 覆盖能力 |
| -- | -------- |
| 桌面端 | 完整功能（图片队列、批量识别、识别设置、日志） |
| 手机端 | 单张识别（由 F-006 独立实现，共享 ocr-parser.js） |

## 对外 Facade

无（纯前端模块，不暴露对外接口）

## 共享 Domain

- **ocr-parser.js**：被桌面端和手机端共用，包含 `parseOCRMulti`、`parseBlock`、`splitIntoBlocks`、`inferSequentialCodes`、`parseComposition`、`calcInchDisplay` 等核心函数

## 关键实现位置

| 功能 | 文件 | 函数 |
| ---- | ---- | ---- |
| 批量识别入口 | js/app.js | `ocrAll()` |
| 图片队列管理 | js/app.js | `addFiles()`, `renderImgQueue()` |
| 多块分割 | js/ocr-parser.js | `splitIntoBlocks()` |
| 单块解析 | js/ocr-parser.js | `parseBlock()` |
| 编号推理 | js/ocr-parser.js | `inferSequentialCodes()` |
| 成分展开 | js/ocr-parser.js | `parseComposition()` |
