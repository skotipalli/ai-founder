import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/basePath";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Reverse-proxied at /hitl on srini-vm01 (nginx forwards the full path
  // unchanged, so the app must prefix its own routes/assets to match).
  basePath: BASE_PATH,
};

export default nextConfig;
