const filesService = require("../../services/files/files.service");

exports.createFolder = async (req, res) => {
  try {
    const { folderName } = req.body;

    const folderPath = await filesService.createFolder(folderName);

    res.json({
      success: true,
      path: folderPath,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.createFile = async (req, res) => {
  try {
    const { fileName, content } = req.body;

    const filePath = await filesService.createFile(
      fileName,
      content
    );

    res.json({
      success: true,
      path: filePath,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.renameFile = async (req, res) => {
    console.log("BODY:", req.body);
  try {
    const { oldName, newName } = req.body;

    const newPath = await filesService.renameFile(
      oldName,
      newName
    );

    res.json({
      success: true,
      path: newPath,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.deleteFile = async (req, res) => {
  try {
    const { fileName } = req.body;

    await filesService.deleteFile(fileName);

    res.json({
      success: true,
      message: `${fileName} deleted`,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};