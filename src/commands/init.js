import readline from 'node:readline/promises'
import { saveKey, writeConfig, readConfig, loadKey } from '../utils/keychain.js'

const ask = (rl, q, fallback) => {
  const tail = fallback ? `（回车默认 ${fallback}）` : ''
  return rl.question(`${q}${tail}: `).then((a) => a.trim() || fallback || '')
}

const probe = async (baseUrl, apikey) => {
  try {
    const res = await fetch(new URL('models', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'), {
      headers: { authorization: `Bearer ${apikey}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) return `✅ 连通正常（GET /models → ${res.status}）`
    return `⚠ 探测返回 ${res.status}：${(await res.text()).slice(0, 120)}`
  } catch (err) {
    return `⚠ 探测失败：${err.message}（配置已保存，可稍后重试）`
  }
}

export const runInit = async () => {
  const existing = readConfig()
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const base_url = await ask(rl, 'base_url（OpenAI 兼容）', existing.base_url ?? 'https://api.openai.com/v1')
  const model = await ask(rl, 'model', existing.model ?? 'deepseek-chat')
  const apikey = await ask(rl, 'apikey（输入以掩码显示，本行不会回显到日志）', existing.apikey)
  rl.close()

  const where = await saveKey(apikey)
  writeConfig({ base_url, model })
  console.log(`✅ 配置已保存（apikey 存于 ${where === 'keychain' ? 'macOS Keychain' : '0600 本地文件'}）`)
  if (!loadKey()) return console.error('✖ apikey 未落盘，请重跑 cli init')
  console.log(await probe(base_url, apikey))
}
