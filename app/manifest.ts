import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fog & Fire — California ’26",
    short_name: "Fog & Fire",
    description: "The private group dashboard for one unforgettable California trip.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f0e6",
    theme_color: "#1c2522",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
