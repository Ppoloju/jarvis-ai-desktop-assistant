export const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

export const assert = (condition, status, message) => {
  if (!condition) {
    throw httpError(status, message);
  }
};
