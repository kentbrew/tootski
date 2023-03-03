import { config } from "config";

// log messages to console
export default function debug(output, priority) {
  if (!priority) {
    priority = 1;
  }
  if (priority < config.debug) {
    console.log(output);
  }
}
