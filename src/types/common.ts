/** Shared audit fields present on every persisted domain entity. */
export interface AuditFields {
  createdAt: string;
  id: string;
  updatedAt: string;
}

/** Standard service result for expected, user-safe failures. */
export type ServiceResult<TData, TCode extends string = string> =
  | { data: TData; ok: true }
  | { code: TCode; message: string; ok: false };
