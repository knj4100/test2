/**
 * 環境変数の検証と型安全なアクセス
 *
 * このモジュールは、環境変数の存在を検証し、
 * 型安全にアクセスできるようにします。
 */

/**
 * 必須の環境変数を取得
 *
 * @param key 環境変数のキー
 * @returns 環境変数の値
 * @throws {Error} 環境変数が設定されていない場合
 */
function getRequiredEnvVar(key: string): string {
  const value = import.meta.env[key];
  if (!value || value === '') {
    throw new Error(
      `Required environment variable ${key} is not set. ` +
      `Please check your .env file and ensure ${key} is configured.`
    );
  }
  return value;
}

/**
 * オプショナルな環境変数を取得
 *
 * @param key 環境変数のキー
 * @param defaultValue デフォルト値
 * @returns 環境変数の値、または設定されていない場合はデフォルト値
 */
function getOptionalEnvVar(key: string, defaultValue: string = ''): string {
  return import.meta.env[key] || defaultValue;
}

/**
 * 環境変数のコレクション
 *
 * アプリケーション全体で使用する環境変数を
 * 型安全にアクセスできるようにします。
 */
export const ENV = {
  /**
   * 3DモデルのURL（Supabase Storageから取得）
   */
  MODEL_URLS: {
    LIGHT4: getOptionalEnvVar('VITE_MODEL_URL_LIGHT4'),
    LIGHT5: getOptionalEnvVar('VITE_MODEL_URL_LIGHT5'),
    LIGHT6: getOptionalEnvVar('VITE_MODEL_URL_LIGHT6'),
    LIGHT7: getOptionalEnvVar('VITE_MODEL_URL_LIGHT7'),
    MESH_DIVIDE: getOptionalEnvVar('VITE_MODEL_URL_MESH_DIVIDE'),
    // 掘削機モデルのURL
    EXCAVATOR_LOWER: getOptionalEnvVar('VITE_MODEL_PC200_LOWER'),
    EXCAVATOR_BODY: getOptionalEnvVar('VITE_MODEL_PC200_BODY'),
    EXCAVATOR_BOOM: getOptionalEnvVar('VITE_MODEL_PC200_BOOM'),
    EXCAVATOR_ARM: getOptionalEnvVar('VITE_MODEL_PC200_ARM'),
    EXCAVATOR_BACKET: getOptionalEnvVar('VITE_MODEL_PC200_BACKET'),
    // ダンプトラックモデルのURL
    DUMP_TRUCK: getOptionalEnvVar('VITE_MODEL_HD_DUMP_TRUCK'),
    // ドーザーモデルのURL
    DOZER_BODY: getOptionalEnvVar('VITE_MODEL_D475_BODY'),
    DOZER_BLADE: getOptionalEnvVar('VITE_MODEL_D475_BLADE'),
    // 環境オブジェクトモデルのURL
    ENV_CANE: getOptionalEnvVar('VITE_MODEL_ENV_CANE'),
    ENV_HUMAN: getOptionalEnvVar('VITE_MODEL_ENV_HUMAN')
  }
} as const;

/**
 * 開発モードかどうかをチェック
 */
export const isDevelopment = import.meta.env.DEV;

/**
 * 本番モードかどうかをチェック
 */
export const isProduction = import.meta.env.PROD;
