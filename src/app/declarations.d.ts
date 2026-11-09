declare module 'next/link' {
  import type { ComponentType, AnchorHTMLAttributes, PropsWithoutRef, RefAttributes } from 'react';
  const Link: ComponentType<
    PropsWithoutRef<AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: any; className?: string; onClick?: () => void }> &
      RefAttributes<HTMLAnchorElement>
  >;
  export default Link;
}

declare module 'next/navigation' {
  export function usePathname(): string;
  export function useRouter(): {
    push(url: string): void;
    replace(url: string): void;
    back(): void;
    forward(): void;
    refresh(): void;
    prefetch(url: string): void;
  };
  export function useSearchParams(): URLSearchParams;
  export function useParams<T = Record<string, string | string[]>>(): T;
  export function redirect(url: string): never;
}

declare module 'next' {
  export interface Metadata {
    title?: string | { default: string; template?: string };
    description?: string;
    manifest?: string;
    icons?: any;
    openGraph?: any;
    viewport?: any;
    themeColor?: string;
    [key: string]: any;
  }
}
