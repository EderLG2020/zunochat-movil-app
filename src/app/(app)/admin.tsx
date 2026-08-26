import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/use-theme";
import { adminService } from "@/services";
import { useAuthStore } from "@/store/authStore";
import type { AdminUserResponse, Role, UserStatus } from "@/types";

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING_VERIFICATION: "Pendiente",
  ACTIVE: "Activo",
  BANNED: "Baneado",
  INACTIVE: "Inactivo",
  DELETED: "Eliminado",
};
const STATUSES: UserStatus[] = ["PENDING_VERIFICATION", "ACTIVE", "BANNED", "INACTIVE", "DELETED"];
const ROLES: Role[] = ["USER", "ADMIN"];

export default function AdminScreen() {
  const theme = useTheme();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperadmin = currentUser?.role === "SUPERADMIN";
  const isAuthorized = currentUser?.role === "ADMIN" || isSuperadmin;

  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await adminService.list({
        page,
        size: 15,
        search: search || undefined,
        status: statusFilter ?? undefined,
        role: roleFilter ?? undefined,
      });
      setUsers(result.content);
      setTotalPages(result.totalPages);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "No se pudo cargar la lista de usuarios.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, roleFilter]);

  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { void loadRef.current(); }, [page, search, statusFilter, roleFilter]);

  if (!isAuthorized) return <Redirect href="/(app)" />;

  const withAction = async (userId: number, action: () => Promise<void>) => {
    try {
      setActingOn(userId);
      await action();
      await loadRef.current();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "No se pudo completar la acción.");
    } finally {
      setActingOn(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={[styles.backIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Administración</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{currentUser?.username} · {currentUser?.role}</Text>
        </View>
      </View>

      <View style={styles.filters}>
        <TextInput
          value={search}
          onChangeText={(v) => { setPage(0); setSearch(v); }}
          placeholder="Buscar username o email..."
          placeholderTextColor={theme.placeholder}
          style={[styles.search, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Todos" active={!statusFilter} onPress={() => { setPage(0); setStatusFilter(null); }} theme={theme} />
          {STATUSES.map((s) => (
            <Chip key={s} label={STATUS_LABEL[s]} active={statusFilter === s} onPress={() => { setPage(0); setStatusFilter(s); }} theme={theme} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Todos los roles" active={!roleFilter} onPress={() => { setPage(0); setRoleFilter(null); }} theme={theme} />
          {(["USER", "ADMIN", "SUPERADMIN"] as Role[]).map((r) => (
            <Chip key={r} label={r} active={roleFilter === r} onPress={() => { setPage(0); setRoleFilter(r); }} theme={theme} />
          ))}
        </ScrollView>
      </View>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: theme.dangerBackground }]}>
          <Text style={{ color: theme.danger, fontSize: 12 }}>{error}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={theme.primary} /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => String(u.id)}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          ListEmptyComponent={<Text style={{ color: theme.textSecondary, textAlign: "center", marginTop: 40 }}>No se encontraron usuarios.</Text>}
          renderItem={({ item: u }) => {
            const isSelf = u.username === currentUser?.username;
            const targetIsSuperadmin = u.role === "SUPERADMIN";
            const canModerate = !isSelf && !targetIsSuperadmin && (isSuperadmin || u.role === "USER");
            const busy = actingOn === u.id;

            return (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.username, { color: theme.text }]}>{u.username}</Text>
                    <Text style={[styles.email, { color: theme.textSecondary }]}>{u.email}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: theme.backgroundElement }]}>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>{STATUS_LABEL[u.status]}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>Rol: {u.role} · {new Date(u.createdAt).toLocaleDateString("es")}</Text>

                {canModerate && (
                  <View style={styles.actions}>
                    {isSuperadmin && (
                      <>
                        {ROLES.filter((r) => r !== u.role).map((r) => (
                          <Pressable
                            key={r}
                            disabled={busy}
                            onPress={() => withAction(u.id, () => adminService.assignRole(u.id, { role: r }))}
                            style={[styles.smallAction, { borderColor: theme.border }]}
                          >
                            <Text style={{ fontSize: 11, color: theme.text }}>Hacer {r}</Text>
                          </Pressable>
                        ))}
                      </>
                    )}
                    {u.status === "BANNED" ? (
                      <Pressable disabled={busy} onPress={() => withAction(u.id, () => adminService.activate(u.id))} style={[styles.smallAction, { borderColor: theme.border }]}>
                        <Text style={{ fontSize: 11, color: theme.text }}>{busy ? "..." : "Reactivar"}</Text>
                      </Pressable>
                    ) : (
                      <Pressable disabled={busy} onPress={() => withAction(u.id, () => adminService.ban(u.id, {}))} style={[styles.smallAction, { borderColor: theme.border }]}>
                        <Text style={{ fontSize: 11, color: theme.text }}>{busy ? "..." : "Banear"}</Text>
                      </Pressable>
                    )}
                    <Pressable
                      disabled={busy}
                      onPress={() => withAction(u.id, () => adminService.remove(u.id))}
                      style={[styles.smallAction, { borderColor: theme.danger }]}
                    >
                      <Text style={{ fontSize: 11, color: theme.danger }}>Eliminar</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {totalPages > 1 && (
        <View style={[styles.pagination, { borderTopColor: theme.border }]}>
          <Button title="Anterior" variant="ghost" disabled={page === 0} onPress={() => setPage((p) => p - 1)} />
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Página {page + 1} de {totalPages}</Text>
          <Button title="Siguiente" variant="ghost" disabled={page >= totalPages - 1} onPress={() => setPage((p) => p + 1)} />
        </View>
      )}
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress, theme }: { label: string; active: boolean; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : "transparent" },
      ]}
    >
      <Text style={{ fontSize: 12, color: active ? theme.primaryText : theme.textSecondary }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backIcon: { fontSize: 28, lineHeight: 28 },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { fontSize: 11 },
  filters: { paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  search: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  chipRow: { gap: 6, paddingBottom: 2 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  errorBox: { marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  username: { fontSize: 14, fontWeight: "700" },
  email: { fontSize: 12 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  smallAction: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
