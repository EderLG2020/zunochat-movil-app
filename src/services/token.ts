// Cache en memoria del JWT actual.
//
// api.config.ts necesita leer el token de forma SÍNCRONA en cada request
// (el interceptor de axios no puede esperar una lectura async de AsyncStorage
// sin complicar cada llamada). authStore.ts es la única fuente de verdad y
// llama a setAuthToken() en login/logout/hydrate — este módulo solo evita el
// import circular entre el store y el cliente HTTP.
let currentToken: string | null = null;

export function setAuthToken(token: string | null): void {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}

// Permite que api.config.ts reaccione a un 401 sin importar authStore
// directamente (authStore ya importa este módulo → evitaría un ciclo).
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}
