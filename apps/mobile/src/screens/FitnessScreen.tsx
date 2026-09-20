import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography } from "../theme";
import { useNotesStore } from "../store/useNotesStore";
import { MetricCard } from "../components/MetricCard";

export const FitnessScreen = () => {
  const { t } = useTranslation();
  const isDarkMode = useNotesStore((state) => state.isDarkMode);
  const theme = isDarkMode ? colors.dark : colors.light;

  const [waterCups, setWaterCups] = useState(6);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t("fitness")} & Nutrition 🥗
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Daily Activity & Health Tracking
          </Text>
        </View>

        {/* Primary Metric Grid */}
        <View style={styles.grid}>
          <MetricCard
            title={t("caloriesBurned")}
            value="1,840"
            unit="kcal"
            icon="🔥"
            color="#EA580C"
          />
          <MetricCard
            title={t("dailySteps")}
            value="8,420"
            unit="steps"
            icon="👟"
            color="#2563EB"
          />
        </View>

        <View style={styles.grid}>
          <MetricCard
            title={t("workoutTime")}
            value="45"
            unit="mins"
            icon="⏱️"
            color="#16A34A"
          />
          <MetricCard
            title={t("waterIntake")}
            value={(waterCups * 0.25).toFixed(1)}
            unit="L"
            icon="💧"
            color="#0891B2"
          />
        </View>

        {/* Water Logger Widget */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              💧 Water Intake Goal (2.5L)
            </Text>
            <Text style={[styles.sectionValue, { color: theme.primary }]}>
              {waterCups} / 10 cups
            </Text>
          </View>

          <View style={styles.waterControls}>
            <TouchableOpacity
              onPress={() => setWaterCups(Math.max(0, waterCups - 1))}
              style={[styles.waterBtn, { backgroundColor: theme.background }]}
            >
              <Text style={[styles.waterBtnText, { color: theme.text }]}>-</Text>
            </TouchableOpacity>

            <View style={styles.waterBar}>
              <View
                style={[
                  styles.waterFill,
                  { width: `${Math.min(100, (waterCups / 10) * 100)}%` },
                ]}
              />
            </View>

            <TouchableOpacity
              onPress={() => setWaterCups(waterCups + 1)}
              style={[styles.waterBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={[styles.waterBtnText, { color: "#FFF" }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nutrition Plan Summary */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🥗 Today's Macro Goals
          </Text>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>
                Protein
              </Text>
              <Text style={[styles.macroVal, { color: theme.text }]}>120g</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>
                Carbs
              </Text>
              <Text style={[styles.macroVal, { color: theme.text }]}>210g</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>
                Fat
              </Text>
              <Text style={[styles.macroVal, { color: theme.text }]}>55g</Text>
            </View>
          </View>
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
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.caption,
  },
  grid: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  sectionCard: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16,
  },
  sectionValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  waterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  waterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  waterBtnText: {
    fontSize: 18,
    fontWeight: "700",
  },
  waterBar: {
    flex: 1,
    height: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 6,
    overflow: "hidden",
  },
  waterFill: {
    height: "100%",
    backgroundColor: "#0891B2",
    borderRadius: 6,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.sm,
  },
  macroItem: {
    alignItems: "center",
  },
  macroLabel: {
    ...typography.caption,
  },
  macroVal: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
});
