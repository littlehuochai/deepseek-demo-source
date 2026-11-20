import { spawn } from 'node:child_process'
import net from 'node:net'

const DIR = '/root/workspace/chat-demo-mobile/dist'
const PORT = 8090
const URL = `http://127.0.0.1:${PORT}/`

const isUp = () =>
  new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port: PORT })
    const done = (value) => {
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(600)
    socket.on('connect', () => done(true))
    socket.on('error', () => done(false))
    socket.on('timeout', () => done(false))
  })

const start = async () => {
  const child = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: DIR,
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 200))
    if (await isUp()) return true
  }
  return false
}

export const name = 'local-demo-server'

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    ctx.dshGo.on('start-demo', async () => {
      if (await isUp()) {
        return { copy: URL, toast: '本机版已在运行，地址已复制' }
      }
      const ok = await start()
      return ok
        ? { copy: URL, toast: '本机版已启动，地址已复制' }
        : { toast: '启动失败，检查构建目录是否存在' }
    })
  })
}
