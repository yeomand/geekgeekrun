import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import dayjs from 'dayjs'
import iconv from 'iconv-lite'

function repairMojibake(value: unknown): unknown {
  if (typeof value === 'string') {
    const repaired = iconv.decode(iconv.encode(value, 'gbk'), 'utf8')
    return repaired.includes('\uFFFD') ? value : repaired
  }

  return value
}

export default function overrideConsole() {
  const originConsoleLog = console.log.bind(console)
  const originConsoleWarn = console.warn.bind(console)
  const originConsoleError = console.error.bind(console)

  const runtimeFolderPath = path.join(os.homedir(), '.geekgeekrun')
  const logDirPath = path.join(runtimeFolderPath, 'log')
  if (!fs.existsSync(logDirPath)) {
    fs.mkdirSync(logDirPath, { recursive: true })
  }

  const logFileStream = fs.createWriteStream(path.join(logDirPath, `log.log`), {
    flags: 'a' // 追加模式
  })
  const warnFileStream = fs.createWriteStream(path.join(logDirPath, `warn.log`), {
    flags: 'a' // 追加模式
  })
  const errorFileStream = fs.createWriteStream(path.join(logDirPath, `error.log`), {
    flags: 'a' // 追加模式
  })

  console.log = (...args: any[]) => {
    const lineHead = `${dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')} [log][PID=${process.pid}]`
    const normalizedArgs = args.map(repairMojibake)
    originConsoleLog(lineHead, ...normalizedArgs)
    logFileStream.write(
      [
        lineHead,
        normalizedArgs.map((arg) => {
          try {
            return JSON.stringify(arg)
          } catch (err) {
            return `[[${JSON.stringify(err?.toString())}]]`
          }
        })
      ].join(' ') + '\n'
    )
  }
  console.warn = (...args: any[]) => {
    const lineHead = `${dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')} [warn][PID=${process.pid}]`
    const normalizedArgs = args.map(repairMojibake)
    originConsoleWarn(lineHead, ...normalizedArgs)
    warnFileStream.write(
      [
        lineHead,
        normalizedArgs.map((arg) => {
          try {
            return JSON.stringify(arg)
          } catch (err) {
            return `[[${JSON.stringify(err?.toString())}]]`
          }
        })
      ].join(' ') + '\n'
    )
  }
  console.error = (...args: any[]) => {
    const lineHead = `${dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')} [error][PID=${process.pid}]`
    const normalizedArgs = args.map(repairMojibake)
    originConsoleError(lineHead, ...normalizedArgs)
    errorFileStream.write(
      [
        lineHead,
        normalizedArgs.map((arg) => {
          try {
            return JSON.stringify(arg)
          } catch (err) {
            return `[[${JSON.stringify(err?.toString())}]]`
          }
        })
      ].join(' ') + '\n'
    )
  }
}
