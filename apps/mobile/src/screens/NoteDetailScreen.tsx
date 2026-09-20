import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, typography } from "../theme";
import { useNotesStore } from "../store/useNotesStore";

const COLOR_OPTIONS = ["#FEF08A", "#BAE6FD", "#BBF7D0", "#FBCFE8", "#E9D5FF"];

export const NoteDetailScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const {
    activeNote,
    updateNoteAutoSave,
    togglePin,
    deleteNote,
    saveStatus,
    isDarkMode,
  } = useNotesStore();
  const theme = isDarkMode ? colors.dark : colors.light;

  const [tagInput, setTagInput] = useState("");

  if (!activeNote) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <Text style={{ color: theme.text, textAlign: "center", marginTop: 40 }}>
          No active note selected
        </Text>
      </SafeAreaView>
    );
  }

  const handleTitleChange = (text: string) => {
    updateNoteAutoSave({ title: text });
  };

  const handleContentChange = (text: string) => {
    updateNoteAutoSave({ content: text });
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const formatted = tagInput.trim().toLowerCase();
      if (!activeNote.tags.includes(formatted)) {
        updateNoteAutoSave({ tags: [...activeNote.tags, formatted] });
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    updateNoteAutoSave({
      tags: activeNote.tags.filter((t) => t !== tag),
    });
  };

  const handleDelete = async () => {
    await deleteNote(activeNote.id);
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: activeNote.color || theme.card },
      ]}
    >
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>← {t("notes")}</Text>
        </TouchableOpacity>

        {/* Live Auto-save Indicator */}
        <View style={styles.statusPill}>
          <Text style={styles.statusDot}>
            {saveStatus === "saving" ? "🟡" : "🟢"}
          </Text>
          <Text style={styles.statusText}>
            {saveStatus === "saving" ? t("saving") : t("saved")}
          </Text>
        </View>

        {/* Action icons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => togglePin(activeNote.id)}
            style={styles.actionBtn}
          >
            <Text style={styles.actionIcon}>
              {activeNote.isPinned ? "📌" : "📍"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollArea}>
        {/* Color Palette Selector */}
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => updateNoteAutoSave({ color: c })}
              style={[
                styles.colorCircle,
                { backgroundColor: c },
                activeNote.color === c ? styles.selectedColor : null,
              ]}
            />
          ))}
        </View>

        {/* Note Title Input */}
        <TextInput
          value={activeNote.title}
          onChangeText={handleTitleChange}
          placeholder={t("titlePlaceholder")}
          placeholderTextColor="#64748B"
          style={styles.titleInput}
        />

        {/* Tags Row */}
        <View style={styles.tagsContainer}>
          {activeNote.tags.map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => handleRemoveTag(tag)}
              style={styles.tagChip}
            >
              <Text style={styles.tagChipText}>#{tag} ✕</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.addTagBox}>
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
              placeholder="+ tag..."
              placeholderTextColor="#94A3B8"
              style={styles.addTagInput}
            />
          </View>
        </View>

        {/* Content Body Textarea */}
        <TextInput
          value={activeNote.content}
          onChangeText={handleContentChange}
          placeholder={t("contentPlaceholder")}
          placeholderTextColor="#64748B"
          multiline
          textAlignVertical="top"
          style={styles.contentInput}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  backBtn: {
    padding: spacing.xs,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    fontSize: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
  actionIcon: {
    fontSize: 18,
  },
  scrollArea: {
    flex: 1,
    padding: spacing.md,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: spacing.md,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  selectedColor: {
    borderWidth: 2,
    borderColor: "#0F172A",
    transform: [{ scale: 1.15 }],
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: spacing.sm,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.md,
  },
  tagChip: {
    backgroundColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E293B",
  },
  addTagBox: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 8,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  addTagInput: {
    fontSize: 11,
    color: "#0F172A",
    height: 26,
  },
  contentInput: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1E293B",
    minHeight: 300,
  },
});
