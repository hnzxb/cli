import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const SERVICE = 'com.hnzxb.cli'
const isMac = process.platform === 'darwin'

export const configDir = () =>
  process.env.HNZXB_CLI_CONFIG_DIR ?? path.join(os.homedir(), '.config', 'hnzxb-cli')
const configPath = () => path.join(configDir(), 'config.json')

export const readConfig = () => {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')) } catch { return {} }
}

export const writeConfig = (cfg) => {
  fs.mkdirSync(configDir(), { recursive: true })
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2) + '\n')
}

export const saveKey = async (apikey) => {
  if (isMac) {
    try {
      execFileSync('security', ['add-generic-password', '-U', '-s', SERVICE, '-a', 'apikey', '-w', apikey])
      return 'keychain'
    } catch { /* Keychain 不可用，降级 */ }
  }
  const cfg = readConfig()
  writeConfig({ ...cfg, apikey })
  fs.chmodSync(configPath(), 0o600)
  return 'file'
}

export const loadKey = () => {
  if (isMac) {
    try {
      return execFileSync('security', ['find-generic-password', '-s', SERVICE, '-a', 'apikey', '-w'], { encoding: 'utf8' }).trim()
    } catch { /* 未存或不可用，看文件 */ }
  }
  return readConfig().apikey ?? ''
}
