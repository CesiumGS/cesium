import type { PluginOption, ResolvedConfig } from 'vite'
import dayjs from 'dayjs'
import path from 'path'
import JSZip from 'jszip'
import fs from 'fs'

export function pkgZip(): PluginOption {
  let cfg: ResolvedConfig
  return {
    name: 'pkg-compress',
    apply: 'build',
    configResolved: resolvedConfig => {
      // 获取vite的最终配置
      cfg = resolvedConfig
    },
    closeBundle: () => {
      // 打包构建文件夹的绝对路径
      const outputAbsPath = path.resolve(cfg.root, cfg.build.outDir)
      // 压缩文件名称
      const now = dayjs().format('YYYY-MM-DD HH-mm-ss')
      const zipFilename = `${cfg.build.outDir} ${now}.zip`
      // 压缩文件的绝对路径
      const zipFileAbsPath = path.resolve(cfg.root, zipFilename)

      const zip = new JSZip()
      zipFile(zip, outputAbsPath)
      zip
        .generateNodeStream({
          streamFiles: true,
          compression: 'DEFLATE',
          compressionOptions: {
            level: 9
          }
        })
        .pipe(fs.createWriteStream(zipFileAbsPath))
        .on('finish', () => {
          console.log(`文件压缩完成: ${zipFilename}`)
        })
    }
  }
}

function zipFile(zip: JSZip, absPath: string) {
  const files = fs.readdirSync(absPath)
  files.forEach(file => {
    const tempPath = path.resolve(absPath, file)
    const fileStat = fs.statSync(tempPath)
    if (fileStat.isDirectory()) {
      const folder = zip.folder(file)!
      zipFile(folder, tempPath)
    } else {
      zip.file(file, fs.readFileSync(tempPath))
    }
  })
}
