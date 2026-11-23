# AGENTS.md — @hnzxb/cli

## 初心（2026-11-23 立项书面基准，开工前定稿）

CLI 智能代理工具：`npx github:hnzxb/cli <子命令或目标命令> [...args] [--agent]`。三分支路由：

- **A `init`**：交互向导配置 base_url / apikey / model；apikey 走 macOS Keychain（service `com.hnzxb.cli`），非 mac 降级 0600 文件；配置后连通性探测
- **B 透传代理（默认）**：spawn 目标命令，stdio inherit、信号转发、退出码一致；非 0 退出提示可加 `--agent` 排查
- **C `--agent`**：OpenAI 兼容流式对话；带目标命令时注入环境探测（which/version/help 摘要，控 token）；AI 建议命令须用户 Y/n/e 确认后执行并回传结果，形成诊断闭环

**边界（stop conditions）**：纯 ES6+ JS（严禁 TS/Python）；依赖极简（仅原生模块，devDeps 仅 eslint）；不做多 Provider 适配、不做会话持久化、不做 Windows 专项。验收 = `just verify` 绿 + 真实终端输出。

## 架构约定

- 路由唯一入口 `bin/cli.js`，按 init → --agent → 透传优先级分发
- `--agent` 剥离后再透传，目标命令永远看不到它
- apikey 永不落明文日志；Keychain 不可用时才降级 0600
- 测试可注入 `HNZXB_CLI_CONFIG_DIR` 覆盖配置目录
- 删除文件归档 `archive/{yyyy-mm-dd}/`，禁止直接 rm

## 命令行协议

`just test` / `just lint` / `just verify`；用户侧 `npx github:hnzxb/cli` / `bunx github:hnzxb/cli`。
