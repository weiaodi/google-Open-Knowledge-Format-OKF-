/**
 * sources/base.ts — Source 接口与 ConceptRef 类型定义
 *
 * Source 是知识域的抽象，可以是：
 *   - 内存数据（JSSyntaxSource）
 *   - SQLite 数据库（扩展时实现）
 *   - 任意 REST API
 *
 * 所有 Source 实现都必须实现此接口，工具函数通过 Source 接口操作，
 * 与具体数据来源解耦。
 */

/** 一个知识概念的引用（元数据轻量描述） */
export interface ConceptRef {
  /** 路径分段，如 ["syntax", "arrow_function"] */
  id: string[];
  /** 斜杠连接的完整 id，如 "syntax/arrow_function" */
  idStr: string;
  /** OKF type 字段值，如 "JS Syntax" */
  type: string;
  /** 对应的外部资源 URL（可选，如 MDN 页面） */
  resource?: string;
  /** Source 特定的额外元数据（关键词、相关概念等） */
  hint: Record<string, unknown>;
}

/** 知识域数据源接口 */
export interface Source {
  /** 列出该数据源下所有概念 */
  listConcepts(): ConceptRef[];

  /**
   * 读取单个概念的原始结构化元数据
   * 返回的对象会被 LLM 用于撰写文档
   */
  readConcept(idStr: string): Record<string, unknown>;

  /**
   * 采样行数据（可选）
   * 返回 null 表示该 Source 不支持采样
   */
  sampleRows?(idStr: string, n?: number): Record<string, unknown>[] | null;

  /** 根据 id 分段查找 ConceptRef */
  find(id: string[]): ConceptRef | undefined;
}
