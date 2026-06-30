import { createDefaultConfig } from "./config.js";
import { YtDlpDownloader } from "./downloader.js";
import { FileJobStore } from "./jobStore.js";
import { createReceiverServer } from "./server.js";

const config = createDefaultConfig();
const jobStore = new FileJobStore(config.jobsPath);

await jobStore.load();

const server = createReceiverServer({
  config,
  jobStore,
  downloader: new YtDlpDownloader()
});

server.listen(config.port, config.host, () => {
  console.log(
    `Dew receiver listening on http://${config.host}:${config.port}`
  );
});
