import { NanoService, NanoAction } from '@keepdb/kit/nano'
import { runInit } from '../commands/init.js'
import { runProxy } from './proxy.js'
import { runAgent } from './agent.js'

class Commands extends NanoService {
  constructor () {
    super({ name: 'cli', description: '@hnzxb/cli 子命令注册与分发' })
  }

  registerDefaults () {
    return this
      .register(new NanoAction({
        name: 'init',
        description: '交互式配置 base_url / apikey / model',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          await runInit()
          return { exitCode: 0 }
        },
      }))
      .register(new NanoAction({
        name: 'agent',
        description: 'AI 助手排查（--agent 透传或通用对话）',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: ['string', 'null'], description: '要排查的目标命令，null 为通用对话' },
            rawArgs: { type: 'array', items: { type: 'string' } },
          },
        },
        execute: async ({ target, rawArgs }) => {
          await runAgent({ target: target ?? null, rawArgs: rawArgs ?? [] })
          return { exitCode: 0 }
        },
      }))
      .register(new NanoAction({
        name: 'proxy',
        description: '原生命令透传代理（stdio inherit，退出码一致）',
        inputSchema: {
          type: 'object',
          properties: {
            target: { type: 'string' },
            args: { type: 'array', items: { type: 'string' } },
          },
          required: ['target'],
        },
        execute: ({ target, args }) => new Promise((resolve) => {
          runProxy(target, args ?? [])
          resolve({ exitCode: 'inherit' })
        }),
      }))
  }

  async dispatch (cmd, args) {
    if (!cmd || cmd === '-h' || cmd === '--help') {
      console.log(this.toHelp())
      return 0
    }
    if (cmd === 'init')
      return this.run('init', {})
    if (args.includes('--agent') || cmd === '--agent')
      return this.run('agent', { target: cmd === '--agent' ? null : cmd, rawArgs: args })
    return this.run('proxy', { target: cmd, args })
  }
}

export default Commands
