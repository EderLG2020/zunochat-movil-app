// Espejo exacto de los DTOs del backend (Spring Boot).
// Cualquier cambio aquí debe reflejar un cambio real en el backend.

// ─── Enums ──────────────────────────────────────────────────────────────────
export type MessageType = "TEXT" | "PAYLOAD" | "FILE" | "IMAGE";
export type MessageStatus = "SENT" | "DELIVERED" | "READ";
export type PayloadType = "SALES" | "SYSTEM" | "SURVEY" | "CARD";
export type ConversationStatus = "ONLINE" | "TYPING" | "OFFLINE" | "AWAY";
export type ConversationType = "DIRECT" | "GROUP";
export type ThemePreference = "LIGHT" | "DARK";

// ─── Auth ───────────────────────────────────────────────────────────────────
export interface LoginRequest {
  identifier: string;
  password: string;
}
export interface RegisterRequest {
  dni: string;
  username: string;
  email: string;
  password: string;
}
export interface VerifyOtpRequest {
  email: string;
  otpCode: string;
}
export interface AuthResponse {
  token: string;
  tokenType: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}
export interface ResendOtpRequest {
  email: string;
}
export interface ForgotPasswordRequest {
  email: string;
}
export interface ResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
}

// ─── Conversaciones ─────────────────────────────────────────────────────────
export interface GroupMemberResponse {
  userId: number;
  username: string;
  avatar: string | null;
}
export interface ConversationResponse {
  conversationId: number;
  type: ConversationType;

  /** Solo DIRECT — null en conversaciones GROUP */
  otherUserId: number | null;
  otherUsername: string | null;
  otherAvatar: string | null;

  /** Solo GROUP — null en conversaciones DIRECT */
  groupName: string | null;
  groupAvatar: string | null;
  members: GroupMemberResponse[] | null;

  lastMessagePreview: string | null;
  lastMessageIsMine: boolean;
  lastMessageAt: string;
  status: ConversationStatus;
  unreadCount: number;
  muted: boolean;
  /** Chat temporal — compartido, no por lado: cualquier participante lo puede prender/apagar. */
  ephemeralEnabled: boolean;
}
export interface CreateConversationRequest {
  targetUserId: number;
}
export interface CreateGroupRequest {
  name: string;
  /** No incluye al creador — se agrega automáticamente en el backend. */
  memberIds: number[];
}
export interface MuteConversationRequest {
  muted: boolean;
}
export interface SetEphemeralRequest {
  enabled: boolean;
}

// ─── Mensajes ───────────────────────────────────────────────────────────────
export interface MessageResponse {
  messageId: number;
  conversationId: number;
  senderId: number;
  /** Null en mensajes de conversaciones GROUP — no hay un único receptor. */
  receiverId: number | null;
  type: MessageType;
  textContent: string | null;
  payload: unknown | null;
  payloadType: PayloadType | null;
  fileUrls: string[];
  status: MessageStatus;
  sentAt: string;
  readAt: string | null;
  deleted: boolean;
  editedAt: string | null;
  /** No-null si se envió con "chat temporal" activo — se autoelimina en esa fecha. */
  expiresAt: string | null;
}
export interface SendMessageRequest {
  conversationId: number;
  type: MessageType;
  textContent?: string;
  payload?: unknown;
  payloadType?: PayloadType;
  fileUrls?: string[];
  /** Ver lib/id.ts — reintentos idempotentes del POST. */
  clientMessageId?: string;
}
export interface MarkReadRequest {
  conversationId: number;
}
export interface EditMessageRequest {
  textContent: string;
}

// ─── Envoltorio genérico del backend ────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  code: string;
  status: number;
  message: string;
  timestamp: string;
  data: T;
  errors?: Record<string, string>;
}
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
  first: boolean;
}
export interface MessageCursorPage {
  content: MessageResponse[];
  hasMore: boolean;
  nextCursor: number | null;
}

// ─── WebSocket — saliente (cliente → servidor) ──────────────────────────────
export interface WsInboundMessage {
  conversationId: number;
  type: MessageType;
  textContent?: string;
  payload?: unknown;
  payloadType?: PayloadType;
  fileUrls?: string[];
  clientMessageId?: string;
}

// ─── WebSocket — entrante (backend → /topic/conversation.{id}) ─────────────
export interface WsOutboundMessage {
  eventType: string; // "MESSAGE_RECEIVED"
  messageId: number;
  conversationId: number;
  senderId: number;
  senderUsername: string;
  receiverId: number | null;
  type: MessageType;
  textContent: string | null;
  payload: unknown | null;
  payloadType: PayloadType | null;
  fileUrls: string[];
  status: MessageStatus;
  sentAt: string;
  deleted: boolean;
  editedAt: string | null;
  expiresAt: string | null;
}

// ─── WebSocket — eventos de control (shapes exactos del backend) ───────────
export interface TypingEvent {
  conversationId: number;
  userId: number; // backend envía "userId", NO "senderId"
  username: string;
  typing: boolean;
}
export interface ReadReceiptEvent {
  conversationId: number;
  readByUserId: number;
  readByUsername: string;
  readAt: string;
}
export interface PresenceEvent {
  userId: number;
  username: string;
  online: boolean;
  lastSeen: string | null;
}

// ─── Usuarios ───────────────────────────────────────────────────────────────
export interface UserSearchResult {
  id: number;
  username: string;
  avatar: string | null;
}
export interface BlockedUserResponse {
  id: number;
  username: string;
  blockedAt: string;
}
/** Perfil público de un usuario — lo que ve cualquier otro usuario al abrirlo desde un chat. */
export interface UserProfileResponse {
  id: number;
  username: string;
  avatar: string | null;
}
export interface UpdatePhoneRequest {
  phone: string | null;
}
export interface UpdateThemeRequest {
  theme: ThemePreference;
}

// ─── Presencia (snapshot inicial por REST) ─────────────────────────────────
export interface PresenceSnapshotResponse {
  userId: number;
  online: boolean;
  lastSeen: string | null;
}

// ─── Racha (streak) ─────────────────────────────────────────────────────────
export type StreakStatus = "INACTIVE" | "ACTIVE" | "AT_RISK" | "BROKEN";
export type StreakRequestStatus = "NONE" | "PENDING" | "ACCEPTED" | "DECLINED";

export interface StreakResponse {
  conversationId: number;
  /** true solo cuando AMBOS participantes aceptaron activarla — ver requestStatus. */
  enabled: boolean;
  currentCount: number;
  longestCount: number;
  lastInteractionDate: string | null;
  status: StreakStatus;
  requestStatus: StreakRequestStatus;
  /** Quién envió la solicitud pendiente — null si no hay ninguna en curso. */
  requestedByUserId: number | null;
}
export interface SetStreakEnabledRequest {
  /** true → dispara/acepta una solicitud de activación. false → desactiva de inmediato. */
  enabled: boolean;
}
export interface RespondStreakRequest {
  accept: boolean;
}
// WebSocket — StreakEvent (backend → /topic/streak.{conversationId})
export interface StreakEvent {
  eventType: string; // REQUEST_SENT | REQUEST_ACCEPTED | REQUEST_DECLINED | INCREMENTED | RESET | AT_RISK | BROKEN | DISABLED
  conversationId: number;
  currentCount: number;
  longestCount: number;
  status: StreakStatus;
  requestedByUserId: number | null;
}

// ─── Administración ─────────────────────────────────────────────────────────
export type Role = "USER" | "ADMIN" | "SUPERADMIN";
export type UserStatus = "PENDING_VERIFICATION" | "ACTIVE" | "BANNED" | "INACTIVE" | "DELETED";

export interface AdminUserResponse {
  id: number;
  dni: string;
  username: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}
export interface AssignRoleRequest {
  role: string;
}
export interface ModerateUserRequest {
  reason?: string;
}
