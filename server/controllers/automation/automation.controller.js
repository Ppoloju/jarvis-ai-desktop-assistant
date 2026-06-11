exports.openWebsite = (req, res) => {
  const { url } = req.body;

  res.json({
    success: true,
    message: `Website launch request received for ${url}`,
  });
};