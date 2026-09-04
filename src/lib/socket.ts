export const getSocketBaseUrl = (): string => {
  if (typeof window !== "undefined" && (window as any)._env_?.NEXT_PUBLIC_SOCKET_URL) {
    return (window as any)._env_.NEXT_PUBLIC_SOCKET_URL;
  }
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, "");
  }
  return "http://localhost:3000";
};
