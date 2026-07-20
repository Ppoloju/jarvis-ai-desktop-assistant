export const handleChat = (req, res) => {
  const { message } = req.body;

  res.json({
    reply: "Jarvis says: " + message,
  });
};