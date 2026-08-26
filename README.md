# ZunoChat Móvil

App de mensajería en tiempo real para Android/iOS, construida con Expo (React Native) sobre el mismo backend Spring Boot que usa el cliente web (`../client`).

## Arquitectura

```
Pantallas (Expo Router)
        ↓
   Hooks (useMessages, useWebSocket, useConversationsSync)
        ↓
 Stores globales (Zustand: auth · chat · conversations)
        ↓
   Servicios (REST vía axios · STOMP vía @stomp/stompjs)
        ↓
   Backend Spring Boot (REST + WebSocket)
```

Es un puerto directo de la arquitectura ya validada en `../client` (mismos DTOs, mismos endpoints, mismo contrato WS), adaptado a las particularidades de React Native. Las diferencias respecto al cliente web están documentadas en cada archivo donde aplican; las más importantes:

- **Sin `sockjs-client`**: RN no tiene las APIs de streaming XHR que SockJS necesita. `websocket.service.ts` conecta directo al endpoint nativo de Spring (`/ws/websocket`) usando el `WebSocket` global de RN, con `forceBinaryWSFrames` y `appendMissingNULLonIncoming` (requeridos por `@stomp/stompjs` en React Native).
- **Sin `atob`/`Buffer` globales**: no existen en Hermes. El decodificador del JWT (`store/authStore.ts`) es una función base64 autocontenida.
- **Token en memoria, no en `localStorage`**: `services/token.ts` mantiene un cache síncrono del JWT para que el interceptor de axios pueda leerlo sin `await`; `authStore` (persistido con `AsyncStorage`) es la única fuente de verdad y lo mantiene sincronizado.
- **Lista de conversaciones como store global, no como hook de pantalla**: Expo Router mantiene las pantallas del stack montadas al navegar (a diferencia de las rutas de una SPA). `store/conversationsStore.ts` + `hooks/useConversationsSync.ts` (montado una vez en el layout de `(app)`) mantienen la lista al día sin importar qué pantalla esté enfocada.
- **Detección automática del backend en LAN**: `lib/env.ts` usa `expoConfig.hostUri` (la IP que Metro ya usa para servir el bundle al teléfono) para adivinar la URL del backend sin configuración manual. Ver `.env.example` para forzarla explícitamente.

## Estructura

```
src/
├── types/index.ts              ← DTOs, espejo exacto del backend
├── lib/
│   ├── env.ts                  ← resolución de API_URL / WS_URL
│   └── format.ts                ← previews, colores de avatar, fechas
├── services/
│   ├── token.ts                 ← cache síncrono del JWT (evita ciclos de import)
│   ├── api.config.ts            ← axios + interceptors JWT/401
│   ├── auth.service.ts          ← login, register, verify-otp
│   ├── conversation.service.ts  ← list, create
│   ├── message.service.ts       ← list (cursor), send, markRead
│   └── websocket.service.ts     ← STOMP nativo, todos los topics
├── store/                        (Zustand)
│   ├── authStore.ts              ← JWT + AsyncStorage + conexión WS
│   ├── conversationsStore.ts     ← lista global de conversaciones
│   └── chatStore.ts              ← conversación activa + mensajes en memoria
├── hooks/
│   ├── useConversationsSync.ts   ← carga + notificaciones WS (global, 1 vez)
│   ├── useMessages.ts            ← fetch paginado por cursor + loadMore
│   └── useWebSocket.ts           ← suscripciones STOMP por conversación + typing
├── components/
│   ├── ui/                       ← Avatar, Button, TextField, ErrorBanner
│   └── chat/                     ← ConversationRow, MessageBubble, MessageInput, UserSearchBar, TypingDots
└── app/                           (Expo Router — file-based)
    ├── _layout.tsx                ← redirección (auth) ↔ (app) según sesión
    ├── (auth)/login.tsx, register.tsx
    └── (app)/index.tsx, chat/[id].tsx
```

## Backend

Este proyecto consume `../backend` tal cual. Se hicieron dos ajustes ahí para soportar clientes móviles (documentados en su propio `git log`/diff):

- `websocket.allowed-origins` en `application-dev.properties` ahora permite cualquier origen en dev, porque el teléfono/emulador conecta desde una IP LAN que no se puede enumerar de antemano (en prod se sigue configurando por variable de entorno, sin cambios).
- `CorsConfig` suma los puertos de `expo start --web` (8081, 19006) para poder probar la app en el navegador.

Ningún endpoint ni contrato de datos cambió — el móvil es 100% compatible con lo que ya usa `../client`.

## Inicio rápido

```bash
cd zunochat-movil-app
npm install

cp .env.example .env   # opcional: fuerza la URL del backend, ver comentarios ahí

npm start               # abre el menú de Expo (Android / iOS / web)
```

El backend debe estar corriendo (`../backend`, ver su README). Si no defines `EXPO_PUBLIC_API_URL`, la app intenta detectar sola la IP de tu PC en la red local; si falla, edítala a mano en `.env`.

- **Emulador Android**: sin configurar nada, cae al alias `10.0.2.2:8080`.
- **Simulador iOS**: `localhost:8080` funciona directo.
- **Dispositivo físico (Expo Go)**: necesita la IP LAN de tu PC — normalmente se autodetecta; si no, ponla en `.env`.

## Flujo de autenticación

Igual que el web: `POST /api/auth/register` → OTP por correo → `POST /api/auth/verify-otp` (activa la cuenta y devuelve JWT) → `POST /api/auth/login` para sesiones futuras. El JWT se persiste con `AsyncStorage` vía `zustand/persist` y reconecta el WebSocket automáticamente al reabrir la app.
