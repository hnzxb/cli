import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { stripAgent } from '../src/core/agent.js'
import { writeConfig, readConfig, saveKey, loadKey } from '../src/utils/keychain.js'

const bin = path.join(import.meta.dirname, '../bin/cli.js')

test('stripAgent 剥离 --agent 且保留其余参数', () => {
  assert.deepEqual(stripAgent(['-O', 'out.html', '--agent', 'https://example.com']), ['-O', 'out.html', 'https://example.com'])
  assert.deepEqual(stripAgent(['--agent']), [])
})

test('透传代理退出码一致（exit 3 → 3；成功 → 0）', () => {
  const fail = spawnSync('node', [bin, 'node', '-e', 'process.exit(3)'], { encoding: 'utf8' })
  assert.equal(fail.status, 3)
  assert.ok(fail.stderr.includes('--agent'), '失败时应提示 --agent')
  const ok = spawnSync('node', [bin, 'echo', 'hello'], { encoding: 'utf8' })
  assert.equal(ok.status, 0)
  assert.ok(ok.stdout.includes('hello'), 'stdout 应透传')
})

test('透传代理找不到命令时 exit 127', () => {
  const r = spawnSync('node', [bin, 'definitely-not-exist-xyz'], { encoding: 'utf8' })
  assert.equal(r.status, 127)
})

test('配置读写走 HNZXB_CLI_CONFIG_DIR（不污染真实 ~/.config）', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hnzxb-cli-'))
  process.env.HNZXB_CLI_CONFIG_DIR = dir
  writeConfig({ base_url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' })
  assert.equal(readConfig().model, 'deepseek-chat')
  assert.equal(readConfig().apikey, undefined, 'config.json 只存非敏感元数据')
  if (process.platform !== 'darwin') {
    assert.equal(saveKey('sk-test'), 'file')
    assert.equal(loadKey(), 'sk-test')
    assert.equal(fs.statSync(path.join(dir, 'config.json')).mode & 0o777, 0o600, '降级文件须 0600')
  }
  delete process.env.HNZXB_CLI_CONFIG_DIR
})

test('--agent 模式未配置时 exit 1 且提示 cli init', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hnzxb-cli-'))
  const r = spawnSync('node', [bin, '--agent'], { encoding: 'utf8', env: { ...process.env, HNZXB_CLI_CONFIG_DIR: dir } })
  assert.equal(r.status, 1)
  assert.ok(r.stderr.includes('cli init'))
})
