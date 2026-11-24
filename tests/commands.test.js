import test from 'node:test'
import assert from 'node:assert/strict'
import Commands from '../src/core/Commands.js'

test('Commands 注册默认命令并可按名执行', () => {
  const commands = new Commands().registerDefaults()
  assert.deepEqual(Object.keys(commands.actions).sort(), ['agent', 'init', 'proxy'])
  assert.ok(commands.get('proxy') instanceof Object)
})

test('dispatch --help 输出 toHelp 帮助文本', async () => {
  const commands = new Commands().registerDefaults()
  const lines = []
  const originalLog = console.log
  console.log = (...parts) => lines.push(parts.join(' '))
  try {
    await commands.dispatch('--help', [])
  } finally {
    console.log = originalLog
  }
  const text = lines.join('\n')
  assert.match(text, /cli - @hnzxb\/cli 子命令注册与分发/)
  assert.match(text, /init/)
  assert.match(text, /proxy/)
})

test('toDefinitions 导出工具定义（接入 --agent/AI 工具链）', () => {
  const commands = new Commands().registerDefaults()
  const defs = commands.toDefinitions
  assert.equal(defs.length, 3)
  assert.ok(defs.every((def) => def.name && def.inputSchema))
})
