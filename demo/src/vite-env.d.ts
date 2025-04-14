/// <reference types="vite/client" />

declare module 'virtual:serwist' {
  interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
    register(): Promise<void>;
  }
  export function getSerwist(): Promise<ExtendedServiceWorkerRegistration | undefined>;
}
