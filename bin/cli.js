#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'
import pc from 'picocolors'
import Commands from '../src/core/Commands.js'

const commands = new Commands().registerDefaults()

const usage = () => {
  const lines = [
    `${pc.bold('@hnzxb/cli 智能代理')} ${pc.dim('(原生命令透传 + --agent AI 助手排查)')}`,
    '',
    `${pc.cyan('cli init')}                  交互式配置 base_url / apikey / model`,
    `${pc.cyan('cli <命令> [args...]')}      原生命令透传（退出码一致）`,
    `${pc.cyan('cli <命令> [args...] -a')}   AI 助手排查该命令`,
    `${pc.cyan('cli -a')}                    通用 macOS 终端专家对话`,
  ]
  console.log(lines.join('\n'))
}

const main = defineCommand({
  meta: {
    name: 'cli',
    version: '0.1.0',
    description: 'CLI 智能代理：原生命令透传 + --agent AI 助手排查（OpenAI 兼容接口）',
  },
  args: {
    agent: {
      type: 'boolean',
      alias: 'a',
      description: 'AI 助手排查目标命令 / 通用终端专家对话',
    },
  },
  subCommands: {
    init: defineCommand({
      meta: { name: 'init', description: '交互式配置 base_url / apikey / model' },
      run: async () => {
        await commands.run('init', {})
      },
    }),
  },
  run: async () => {
    usage()
  },
})

const [, , cmd, ...args] = process.argv

if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'init') {
  await runMain(main, { rawArgs: [cmd, ...args].filter(Boolean) })
} else if (args.includes('--agent') || args.includes('-a') || cmd === '--agent' || cmd === '-a') {
  const cleanArgs = (cmd === '--agent' || cmd === '-a' ? args : [cmd, ...args])
    .filter((arg) => arg !== '--agent' && arg !== '-a')
  const targetCmd = cleanArgs[0] ?? null
  console.log(pc.magenta(`🤖 AI 助手 ${targetCmd ? `排查 ${targetCmd}` : '通用对话'}`))
  await commands.run('agent', { target: targetCmd, rawArgs: targetCmd ? cleanArgs.slice(1) : cleanArgs })
} else {
  console.log(pc.dim(`▶ ${cmd} ${args.join(' ')}`.trim()))
  await commands.run('proxy', { target: cmd, args })
}
