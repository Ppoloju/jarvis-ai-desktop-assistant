const fileSystemErrors = {
  ENOENT: [404, "File or folder not found"],
  EEXIST: [409, "That path already exists"],
  ENOTEMPTY: [409, "Folder is not empty"],
  EACCES: [403, "Permission denied"],
  EPERM: [403, "Operation not permitted"],
  EISDIR: [400, "That path is a folder"],
  ENOTDIR: [400, "That path is not a folder"],
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err.type === "entity.parse.failed") {
    res.status(400).json({ success: false, message: "Invalid JSON body" });
    return;
  }

  const mapped = err.code ? fileSystemErrors[err.code] : undefined;
  const expected = Boolean(err.status || mapped);
  const status = err.status || mapped?.[0] || 500;

  if (!expected) {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message: mapped?.[1] || (expected ? err.message : "Internal server error"),
  });
};

export default errorHandler;
