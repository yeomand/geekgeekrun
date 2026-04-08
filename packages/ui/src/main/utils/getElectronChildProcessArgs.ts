export function getElectronChildProcessArgs(args: string[]) {
  const shouldPassEntryScript = Boolean(process.defaultApp || process.env.ELECTRON_RENDERER_URL)

  if (shouldPassEntryScript && process.argv[1]) {
    return [process.argv[1], ...args]
  }

  return args
}
