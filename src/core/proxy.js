import { spawn } from 'node:child_process'

export const runProxy = (target, args) => {
  const child = spawn(target, args, { stdio: 'inherit' })
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'])
    process.on(sig, () => child.kill(sig))
  child.on('error', (err) => {
    console.error(`✖ 无法启动 ${target}: ${err.message}`)
    process.exit(127)
  })
  child.on('close', (code) => {
    if (code !== 0)
      console.error(`\n⚠ 命令执行异常（退出码 ${code ?? 'null'}），可追加 --agent 参数启动 AI 助手排查或生成正确参数`)
    process.exit(code ?? 1)
  })
}
