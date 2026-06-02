---
slug: tech-stack-refactor-react-ts
type: Feature
priority: P0
status: ready
created: 2026-06-02
---

# 技术栈重构：迁移至 React + TypeScript + Vite

## 目标

将现有原生 HTML/CSS/JS 项目完整迁移至 React + TypeScript + React Router + Tailwind CSS 4 技术栈，使用 Vite 构建，配置 ESLint + Prettier 代码规范工具。

## 业务价值

- 组件化架构，便于团队协作和功能迭代
- TypeScript 类型安全，减少运行时错误
- 现代化工具链，提升开发体验

## 技术选型（已确定）

| 工具 | 版本/方案 |
|------|----------|
| 框架 | React 19 |
| 语言 | TypeScript 5.x（严格模式） |
| 路由 | React Router v7 |
| 样式 | Tailwind CSS v4 |
| 构建 | Vite 6 |
| 代码规范 | ESLint v9 + Prettier |

## 验收条件

- [ ] `pnpm dev` 启动开发服务器，功能与原版一致
- [ ] `pnpm build` 产物可部署
- [ ] TypeScript 无 `any`，无类型错误（`strict: true`）
- [ ] ESLint 零告警
- [ ] 桌面端（index）和移动端（mobile）页面均已迁移
- [ ] 所有原有功能（OCR、表格管理、同步、历史记录）可用

## 影响范围

全部源文件（index.html、mobile.html、js/、css/）将被替换。

## 排期

P0，当前 Sprint 立即执行。
