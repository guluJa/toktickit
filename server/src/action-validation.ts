export interface ActionFields {
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
}

export class ActionValidationError extends Error {
  constructor(readonly fields: Record<string, string>) {
    super("Action data is invalid.");
  }
}

const editableFields = new Set([
  "description", "result", "followUpRequired", "followUpNote", "attachmentNotes",
]);

export function parseActionFields(
  body: unknown,
  current?: ActionFields,
): ActionFields & { version?: number } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ActionValidationError({ body: "An object is required." });
  }
  const input = body as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const allowed = new Set([...editableFields, ...(current ? ["version"] : [])]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) fields[key] = "This field cannot be supplied.";
  }
  if (current && !Object.keys(input).some((key) => editableFields.has(key))) {
    fields.body = "At least one editable field is required.";
  }
  const requiredText = (key: "description" | "result"): string => {
    const value = input[key] === undefined ? current?.[key] : input[key];
    if (typeof value !== "string" || !value.trim()) {
      fields[key] = "A non-empty string is required.";
      return "";
    }
    return value.trim();
  };
  const description = requiredText("description");
  const result = requiredText("result");
  const followUpRequired = input.followUpRequired === undefined
    ? current?.followUpRequired : input.followUpRequired;
  if (typeof followUpRequired !== "boolean") {
    fields.followUpRequired = "A boolean is required.";
  }
  const rawFollowUpNote = input.followUpNote === undefined
    ? current?.followUpNote : input.followUpNote;
  let followUpNote: string | null = null;
  if (followUpRequired === true) {
    if (typeof rawFollowUpNote !== "string" || !rawFollowUpNote.trim()) {
      fields.followUpNote = "A non-empty note is required when follow-up is required.";
    } else followUpNote = rawFollowUpNote.trim();
  } else if (rawFollowUpNote !== undefined && rawFollowUpNote !== null) {
    fields.followUpNote = "The note must be null when follow-up is not required.";
  }
  const rawAttachmentNotes = input.attachmentNotes === undefined
    ? current?.attachmentNotes : input.attachmentNotes;
  let attachmentNotes: string | null = null;
  if (rawAttachmentNotes !== undefined && rawAttachmentNotes !== null) {
    if (typeof rawAttachmentNotes !== "string") fields.attachmentNotes = "A string or null is required.";
    else attachmentNotes = rawAttachmentNotes.trim() || null;
  }
  if (current && (!Number.isSafeInteger(input.version) || (input.version as number) < 1)) {
    fields.version = "The current positive Action version is required.";
  }
  if (Object.keys(fields).length) throw new ActionValidationError(fields);
  return {
    description, result, followUpRequired: followUpRequired as boolean,
    followUpNote, attachmentNotes,
    ...(current ? { version: input.version as number } : {}),
  };
}
