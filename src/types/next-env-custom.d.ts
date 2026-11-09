// Ambient type declarations for Next.js internal type augmentations
declare module 'next/dist/lib/metadata/types/metadata-interface.js' {
  export type ResolvingMetadata = any;
  export type ResolvingViewport = any;
}

declare module 'next' {
  export type NextConfig = import('next/dist/server/config-shared').NextConfig;
}
