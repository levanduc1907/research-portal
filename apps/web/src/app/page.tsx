"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MeshBackground } from "../components/ui/mesh-background";
import { Navbar } from "../components/navbar";
import { Sidebar as PersonalSidebar } from "../components/sidebar";
import { NoteCard } from "../components/note-card";
import { NoteEditor } from "../components/note-editor";
import { WorkerStatusModal } from "../components/worker-status-card";
import { TeamSidebar } from "../components/teams/team-sidebar";
import { ChannelChatView } from "../components/teams/channel-chat-view";
import { TeamNoteEditor } from "../components/teams/team-note-editor";
import { DocumentVaultView } from "../components/teams/document-vault-view";
import { TeamInviteModal } from "../components/teams/team-invite-modal";
import { TeamMembersModal } from "../components/teams/team-members-modal";
import { CreateTeamModal } from "../components/teams/create-team-modal";
import { CreateChannelModal } from "../components/teams/create-channel-modal";
import { useNotes } from "../context/notes-context";
import { useAuth } from "../context/auth-context";
import { useI18n } from "../lib/i18n/context";
import {
  Team,
  Channel,
  TeamNote,
  api,
} from "../lib/api-client";
import { Plus } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";

export default function HomePage(): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();
  const { notes, filter, search, selectedTag, createNote } = useNotes();

  // Workspace & Teams State
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedNote, setSelectedNote] = useState<TeamNote | null>(null);
  const [activeView, setActiveView] = useState<"chat" | "note" | "vault" | "personal">("personal");

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);

  // Load user's teams
  const refreshTeams = useCallback(async () => {
    try {
      const teamList = await api.getTeams();
      setTeams(teamList);

      // If a team is currently selected, refresh its full detail
      if (selectedTeam) {
        const refreshed = await api.getTeamById(selectedTeam.id);
        setSelectedTeam(refreshed);
      }
    } catch (err) {
      console.error("Failed to load teams:", err);
    }
  }, [selectedTeam?.id]);

  useEffect(() => {
    refreshTeams();
  }, []);

  // Handle Team Selection
  const handleSelectTeam = async (team: Team | null) => {
    if (!team) {
      setSelectedTeam(null);
      setActiveView("personal");
      setSelectedChannel(null);
      setSelectedNote(null);
      return;
    }

    try {
      const fullTeam = await api.getTeamById(team.id);
      setSelectedTeam(fullTeam);

      // Default to first channel
      if (fullTeam.channels && fullTeam.channels.length > 0) {
        setSelectedChannel(fullTeam.channels[0] ?? null);
        setActiveView("chat");
      } else if (fullTeam.notes && fullTeam.notes.length > 0) {
        setSelectedNote(fullTeam.notes[0] ?? null);
        setActiveView("note");
      } else {
        setActiveView("vault");
      }
    } catch (err) {
      console.error("Failed to fetch team details:", err);
    }
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setSelectedNote(null);
    setActiveView("chat");
  };

  const handleSelectNote = (note: TeamNote) => {
    setSelectedNote(note);
    setActiveView("note");
  };

  const handleSelectVault = () => {
    setActiveView("vault");
  };

  const handleCreateTeamNote = async () => {
    if (!selectedTeam) return;
    try {
      const newNote = await api.createTeamNote(selectedTeam.id, {
        title: "Untitled Team Note",
        content: "",
        color: "#FAF8F5",
        minEditRole: "EDITOR",
      });
      await refreshTeams();
      setSelectedNote(newNote);
      setActiveView("note");
    } catch (err: any) {
      alert(err.message || "Failed to create team note");
    }
  };

  const handleJoinTeam = async (code: string) => {
    const result = await api.joinTeam(code);
    await refreshTeams();
    const joinedTeam = await api.getTeamById(result.teamId);
    setSelectedTeam(joinedTeam);
    if (joinedTeam.channels && joinedTeam.channels.length > 0) {
      setSelectedChannel(joinedTeam.channels[0] ?? null);
      setActiveView("chat");
    }
  };

  // Personal Notes Filter
  const filteredPersonalNotes = notes.filter((note) => {
    if (selectedTag && !note.tags.includes(selectedTag)) return false;
    if (filter === "trash") {
      if (!note.isTrash) return false;
    } else if (filter === "archived") {
      if (!note.isArchived || note.isTrash) return false;
    } else if (filter === "pinned") {
      if (!note.isPinned || note.isTrash || note.isArchived) return false;
    } else {
      if (note.isTrash || note.isArchived) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = note.title.toLowerCase().includes(q);
      const matchContent = note.content.toLowerCase().includes(q);
      const matchTag = note.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchTitle || matchContent || matchTag;
    }
    return true;
  });

  return (
    <MeshBackground>
      <Navbar />

      <div className="flex flex-1 flex-row overflow-hidden min-h-0 w-full">
        {/* Teams & Channel Navigator Sidebar */}
        <TeamSidebar
          teams={teams}
          selectedTeam={selectedTeam}
          selectedChannel={selectedChannel}
          selectedNote={selectedNote}
          activeView={activeView}
          currentUser={user}
          onSelectTeam={handleSelectTeam}
          onSelectChannel={handleSelectChannel}
          onSelectNote={handleSelectNote}
          onSelectVault={handleSelectVault}
          onOpenInviteModal={() => setShowInviteModal(true)}
          onOpenMembersModal={() => setShowMembersModal(true)}
          onCreateTeamNote={handleCreateTeamNote}
          onCreateChannel={() => setShowCreateChannelModal(true)}
          onCreateTeamModal={() => setShowCreateTeamModal(true)}
        />

        {/* Dynamic Center/Main Workspace View */}
        {selectedTeam === null ? (
          /* PERSONAL WORKSPACE VIEW */
          <>
            {/* Personal Sidebar (Tags & Categories) */}
            <PersonalSidebar onOpenSystemStatus={() => setShowStatusModal(true)} />

            {/* Personal Notes List Column */}
            <div className="w-80 lg:w-96 border-r border-slate-200/60 flex flex-col bg-white/30 backdrop-blur-md shrink-0 h-full overflow-hidden dark:border-slate-800/60 dark:bg-slate-900/30">
              <div className="p-4 border-b border-slate-200/60 flex items-center justify-between bg-white/50 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/50">
                <div>
                  <h2 className="font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {selectedTag
                      ? `#${selectedTag}`
                      : filter === "all"
                      ? t.allNotes
                      : filter === "pinned"
                      ? t.pinned
                      : filter === "archived"
                      ? t.archived
                      : t.trash}
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    {filteredPersonalNotes.length} note(s)
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => createNote()}
                  className="h-8 gap-1 text-xs rounded-xl border-slate-200 bg-white/80 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5 text-[#6F8863]" />
                  <span>{t.newNote}</span>
                </Button>
              </div>

              <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
                {filteredPersonalNotes.length > 0 ? (
                  filteredPersonalNotes.map((n) => (
                    <NoteCard key={n.id} note={n} />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 my-auto">
                    <p className="text-xs">{t.noNotesFound}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Note Editor */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-white/50 backdrop-blur-md dark:bg-slate-900/50">
              <NoteEditor />
            </main>
          </>
        ) : (
          /* TEAM WORKSPACE VIEW */
          <main className="flex-1 flex flex-col h-full overflow-hidden min-h-0 bg-white/60 backdrop-blur-xl dark:bg-slate-900/60">
            {activeView === "chat" && selectedChannel && (
              <ChannelChatView
                channel={selectedChannel}
                currentUser={user}
                onOpenMembers={() => setShowMembersModal(true)}
              />
            )}

            {activeView === "note" && selectedNote && (
              <TeamNoteEditor
                note={selectedNote}
                currentUser={user}
                onNoteUpdated={(updated) => {
                  setSelectedNote(updated);
                  refreshTeams();
                }}
                onNoteDeleted={async () => {
                  await refreshTeams();
                  if (selectedTeam.channels && selectedTeam.channels.length > 0) {
                    setSelectedChannel(selectedTeam.channels[0] ?? null);
                    setActiveView("chat");
                  }
                }}
              />
            )}

            {activeView === "vault" && (
              <DocumentVaultView
                team={selectedTeam}
                currentUser={user}
                onDocumentsUpdated={refreshTeams}
              />
            )}
          </main>
        )}
      </div>

      {/* Modals */}
      <WorkerStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
      />

      <TeamInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        team={selectedTeam}
        onJoinTeam={handleJoinTeam}
      />

      {selectedTeam && (
        <TeamMembersModal
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          team={selectedTeam}
          currentUserId={user?.id || ""}
          onMembersUpdated={refreshTeams}
        />
      )}

      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        onTeamCreated={async (teamId) => {
          await refreshTeams();
          const newTeam = await api.getTeamById(teamId);
          setSelectedTeam(newTeam);
          if (newTeam.channels && newTeam.channels.length > 0) {
            setSelectedChannel(newTeam.channels[0] ?? null);
            setActiveView("chat");
          }
        }}
      />

      {selectedTeam && (
        <CreateChannelModal
          isOpen={showCreateChannelModal}
          onClose={() => setShowCreateChannelModal(false)}
          teamId={selectedTeam.id}
          onChannelCreated={refreshTeams}
        />
      )}
    </MeshBackground>
  );
}
