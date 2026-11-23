#!/usr/bin/env node
import { runInit } from '../src/commands/init.js'
import { runProxy } from '../src/core/proxy.js'
import { runAgent } from '../src/core/agent.js'

const usage = () => {
  console.log(`@hnzxb/cli — CLI 智能代理

用法:
  cli init                        # 交互式配置 base_url / apikey / model
  cli <命令> [args...]            # 原生命令透传（退出码一致）
  cli <命令> [args...] --agent    # AI 助手排查该命令
  cli --agent                     # 通用 macOS 终端专家对话`)
}

const [, , cmd, ...args] = process.argv

if (!cmd || cmd === '-h' || cmd === '--help') {
  usage()
} else if (cmd === 'init') {
  await runInit()
} else if (args.includes('--agent') || cmd === '--agent') {
  await runAgent({ target: cmd === '--agent' ? null : cmd, rawArgs: args })
} else {
  runProxy(cmd, args)
}
