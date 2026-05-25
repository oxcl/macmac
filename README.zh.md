# MacMac 🦊

Firefox 的账户容器管理扩展。

[![MIT 许可证](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![基于 WXT 构建](https://img.shields.io/badge/built%20with-WXT-0052cc)](https://wxt.dev)

## 功能

- **账户隔离** — 每个容器对应一个网站账户。同一站点上不同账户的会话、Cookie 和数据完全分开。
- **自动切换容器** — 访问网站时，MacMac 自动把你路由到对应容器，不需要手动操作。
- **站点记忆** — 每个站点上次使用的账户会在会话间保留。
- **弹窗界面** — 在一个地方管理当前站点的所有账户。
- **不切换默认账户也能打开** — 在新标签页打开另一个账户，不影响默认映射。适合快速查看第二个账户。
- **弹窗内完成所有操作** — 创建、重命名、删除账户，在新标签页中打开。

## 工作原理

在任意网站上打开弹窗，点击 **创建新账户**。MacMac 会创建一个未命名的容器（自动命名为"账户 1"、"账户 2"等），在该容器中打开网站，你登录即可。之后可以在弹窗中重命名。

每个容器的内部命名格式为 `账户名 (主机名)` — 例如 `账户 1 (facebook.com)` — 这样就把容器绑定到了对应站点。

## 实现细节

三个存储键处理所有逻辑：
- `accounts` — 账户元数据（id、名称、主机名）
- `hostnameAccounts` — 主机名到账户的映射
- `lastSelected` — 每个主机名的首选账户

当你访问某个站点时，后台脚本检查 `lastSelected`。如果已映射账户，标签页会切换到该容器。如果没有，则使用默认身份（无容器）。

## 使用方法

**创建账户：** 点击工具栏图标，点击 **+ 创建新账户**。一个新的未命名容器会被创建并激活。登录你的账户，之后可以在弹窗中重命名。

**切换账户：** 在弹窗中点击任意账户卡片。你的选择会为下次访问保存。

**不切换默认账户打开：** 点击账户卡片上的新标签页图标，在该容器中打开站点，不影响默认映射。

## 开发

```bash
bun install           # 安装依赖 + WXT postinstall
bun run dev           # 开发服务器，支持热重载
bun run compile       # 类型检查
bun run lint          # 代码检查
bun run build:firefox # 生产构建
```

## 贡献

欢迎提交 PR 和 issue。功能请求或 bug 请开 discussion。

## 支持

如果 MacMac 对你有用，可以在 [GitHub](https://github.com/oxcl/macmac) 上给仓库点个 star，或者[捐款](https://oxcl.github.io/macmac/#donate)。
