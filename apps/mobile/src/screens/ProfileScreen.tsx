import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography } from "../theme";
import { useAuthStore } from "../store/useAuthStore";
import { useNotesStore } from "../store/useNotesStore";

export const ProfileScreen = () => {
  const { t, i18n } = useTranslation();
  const { user, loginWithGoogle, loginWithDemo, logout } = useAuthStore();
  const { isDarkMode, setDarkMode } = useNotesStore();
  const theme = isDarkMode ? colors.dark : colors.light;

  const toggleLanguage = () => {
    const nextLang = i18n.language === "vi" ? "en" : "vi";
    i18n.changeLanguage(nextLang);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user ? user.name?.slice(0, 2).toUpperCase() : "👤"}
            </Text>
          </View>
          <Text style={[styles.userName, { color: theme.text }]}>
            {user ? user.name : "Guest User"}
          </Text>
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
            {user ? user.email : "Not logged in"}
          </Text>

          {user ? (
            <TouchableOpacity
              onPress={logout}
              style={[styles.btn, { backgroundColor: "#EF4444" }]}
            >
              <Text style={styles.btnText}>{t("signOut")}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.authButtons}>
              <TouchableOpacity
                onPress={loginWithGoogle}
                style={[styles.btn, { backgroundColor: "#4285F4" }]}
              >
                <Text style={styles.btnText}>{t("signInWithGoogle")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={loginWithDemo}
                style={[styles.btnOutline, { borderColor: theme.border }]}
              >
                <Text style={[styles.btnOutlineText, { color: theme.text }]}>
                  {t("demoLogin")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Preferences Section */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Settings & Preferences
          </Text>

          {/* Dark Mode */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              🌙 Dark Mode
            </Text>
            <Switch value={isDarkMode} onValueChange={setDarkMode} />
          </View>

          {/* Language */}
          <TouchableOpacity onPress={toggleLanguage} style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              🌐 Language / Ngôn ngữ
            </Text>
            <Text style={[styles.rowValue, { color: theme.primary }]}>
              {i18n.language.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Architecture Info */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            ⚡ ChaosNote Monorepo
          </Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            • Worker: Redis + BullMQ Cronjobs{"\n"}
            • API: NestJS Backend with Prisma{"\n"}
            • Web: Next.js + shadcn/ui + i18n{"\n"}
            • Mobile: React Native with Auto-Save
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFF",
  },
  userName: {
    ...typography.h2,
    marginBottom: 2,
  },
  userEmail: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  authButtons: {
    width: "100%",
    gap: spacing.sm,
  },
  btn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  btnOutline: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  btnOutlineText: {
    fontWeight: "600",
    fontSize: 14,
  },
  sectionTitle: {
    ...typography.h3,
    alignSelf: "flex-start",
    marginBottom: spacing.md,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  infoText: {
    ...typography.caption,
    lineHeight: 20,
    alignSelf: "flex-start",
  },
});
