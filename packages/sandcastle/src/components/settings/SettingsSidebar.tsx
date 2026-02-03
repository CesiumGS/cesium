import type { SettingsCategory } from "./SettingsPanel";

interface SettingsSidebarProps {
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
}

interface SidebarItemProps {
  icon: string;
  label: string;
  category: SettingsCategory;
  active: boolean;
  onClick: () => void;
}

function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      className={`sidebar-item ${active ? "active" : ""}`}
      onClick={onClick}
      aria-label={`${label} settings`}
      aria-current={active ? "page" : undefined}
    >
      <span className="sidebar-item-icon">{icon}</span>
      <span className="sidebar-item-label">{label}</span>
    </button>
  );
}

export function SettingsSidebar({
  activeCategory,
  onCategoryChange,
}: SettingsSidebarProps) {
  return (
    <nav
      className="settings-sidebar"
      role="navigation"
      aria-label="Settings categories"
    >
      <SidebarItem
        icon="⚙️"
        label="General"
        category="general"
        active={activeCategory === "general"}
        onClick={() => onCategoryChange("general")}
      />
      <SidebarItem
        icon="🤖"
        label="AI Models"
        category="models"
        active={activeCategory === "models"}
        onClick={() => onCategoryChange("models")}
      />
      <SidebarItem
        icon="✨"
        label="Features"
        category="features"
        active={activeCategory === "features"}
        onClick={() => onCategoryChange("features")}
      />
      <SidebarItem
        icon="🔧"
        label="Advanced"
        category="advanced"
        active={activeCategory === "advanced"}
        onClick={() => onCategoryChange("advanced")}
      />
    </nav>
  );
}
