/** Values previously submitted for a form/confirm block; `undefined` = unanswered, `null` = dismissed. */
export type BlockAnswer = Record<string, unknown> | null | undefined;

/** Submits an answer; `undefined` while another turn is streaming. */
export type RespondToBlock = ((formId: string, values: Record<string, unknown> | null) => void) | undefined;
