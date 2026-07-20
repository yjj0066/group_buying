export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to read file"))
        return
      }

      resolve(reader.result)
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsDataURL(file)
  })

export const assertDocumentUploadSize = (file: File, maxBytes = 8 * 1024 * 1024) => {
  if (file.size > maxBytes) {
    throw new Error("Document image must be 8MB or smaller")
  }
}
