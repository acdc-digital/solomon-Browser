// next.config.js
// /Users/matthewsimon/Documents/Github/solomon-desktop/solomon-Desktop/next/next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals.push('onnxruntime-node');
        }
        return config;
    },
};

export default nextConfig;