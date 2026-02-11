/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MODEL_URL_LIGHT4: string
  readonly VITE_MODEL_URL_LIGHT5: string
  readonly VITE_MODEL_URL_LIGHT6: string
  readonly VITE_MODEL_URL_LIGHT7: string
  readonly VITE_MODEL_URL_MESH_DIVIDE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
