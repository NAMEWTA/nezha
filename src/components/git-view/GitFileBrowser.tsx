import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  List,
  ListTree,
  Undo2,
} from "lucide-react";
import { useI18n } from "../../i18n";
import s from "../../styles";
import { getFileColor, getGitStatusColor, getGitStatusLabel, load, save } from "../../utils";

export type GitFileViewMode = "tree" | "list";

export const GIT_FILE_VIEW_MODE_KEY = "nezha.git.fileViewMode";
const GIT_FILE_TREE_ENTRY_LIMIT = 1000;
const TREE_NODE_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export interface GitFileEntry {
  path: string;
  status: string;
  staged?: boolean;
  additions?: number;
  deletions?: number;
}

interface GitDirectoryNode<T extends GitFileEntry> {
  kind: "directory";
  name: string;
  path: string;
  children: GitTreeNode<T>[];
  fileCount: number;
  additions: number;
  deletions: number;
}

interface GitFileNode<T extends GitFileEntry> {
  kind: "file";
  name: string;
  path: string;
  entry: T;
}

type GitTreeNode<T extends GitFileEntry> = GitDirectoryNode<T> | GitFileNode<T>;

interface GitFileBrowserProps<T extends GitFileEntry> {
  entries: T[];
  mode: GitFileViewMode;
  onFileClick?: (entry: T) => void;
  onStageToggle?: (entry: T, e: React.MouseEvent) => void;
  onDiscard?: (entry: T, e: React.MouseEvent) => void;
  showStats?: boolean;
}

function normalizeGitFileViewMode(value: unknown): GitFileViewMode {
  return value === "list" ? "list" : "tree";
}

export function useGitFileViewMode(storageKey = GIT_FILE_VIEW_MODE_KEY) {
  const [mode, setMode] = useState<GitFileViewMode>(() =>
    normalizeGitFileViewMode(load<GitFileViewMode>(storageKey, "tree")),
  );

  useEffect(() => {
    save(storageKey, mode);
  }, [mode, storageKey]);

  return [mode, setMode] as const;
}

export function GitFileViewToggle({
  mode,
  onChange,
}: {
  mode: GitFileViewMode;
  onChange: (mode: GitFileViewMode) => void;
}) {
  const { t } = useI18n();

  return (
    <div style={s.gitFileViewToggle} role="group" aria-label={t("git.fileViewMode")}>
      <GitFileViewToggleButton
        active={mode === "tree"}
        title={t("git.viewAsTree")}
        onClick={() => onChange("tree")}
      >
        <ListTree size={13} />
      </GitFileViewToggleButton>
      <GitFileViewToggleButton
        active={mode === "list"}
        title={t("git.viewAsList")}
        onClick={() => onChange("list")}
      >
        <List size={13} />
      </GitFileViewToggleButton>
    </div>
  );
}

function GitFileViewToggleButton({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      style={active ? s.gitFileViewToggleBtnActive : s.gitFileViewToggleBtnInactive}
    >
      {children}
    </button>
  );
}

export function GitFileBrowser<T extends GitFileEntry>({
  entries,
  mode,
  onFileClick,
  onStageToggle,
  onDiscard,
  showStats = false,
}: GitFileBrowserProps<T>) {
  const shouldRenderTree = mode === "tree" && entries.length <= GIT_FILE_TREE_ENTRY_LIMIT;
  const tree = useMemo(
    () => (shouldRenderTree ? buildGitFileTree(entries) : []),
    [entries, shouldRenderTree],
  );
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(() => new Set());

  const toggleDirectory = (path: string) => {
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (!shouldRenderTree) {
    return (
      <>
        {entries.map((entry) => (
          <GitFileRow
            key={fileEntryKey(entry)}
            entry={entry}
            depth={0}
            mode={mode}
            onFileClick={onFileClick}
            onStageToggle={onStageToggle}
            onDiscard={onDiscard}
            showStats={showStats}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {tree.map((node) => (
        <GitTreeNodeView
          key={node.kind === "directory" ? `dir:${node.path}` : fileEntryKey(node.entry)}
          node={node}
          depth={0}
          collapsedDirs={collapsedDirs}
          onToggleDirectory={toggleDirectory}
          onFileClick={onFileClick}
          onStageToggle={onStageToggle}
          onDiscard={onDiscard}
          showStats={showStats}
        />
      ))}
    </>
  );
}

function GitTreeNodeView<T extends GitFileEntry>({
  node,
  depth,
  collapsedDirs,
  onToggleDirectory,
  onFileClick,
  onStageToggle,
  onDiscard,
  showStats,
}: {
  node: GitTreeNode<T>;
  depth: number;
  collapsedDirs: Set<string>;
  onToggleDirectory: (path: string) => void;
  onFileClick?: (entry: T) => void;
  onStageToggle?: (entry: T, e: React.MouseEvent) => void;
  onDiscard?: (entry: T, e: React.MouseEvent) => void;
  showStats: boolean;
}) {
  if (node.kind === "file") {
    return (
      <GitFileRow
        entry={node.entry}
        depth={depth}
        mode="tree"
        onFileClick={onFileClick}
        onStageToggle={onStageToggle}
        onDiscard={onDiscard}
        showStats={showStats}
      />
    );
  }

  const expanded = !collapsedDirs.has(node.path);

  return (
    <>
      <GitDirectoryRow
        node={node}
        depth={depth}
        expanded={expanded}
        onToggle={() => onToggleDirectory(node.path)}
        showStats={showStats}
      />
      {expanded &&
        node.children.map((child) => (
          <GitTreeNodeView
            key={child.kind === "directory" ? `dir:${child.path}` : fileEntryKey(child.entry)}
            node={child}
            depth={depth + 1}
            collapsedDirs={collapsedDirs}
            onToggleDirectory={onToggleDirectory}
            onFileClick={onFileClick}
            onStageToggle={onStageToggle}
            onDiscard={onDiscard}
            showStats={showStats}
          />
        ))}
    </>
  );
}

function GitDirectoryRow<T extends GitFileEntry>({
  node,
  depth,
  expanded,
  onToggle,
  showStats,
}: {
  node: GitDirectoryNode<T>;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
  showStats: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={gitDirectoryRowStyle(depth, hovered)}
    >
      <span style={s.gitFileChevron}>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </span>
      <span style={s.gitFileFolderIcon}>
        {expanded ? <FolderOpen size={13} /> : <Folder size={13} />}
      </span>
      <span style={s.gitFileDirectoryName}>{node.name}</span>
      {showStats && (
        <span style={s.gitFileStats}>
          <span style={s.diffAddCount}>+{node.additions}</span>
          <span style={s.diffDeleteCount}>-{node.deletions}</span>
        </span>
      )}
      <span style={s.gitFileCountBadge}>{node.fileCount}</span>
    </button>
  );
}

function GitFileRow<T extends GitFileEntry>({
  entry,
  depth,
  mode,
  onFileClick,
  onStageToggle,
  onDiscard,
  showStats,
}: {
  entry: T;
  depth: number;
  mode: GitFileViewMode;
  onFileClick?: (entry: T) => void;
  onStageToggle?: (entry: T, e: React.MouseEvent) => void;
  onDiscard?: (entry: T, e: React.MouseEvent) => void;
  showStats: boolean;
}) {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(false);
  const name = fileName(entry.path);
  const dir = fileDir(entry.path);
  const color = getGitStatusColor(entry.status);
  const label = getGitStatusLabel(entry.status);
  const clickable = !!onFileClick;
  const hasActions = !!onStageToggle || !!onDiscard;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!clickable || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    onFileClick?.(entry);
  };

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onFileClick(entry) : undefined}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={gitFileRowStyle(depth, mode, clickable, hovered)}
    >
      <span style={gitFileStatusDotStyle(color)} />
      <span style={gitFileStatusLabelStyle(color)}>{label}</span>
      <File size={13} color={getFileColor(name)} style={s.gitFileIcon} aria-hidden="true" />
      <span style={s.gitFileNameWrap}>
        <span style={hovered && clickable ? s.gitFileNameHover : s.gitFileName}>{name}</span>
        {mode === "list" && dir && <span style={s.gitFileDir}>{dir}</span>}
      </span>
      {showStats && (
        <span style={s.gitFileStats}>
          <span style={s.diffAddCount}>+{entry.additions ?? 0}</span>
          <span style={s.diffDeleteCount}>-{entry.deletions ?? 0}</span>
        </span>
      )}
      {hasActions && (
        <span style={hovered ? s.gitFileActionsVisible : s.gitFileActions}>
          {onDiscard && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDiscard(entry, e);
              }}
              title={t("git.discard")}
              style={s.gitChangesRowDiscardBtn}
            >
              <Undo2 size={11} />
            </button>
          )}
          {onStageToggle && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStageToggle(entry, e);
              }}
              title={entry.staged ? t("git.unstage") : t("git.stage")}
              style={s.gitFileStageBtn}
            >
              {entry.staged ? "−" : "+"}
            </button>
          )}
        </span>
      )}
    </div>
  );
}

function gitDirectoryRowStyle(depth: number, hovered: boolean): React.CSSProperties {
  return {
    ...s.gitFileDirectoryRow,
    paddingLeft: 8 + depth * 14,
    background: hovered ? "var(--bg-hover)" : "transparent",
  };
}

function gitFileRowStyle(
  depth: number,
  mode: GitFileViewMode,
  clickable: boolean,
  hovered: boolean,
): React.CSSProperties {
  return {
    ...s.gitFileRow,
    paddingLeft: mode === "tree" ? 28 + depth * 14 : 14,
    cursor: clickable ? "pointer" : "default",
    background: hovered ? "var(--bg-hover)" : "transparent",
  };
}

function gitFileStatusDotStyle(color: string): React.CSSProperties {
  return {
    ...s.gitFileStatusDot,
    background: color,
  };
}

function gitFileStatusLabelStyle(color: string): React.CSSProperties {
  return {
    ...s.gitFileStatusLabel,
    color,
  };
}

function buildGitFileTree<T extends GitFileEntry>(entries: T[]): GitTreeNode<T>[] {
  const root = createDirectoryNode<T>("", "");
  const directories = new Map<string, GitDirectoryNode<T>>([["", root]]);

  for (const entry of entries) {
    const parts = entry.path.split("/");
    if (parts.length === 0) continue;

    let parent = root;
    let currentPath = "";

    for (let index = 0; index < parts.length - 1; index += 1) {
      const part = parts[index];
      if (!part) continue;

      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let directory = directories.get(currentPath);

      if (!directory) {
        directory = createDirectoryNode<T>(part, currentPath);
        directories.set(currentPath, directory);
        parent.children.push(directory);
      }

      parent = directory;
    }

    parent.children.push({
      kind: "file",
      name: parts[parts.length - 1],
      path: entry.path,
      entry,
    });
  }

  hydrateDirectory(root);
  return root.children;
}

function createDirectoryNode<T extends GitFileEntry>(
  name: string,
  path: string,
): GitDirectoryNode<T> {
  return {
    kind: "directory",
    name,
    path,
    children: [],
    fileCount: 0,
    additions: 0,
    deletions: 0,
  };
}

function hydrateDirectory<T extends GitFileEntry>(directory: GitDirectoryNode<T>) {
  directory.fileCount = 0;
  directory.additions = 0;
  directory.deletions = 0;

  for (const child of directory.children) {
    if (child.kind === "directory") {
      hydrateDirectory(child);
      directory.fileCount += child.fileCount;
      directory.additions += child.additions;
      directory.deletions += child.deletions;
    } else {
      directory.fileCount += 1;
      directory.additions += child.entry.additions ?? 0;
      directory.deletions += child.entry.deletions ?? 0;
    }
  }

  directory.children.sort(compareTreeNodes);
}

function compareTreeNodes<T extends GitFileEntry>(a: GitTreeNode<T>, b: GitTreeNode<T>) {
  if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
  return TREE_NODE_COLLATOR.compare(a.name, b.name);
}

function fileEntryKey(entry: GitFileEntry): string {
  return `${entry.staged ? "staged" : "unstaged"}:${entry.status}:${entry.path}`;
}

function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

function fileDir(path: string): string {
  const parts = path.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
}
