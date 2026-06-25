import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-ignore - allowedDevOrigins is supported in Next.js 14+ dev server but might not be in the TS type yet
  allowedDevOrigins: [
    "192.168.9.153", 
    "192.168.9.153:3000", 
    "0.0.0.0", 
    "0.0.0.0:3000", 
    "localhost:3000"
  ]
};

export default nextConfig;
