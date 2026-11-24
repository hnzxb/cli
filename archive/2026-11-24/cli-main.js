import { defineCommand, runMain } from 'citty'
import { consola } from 'consola'
import { runInit } from '../commands/init.js'
import { runProxy } from './proxy.js'
import { runAgent } from './agent.js'

const main = defineCommand({
  meta: {
    name: 'hnzxb',
    version: '0.1.0',
    description: 'CLI 智能代理：原生命令透传 + --agent AI 助手排查',
  },
  args: {
    agent: {
      type: 'boolean',
      description: '启动 AI 助手排查',
      alias: 'a',
    },
  },
  subCommands: {
    init: defineCommand({
      meta: { name: 'init', description: '交互式配置 base_url / apikey / model' },
      run: async () => {
        consola.start('正在初始化配置...')
        await runInit()
        consola.success('配置完成')
      },
    }),
  },
  run: async ({ args, rawArgs }) => {
    // 兼容原三分支路由：
    // 1. 无参数 -> 显示帮助
    // 2. 带 --agent 或仅执行 agent -> 进 runAgent
    // 3. 其它命令 -> 透传代理
    const target = rawArgs[0]
    const hasAgent = args.agent || rawArgs.includes('--agent')

    if (!target && !hasAgent) {
      consola.box({
        title: '@hnzxb/cli 智能代理',
        message: '用法:\n  cli init                  # 配置向导\n  cli <命令> [args...]      # 命令透传\n  cli <命令> --agent        # AI 智能排查',
        style: { borderColor: 'cyan' },
      })
      return
    }

    if (hasAgent) {
      const cleanArgs = rawArgs.filter((arg) => arg !== '--agent' && arg !== '-a')
      const targetCmd = cleanArgs[0] && cleanArgs[0] !== 'init' ? cleanArgs[0] : null
      consola.info(`🤖 正在启动 AI 助手排查: ${targetCmd || '通用对话'}`)
      await runAgent({ target: targetCmd, rawArgs: cleanArgs.slice(targetCmd ? 1 : 0) })
      return
    }

    if (target === 'init') {
      consola.start('正在初始化配置...')
      await runInit()
      consola.success('配置完成')
      return
    }

    consola.info(`🔄 正在透传执行: ${target} ${rawArgs.slice(1).join(' ')}`)
    runProxy(target, rawArgs.slice(1))
  },
})

runMain(main)
