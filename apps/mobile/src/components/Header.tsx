import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing, typography } from "../theme";
import { useNotesStore } from "../store/useNotesStore";

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, rightAction }) => {
  const isDarkMode = useNotesStore((state) => state.isDarkMode);
  const theme = isDarkMode ? colors.dark : colors.light;

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      <View>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightAction && (
        <TouchableOpacity
          onPress={rightAction.onPress}
          style={[styles.button, { backgroundColor: theme.primaryLight }]}
        >
          <Text style={[styles.buttonText, { color: theme.primary }]}>
            {rightAction.icon}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    ...typography.h2,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
