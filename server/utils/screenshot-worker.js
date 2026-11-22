import screenshot from "screenshot-desktop";

const filename = process.argv[2];

screenshot({ filename })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
