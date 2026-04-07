import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/forms",
        has: [
          {
            type: "host",
            value: "www.truequestlearning.com",
          },
        ],
        destination: "https://forms.truequestlearning.com",
        permanent: true,
      },
      {
        source: "/forms/:path*",
        has: [
          {
            type: "host",
            value: "www.truequestlearning.com",
          },
        ],
        destination: "https://forms.truequestlearning.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
