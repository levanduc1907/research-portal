import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../theme";
import { useNotesStore } from "../store/useNotesStore";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: string;
  color?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  color,
}) => {
  const isDarkMode = useNotesStore((state) => state.isDarkMode);
  const theme = isDarkMode ? colors.dark : colors.light;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.icon, { color: color || theme.primary }]}>
          {icon}
        </Text>
        <Text style={[styles.title, { color: theme.textSecondary }]}>
          {title}
        </Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
        {unit && (
          <Text style={[styles.unit, { color: theme.textSecondary }]}>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minWidth: 140,
    margin: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    ...typography.caption,
    fontWeight: "600",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    ...typography.h2,
    fontWeight: "700",
  },
  unit: {
    ...typography.caption,
    fontWeight: "500",
  },
});
