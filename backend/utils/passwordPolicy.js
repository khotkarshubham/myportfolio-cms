export const validPassword = value => typeof value === "string" && value.length >= 12 && Buffer.byteLength(value, "utf8") <= 72;
export const PASSWORD_RULE = "Use at least 12 characters and no more than 72 UTF-8 bytes.";
