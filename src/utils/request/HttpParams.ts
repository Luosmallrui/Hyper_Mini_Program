/*
 * @description Http请求参数类型定义
 */
export interface HttpParams {
  baseURL?: string;
  isDebug?: boolean;
  headers?: Record<string, string>;
}