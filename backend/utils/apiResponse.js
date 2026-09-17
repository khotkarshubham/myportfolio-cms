export const sendSuccess = (
  res,
  data = null,
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

export const sendError = (
  res,
  message = "Something went wrong",
  statusCode = 500,
  details = undefined
) => {
  const response = {
    success: false,
    message: String(message)
  };

  /*
   * Only include additional details when explicitly provided.
   *
   * This keeps normal production responses clean and avoids
   * accidentally exposing stack traces or internal errors.
   */
  if (details !== undefined) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};
