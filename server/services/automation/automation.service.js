exports.launchWebsite = async (url) => {
  const open = (await import("open")).default;

  console.log("SERVICE CALLED:", url);

  await open(url);

  console.log("OPEN FINISHED");
};