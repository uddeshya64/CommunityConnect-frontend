import { SOCKET_URL } from "@/config/env";

export const getSocketBaseUrl = (): string => {
  let url = SOCKET_URL;

  // When accessing from another system on the local network (e.g. 192.168.x.x or custom domain),
  // replace localhost / 127.0.0.1 with the actual hostname so the client connects to the host machine
  if (typeof window !== "undefined" && window.location?.hostname) {
    const currentHost = window.location.hostname;
    if (currentHost !== "localhost" && currentHost !== "127.0.0.1") {
      url = url.replace(/localhost|127\.0\.0\.1/, currentHost);
    }
  }

  return url;
};
