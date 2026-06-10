import { useState, useMemo } from "react";
import {
  Search,
  FolderOpen,
  GitBranch,
  Layers,
  Plus,
  Trash2,
  Clock,
  Blocks,
  Check,
  Edit3,
  Pin,
  PinOff,
  X,
} from "lucide-react";
import type {
  Project,
  Task,
  ThemeMode,
  ThemeVariant,
  TerminalFontSize,
  TaskDisplayWindow,
  FontFamily,
  SkillHubConfig,
} from "../types";
import {
  getAvatarGradient,
  MAX_PROJECT_NAME_LENGTH,
  projectMatchesSearch,
  shortenPath,
  type ProjectNameValidationError,
  type ProjectRenameResult,
} from "../utils";
import { ProjectAvatar } from "./ProjectAvatar";
import { SidebarFooterActions } from "./SidebarFooterActions";
import { OPEN_APP_SETTINGS_EVENT } from "./app-settings/types";
import { TimelineView } from "./TimelineView";
import { SkillHubView } from "./skill-hub/SkillHubView";
import { useI18n, pluralKey } from "../i18n";
import s from "../styles";

function SidebarItem({
  icon,
  label,
  active,
  meta,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  meta?: string;
  onClick?: () => void;
}) {
  return (
    <div
      style={{
        ...s.sidebarItem,
        background: active ? "var(--bg-selected)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
      }}
      onClick={onClick}
    >
      <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
      <span style={{ marginLeft: 10, fontSize: 13, fontWeight: active ? 600 : 500 }}>{label}</span>
      {meta && <span style={s.sidebarItemMeta}>{meta}</span>}
    </div>
  );
}

function WelcomeEmpty({ hasProjects, onOpen }: { hasProjects: boolean; onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <div style={s.emptyState}>
      <div style={{ marginBottom: 14, opacity: 0.4 }}>
        <FolderOpen size={40} strokeWidth={1.2} color="var(--text-hint)" />
      </div>
      <div
        style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}
      >
        {hasProjects ? t("welcome.noMatchingProjects") : t("welcome.noProjectsYet")}
      </div>
      {!hasProjects && (
        <>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 20 }}>
            {t("welcome.openLocalRepo")}
          </div>
          <button style={s.emptyOpenBtn} onClick={onOpen}>
            <FolderOpen size={14} strokeWidth={2} />
            {t("welcome.openProjectFolder")}
          </button>
        </>
      )}
    </div>
  );
}

export function WelcomePage({
  projects,
  allProjects,
  tasks,
  onOpen,
  onProjectClick,
  onDeleteProject,
  onToggleProjectHidden,
  onRenameProject,
  themeVariant,
  themeMode,
  systemPrefersDark,
  onThemeModeChange,
  onToggleTheme,
  terminalFontSize,
  onTerminalFontSizeChange,
  taskDisplayWindow,
  onTaskDisplayWindowChange,
  attentionBadge,
  onAttentionBadgeChange,
  uiFontFamily,
  onUiFontFamilyChange,
  monoFontFamily,
  onMonoFontFamilyChange,
  skillHubConfig,
  onEnterSkillHub,
}: {
  projects: Project[];
  allProjects: Project[];
  tasks: Task[];
  onOpen: () => void;
  onProjectClick: (p: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onToggleProjectHidden: (projectId: string) => void;
  onRenameProject: (projectId: string, name: string) => ProjectRenameResult;
  themeVariant: ThemeVariant;
  themeMode: ThemeMode;
  systemPrefersDark: boolean;
  onThemeModeChange: (mode: ThemeMode) => void;
  onToggleTheme: () => void;
  terminalFontSize: TerminalFontSize;
  onTerminalFontSizeChange: (size: TerminalFontSize) => void;
  taskDisplayWindow: TaskDisplayWindow;
  onTaskDisplayWindowChange: (window: TaskDisplayWindow) => void;
  attentionBadge: boolean;
  onAttentionBadgeChange: (enabled: boolean) => void;
  uiFontFamily: FontFamily;
  onUiFontFamilyChange: (family: FontFamily) => void;
  monoFontFamily: FontFamily;
  onMonoFontFamilyChange: (family: FontFamily) => void;
  skillHubConfig: SkillHubConfig | null;
  onEnterSkillHub: () => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [hov, setHov] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [view, setView] = useState<"projects" | "timeline" | "skills">("projects");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [editingProjectError, setEditingProjectError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return projects.filter((project) => projectMatchesSearch(project, query));
  }, [projects, query]);

  function projectNameErrorMessage(error: ProjectNameValidationError) {
    switch (error) {
      case "required":
        return t("project.nameRequired");
      case "too_long":
        return t("project.nameTooLong", { max: MAX_PROJECT_NAME_LENGTH });
      case "duplicate":
        return t("project.nameDuplicate");
    }
  }

  function startEditingProject(project: Project) {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
    setEditingProjectError(null);
  }

  function cancelEditingProject() {
    setEditingProjectId(null);
    setEditingProjectName("");
    setEditingProjectError(null);
  }

  function saveEditingProject(projectId: string) {
    const result = onRenameProject(projectId, editingProjectName);
    if (!result.ok) {
      setEditingProjectError(projectNameErrorMessage(result.error));
      return;
    }
    cancelEditingProject();
  }

  return (
    <div style={s.welcomeBody}>
      <div style={s.welcomeMain}>
        <div style={s.sidebar}>
          <div style={s.sidebarBrand}>
            <div style={s.sidebarBrandIcon}>
              <span style={s.sidebarBrandBadge}>NZ</span>
            </div>
            <div>
              <div style={s.sidebarBrandTitle}>Nezha</div>
              <div style={s.sidebarBrandMeta}>{t("welcome.agentWorkspace")}</div>
            </div>
          </div>

          <nav style={s.sidebarNav}>
            <div style={s.sidebarSectionTitle}>{t("welcome.workspace")}</div>
            <SidebarItem
              icon={<Layers size={15} />}
              label={t("welcome.projects")}
              active={view === "projects"}
              onClick={() => setView("projects")}
            />
            <SidebarItem
              icon={<Clock size={15} />}
              label={t("welcome.timeline")}
              active={view === "timeline"}
              onClick={() => setView("timeline")}
            />
            <SidebarItem
              icon={<Blocks size={15} />}
              label={t("welcome.skillHub")}
              active={view === "skills"}
              onClick={() => setView("skills")}
            />
          </nav>

          <div style={s.sidebarFooter}>
            <SidebarFooterActions
              themeVariant={themeVariant}
              themeMode={themeMode}
              systemPrefersDark={systemPrefersDark}
              onThemeModeChange={onThemeModeChange}
              onToggleTheme={onToggleTheme}
              terminalFontSize={terminalFontSize}
              onTerminalFontSizeChange={onTerminalFontSizeChange}
              taskDisplayWindow={taskDisplayWindow}
              onTaskDisplayWindowChange={onTaskDisplayWindowChange}
              attentionBadge={attentionBadge}
              onAttentionBadgeChange={onAttentionBadgeChange}
              uiFontFamily={uiFontFamily}
              onUiFontFamilyChange={onUiFontFamilyChange}
              monoFontFamily={monoFontFamily}
              onMonoFontFamilyChange={onMonoFontFamilyChange}
            />
          </div>
        </div>

        {view === "timeline" ? (
          <TimelineView
            projects={allProjects}
            tasks={tasks}
            onTaskClick={(task) => {
              if (task.projectId === skillHubConfig?.hubProjectId) {
                onEnterSkillHub();
                return;
              }
              const project = allProjects.find((p) => p.id === task.projectId);
              if (project) onProjectClick(project);
            }}
          />
        ) : view === "skills" ? (
          <SkillHubView
            config={skillHubConfig}
            allProjects={projects}
            onEnterSkillHub={onEnterSkillHub}
            onOpenAppSettings={() => window.dispatchEvent(new CustomEvent(OPEN_APP_SETTINGS_EVENT))}
          />
        ) : (
          <div style={s.welcomePane}>
            <div style={s.searchRow}>
              <div
                style={{
                  ...s.searchBox,
                  borderColor: searchFocused ? "var(--border-focus)" : "var(--border-medium)",
                  boxShadow: searchFocused ? "0 0 0 3px var(--accent-subtle)" : "none",
                }}
              >
                <Search
                  size={15}
                  strokeWidth={1.9}
                  color="var(--text-muted)"
                  style={{ flexShrink: 0 }}
                />
                <input
                  style={s.searchInput}
                  placeholder={t("welcome.searchProjects")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  autoFocus
                />
              </div>

              <div style={s.actionRow}>
                <button style={s.primaryActionBtn} onClick={onOpen}>
                  <Plus size={14} strokeWidth={2.3} />
                  <span>{t("welcome.openProject")}</span>
                </button>
              </div>
            </div>

            <div style={s.projectSectionHeader}>
              <div>
                <div style={s.projectSectionTitle}>{t("welcome.projects")}</div>
                <div style={s.projectSectionCaption}>
                  {query.trim()
                    ? t(
                        pluralKey(
                          "welcome.resultCount",
                          "welcome.resultCountPlural",
                          filtered.length,
                        ),
                        {
                          count: filtered.length,
                        },
                      )
                    : t(
                        pluralKey(
                          "welcome.projectCount",
                          "welcome.projectCountPlural",
                          projects.length,
                        ),
                        {
                          count: projects.length,
                        },
                      )}
                </div>
              </div>
            </div>

            <div style={s.projectList}>
              {filtered.length === 0 ? (
                <WelcomeEmpty hasProjects={projects.length > 0} onOpen={onOpen} />
              ) : (
                filtered.map((p) => {
                  const [from] = getAvatarGradient(p.name);
                  const isEditing = editingProjectId === p.id;
                  const actionOpacity = hov === p.id || isEditing ? 1 : 0;
                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      style={{
                        ...s.projectItem,
                        background: hov === p.id ? "var(--bg-hover)" : "transparent",
                        borderColor: hov === p.id ? "var(--border-medium)" : "transparent",
                        cursor: isEditing ? "default" : "pointer",
                      }}
                      onMouseEnter={() => setHov(p.id)}
                      onMouseLeave={() => setHov(null)}
                      onClick={() => {
                        if (!isEditing) onProjectClick(p);
                      }}
                      onKeyDown={(e) => {
                        if (isEditing) return;
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        onProjectClick(p);
                      }}
                    >
                      <ProjectAvatar
                        name={p.name}
                        size={34}
                        style={{ boxShadow: hov === p.id ? `0 10px 18px ${from}26` : "none" }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isEditing ? (
                          <>
                            <div style={s.projectRenameRow}>
                              <input
                                autoFocus
                                style={s.projectRenameInput}
                                value={editingProjectName}
                                maxLength={MAX_PROJECT_NAME_LENGTH}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  setEditingProjectName(e.target.value);
                                  setEditingProjectError(null);
                                }}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    saveEditingProject(p.id);
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelEditingProject();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                style={s.projectIconBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveEditingProject(p.id);
                                }}
                                title={t("project.saveName")}
                                aria-label={t("project.saveName")}
                              >
                                <Check size={14} strokeWidth={2.2} />
                              </button>
                              <button
                                type="button"
                                style={s.projectIconBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEditingProject();
                                }}
                                title={t("project.cancelRename")}
                                aria-label={t("project.cancelRename")}
                              >
                                <X size={14} strokeWidth={2.2} />
                              </button>
                            </div>
                            {editingProjectError ? (
                              <div style={s.projectRenameError}>{editingProjectError}</div>
                            ) : null}
                          </>
                        ) : (
                          <div style={s.projectName}>{p.name}</div>
                        )}
                        <div style={s.projectMeta}>{shortenPath(p.path)}</div>
                      </div>

                      {p.branch ? (
                        <span style={s.branchBadge}>
                          <GitBranch size={10} strokeWidth={2} />
                          {p.branch}
                        </span>
                      ) : (
                        <span style={s.projectTag}>{t("welcome.local")}</span>
                      )}

                      <span
                        role="button"
                        tabIndex={0}
                        style={{
                          ...s.projectPinBtn,
                          ...(p.hiddenFromRail ? s.projectPinBtnHidden : s.projectPinBtnPinned),
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleProjectHidden(p.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleProjectHidden(p.id);
                        }}
                        title={
                          p.hiddenFromRail ? t("welcome.pinToRail") : t("welcome.unpinFromRail")
                        }
                      >
                        {p.hiddenFromRail ? (
                          <PinOff size={11} strokeWidth={2} />
                        ) : (
                          <Pin size={11} strokeWidth={2} />
                        )}
                        {p.hiddenFromRail
                          ? t("welcome.notPinnedToRail")
                          : t("welcome.pinnedToRail")}
                      </span>

                      <button
                        type="button"
                        style={{
                          ...s.projectIconBtn,
                          opacity: actionOpacity,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingProject(p);
                        }}
                        title={t("project.rename")}
                        aria-label={t("project.rename")}
                      >
                        <Edit3 size={14} strokeWidth={1.8} />
                      </button>

                      <button
                        type="button"
                        style={{
                          ...s.projectIconBtn,
                          color: "var(--text-muted)",
                          opacity: actionOpacity,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(p.id);
                        }}
                        title={t("welcome.deleteProject")}
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
