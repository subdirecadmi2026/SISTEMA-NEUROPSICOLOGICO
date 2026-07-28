import JSZip from 'jszip'
import { downloadBlob } from './exportPdf'

const ROOT_HINT_KEY = 'hgp-archive-root-hint-v1'

type DirHandle = FileSystemDirectoryHandle

let cachedRoot: DirHandle | null = null

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export function getArchiveRootHint(): string | null {
  try {
    return localStorage.getItem(ROOT_HINT_KEY)
  } catch {
    return null
  }
}

function setArchiveRootHint(name: string) {
  try {
    localStorage.setItem(ROOT_HINT_KEY, name)
  } catch {
    /* ignore */
  }
}

/** Pide al usuario la carpeta raíz del archivo (una vez por sesión). */
export async function pickArchiveRoot(): Promise<DirHandle> {
  const handle = await window.showDirectoryPicker({
    id: 'hgp-horarios-archivo',
    mode: 'readwrite',
    startIn: 'documents',
  })
  cachedRoot = handle
  setArchiveRootHint(handle.name)
  return handle
}

export async function getOrPickArchiveRoot(): Promise<DirHandle> {
  if (cachedRoot) return cachedRoot
  return pickArchiveRoot()
}

export function clearArchiveRootCache() {
  cachedRoot = null
}

/**
 * Guarda el PDF en: {raíz}/{especialidad}/{archivo.pdf}
 * Crea la carpeta de especialidad si no existe.
 */
export async function savePdfInSpecialtyFolder(
  specialtyFolder: string,
  fileName: string,
  blob: Blob,
): Promise<{ mode: 'folder'; path: string } | { mode: 'download'; path: string }> {
  if (supportsDirectoryPicker()) {
    try {
      const root = await getOrPickArchiveRoot()
      const folder = await root.getDirectoryHandle(specialtyFolder, {
        create: true,
      })
      const fileHandle = await folder.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
      const path = `${root.name}/${specialtyFolder}/${fileName}`
      return { mode: 'folder', path }
    } catch (e) {
      // Usuario canceló o API falló → fallback descarga / zip
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw e
      }
    }
  }

  // Fallback: ZIP con carpeta de especialidad (simula estructura)
  const zip = new JSZip()
  zip.folder(specialtyFolder)?.file(fileName, blob)
  const zipped = await zip.generateAsync({ type: 'blob' })
  const zipName = `${specialtyFolder}.zip`
  downloadBlob(zipped, zipName)
  return {
    mode: 'download',
    path: `${zipName} → ${specialtyFolder}/${fileName}`,
  }
}

/** Re-descarga PDF directo (sin carpeta), útil desde Archivo. */
export function downloadPdfDirect(blob: Blob, fileName: string) {
  downloadBlob(blob, fileName)
}
