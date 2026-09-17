import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // TAILSCALE_HOSTS: 쉼표로 구분된 허용 호스트 목록
  // 예) TAILSCALE_HOSTS=100.72.211.40,minhyeon-macmini.tailfc37d.ts.net
  const extraHosts = env.TAILSCALE_HOSTS
    ? env.TAILSCALE_HOSTS.split(",").map((h: string) => h.trim()).filter(Boolean)
    : [];

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api": "http://localhost:8000",
      },
      allowedHosts: [
        "localhost",
        ...extraHosts,
      ],
    },
  };
});
