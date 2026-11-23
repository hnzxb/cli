import readline from 'node:readline/promises'
import { spawn } from 'node:child_process'
import os from 'node:os'
import { readConfig, loadKey } from '../utils/keychain.js'

export const stripAgent = (args) => args.filter((a) => a !== '--agent')

const envFacts = async (target) => {
  if (!target) return '（纯对话模式：通用 macOS 终端专家）'
  const { spawnSync } = await import('node:child_process')
  const which = spawnSync('which', [target], { encoding: 'utf8' })
  const ver = spawnSync(target, ['--version'], { encoding: 'utf8', timeout: 5000 })
  const help = spawnSync(target, ['--help'], { encoding: 'utf8', timeout: 5000 })
  const head = (s, n = 12) => (s.stdout || s.stderr || '').split('\n').slice(0, n).join('\n').slice(0, 1500)
  return [
    `目标工具: ${target}`,
    `which: ${which.stdout?.trim() || '未找到（可能未安装或不在 PATH）'}`,
    `--version: ${head(ver, 2) || '无输出'}`,
    `--help 摘要:\n${head(help)}`,
  ].join('\n')
}

const systemPrompt = async (target, rawArgs) => `你是 macOS 终端专家助手，精通 Shell、Homebrew 工具链与系统排查。

## 本机环境
OS: ${os.version()} (${os.arch()})
${await envFacts(target)}
${target ? `用户原始参数: ${rawArgs.join(' ')}` : ''}

## 输出协议（严格遵守）
- 回答简洁，直接给可执行结论
- 建议执行命令时，必须输出独立的 \`\`\`sh 代码块，一块一条命令——我会拦截并向用户请求确认后执行，结果会回传给你
- 不要输出多行脚本或需要交互的命令；一次性命令优先
- 与问题无关的命令不要放进代码块`

const chat = async ({ base_url, apikey, model }, messages, onDelta) => {
  const res = await fetch(new URL('chat/completions', base_url.endsWith('/') ? base_url : base_url + '/'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apikey}` },
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.3 }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
      const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content ?? ''
      if (delta) { full += delta; onDelta(delta) }
    }
  }
  return full
}

const extractCommands = (text) =>
  [...text.matchAll(/```sh\n([\s\S]*?)```/g)].map((m) => m[1].trim()).filter(Boolean)

const confirmAndRun = async (rl, cmd) => {
  console.log(`\n\x1b[36m▶ 建议命令:\x1b[0m \x1b[33m${cmd}\x1b[0m`)
  const ans = (await rl.question('[Y] 执行并回传结果 / [n] 仅复制不执行 / [e] 编辑后执行: ')).trim().toLowerCase()
  if (ans === 'n') {
    const { execFileSync } = await import('node:child_process')
    try { execFileSync('pbcopy', [cmd]) ; return '用户选择仅复制（已复制到剪贴板），未执行。' } catch { return '用户选择不执行。' }
  }
  const final = ans === 'e' ? (await rl.question('编辑命令: ')).trim() || cmd : cmd
  return await new Promise((resolve) => {
    const child = spawn('sh', ['-c', final], { encoding: 'utf8' })
    let out = ''
    child.stdout.on('data', (d) => { out += d; process.stdout.write(d) })
    child.stderr.on('data', (d) => { out += d; process.stderr.write(d) })
    child.on('close', (code) => resolve(`命令「${final}」退出码 ${code}\n输出:\n${out.slice(0, 4000)}`))
  })
}

export const runAgent = async ({ target, rawArgs }) => {
  const cfg = readConfig()
  const apikey = loadKey()
  if (!cfg.base_url || !apikey) {
    console.error('✖ 未配置，先运行: cli init')
    process.exit(1)
  }
  const args = stripAgent(rawArgs)
  const messages = [{ role: 'system', content: await systemPrompt(target, args) }]
  if (target && args.length) messages.push({ role: 'user', content: `我想执行: ${target} ${args.join(' ')}，帮我检查参数或排查问题` })

  console.log(`🤖 ${target ? `针对 ${target} 的` : '通用'}AI 助手（${cfg.model}）— /exit 退出 /clear 清空 /config 查看配置`)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  for (;;) {
    const input = (await rl.question('\x1b[32m你>\x1b[0m ')).trim()
    if (!input) continue
    if (input === '/exit') break
    if (input === '/clear') { messages.length = 1; console.log('（已清空对话）'); continue }
    if (input === '/config') { console.log({ base_url: cfg.base_url, model: cfg.model, apikey: `${apikey.slice(0, 6)}...` }); continue }
    messages.push({ role: 'user', content: input })
    try {
      process.stdout.write('\x1b[36mAI>\x1b[0m ')
      const reply = await chat({ ...cfg, apikey }, messages, (d) => process.stdout.write(d))
      messages.push({ role: 'assistant', content: reply })
      process.stdout.write('\n')
      for (const cmd of extractCommands(reply)) {
        const result = await confirmAndRun(rl, cmd)
        messages.push({ role: 'user', content: `[命令执行结果] ${result}` })
        const follow = await chat({ ...cfg, apikey }, messages, (d) => process.stdout.write(d))
        messages.push({ role: 'assistant', content: follow })
        process.stdout.write('\n')
      }
    } catch (err) {
      console.error(`\n✖ ${err.message}`)
      messages.pop()
    }
  }
  rl.close()
}
