import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography } from "../theme";
import { useNotesStore } from "../store/useNotesStore";
import { Note } from "../services/api";

export const HomeScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { notes, createNote, setActiveNote, togglePin, isDarkMode } =
    useNotesStore();
  const theme = isDarkMode ? colors.dark : colors.light;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned">("all");

  const filteredNotes = notes.filter((n) => {
    if (filter === "pinned" && !n.isPinned) return false;
    if (n.isTrash) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenNote = (note: Note) => {
    setActiveNote(note);
    navigation.navigate("NoteDetail");
  };

  const handleCreateNew = async () => {
    const created = await createNote({
      title: "",
      content: "",
      color: "#FEF08A",
    });
    setActiveNote(created);
    navigation.navigate("NoteDetail");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.appTitle, { color: theme.text }]}>
            ChaosNote ⚡
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {filteredNotes.length} {t("allNotes").toLowerCase()}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleCreateNew}
          style={[styles.newBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.newBtnText}>+ {t("newNote")}</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View
        style={[
          styles.searchBox,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t("searchPlaceholder")}
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setFilter("all")}
          style={[
            styles.filterPill,
            filter === "all"
              ? { backgroundColor: theme.primary }
              : { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === "all" ? "#FFF" : theme.textSecondary },
            ]}
          >
            {t("allNotes")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilter("pinned")}
          style={[
            styles.filterPill,
            filter === "pinned"
              ? { backgroundColor: theme.primary }
              : { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === "pinned" ? "#FFF" : theme.textSecondary },
            ]}
          >
            📌 {t("pinned")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notes List */}
      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleOpenNote(item)}
            style={[
              styles.noteCard,
              {
                backgroundColor: item.color || theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.noteHeader}>
              <Text
                style={[
                  styles.noteTitle,
                  { color: "#0F172A" },
                ]}
                numberOfLines={1}
              >
                {item.title || "Untitled"}
              </Text>
              <TouchableOpacity onPress={() => togglePin(item.id)}>
                <Text style={styles.pinIcon}>
                  {item.isPinned ? "📌" : "📍"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.noteContent,
                { color: "#334155" },
              ]}
              numberOfLines={3}
            >
              {item.content || "Empty note..."}
            </Text>

            <View style={styles.noteFooter}>
              <View style={styles.tagsRow}>
                {item.tags.slice(0, 2).map((t) => (
                  <View key={t} style={styles.tagBadge}>
                    <Text style={styles.tagText}>#{t}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.dateText}>
                {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  appTitle: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.caption,
  },
  newBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  newBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  noteCard: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  noteTitle: {
    ...typography.h3,
    flex: 1,
  },
  pinIcon: {
    fontSize: 16,
    marginLeft: spacing.sm,
  },
  noteContent: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  noteFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
    paddingTop: spacing.xs,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 4,
  },
  tagBadge: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#334155",
  },
  dateText: {
    fontSize: 11,
    color: "#64748B",
  },
});
