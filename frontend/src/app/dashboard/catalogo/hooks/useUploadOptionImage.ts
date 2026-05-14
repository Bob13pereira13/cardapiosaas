'use client'

import { API_URL } from '@/lib/config'
import { getToken } from '@/lib/auth'

const STATUS_MESSAGES: Record<number, string> = {
  413: 'Imagem maior que 5 MB. Reduza o tamanho antes de enviar.',
  415: 'Formato não suportado. Use JPG, PNG, WEBP ou HEIC.',
  401: 'Sessão expirada. Faça login novamente.',
}

export interface UploadResult {
  imageUrl: string
}

export function useUploadOptionImage() {
  return async (
    optionId: number,
    file: File,
    onProgress?: (pct: number) => void,
    signal?: AbortSignal,
  ): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText) as { url: string }
            resolve({ imageUrl: json.url })
          } catch {
            reject(new Error('Resposta inválida do servidor.'))
          }
          return
        }
        const userMsg = STATUS_MESSAGES[xhr.status]
        if (userMsg) {
          reject(new Error(userMsg))
          return
        }
        let msg = `Erro ${xhr.status} ao enviar imagem.`
        try {
          const err = JSON.parse(xhr.responseText) as { message?: string }
          if (err.message) msg = err.message
        } catch {
          // fallback to generic message
        }
        reject(new Error(msg))
      }

      xhr.onerror = () => reject(new Error('Erro de rede. Verifique sua conexão.'))
      xhr.onabort = () => reject(new Error('Upload cancelado.'))

      if (signal) {
        signal.addEventListener('abort', () => xhr.abort())
      }

      xhr.open('POST', `${API_URL}/options/${optionId}/upload-image`)
      xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`)
      xhr.send(formData)
    })
  }
}
