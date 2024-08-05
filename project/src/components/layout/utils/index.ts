const isImage = (fileName: string) => {
  const patternBase = /^data:image\/(jpeg|png|gif);base64,(\S+)$/i
  const pattern = /\.(jpg|jpeg|png|gif|bmp)$/i
  return pattern.test(fileName) || patternBase.test(fileName)
}

export { isImage }
