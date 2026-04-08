import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export interface SidebarItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  separator?: boolean;
}

interface FunctionalSidebarProps {
  sectionLabel: string;
  items: SidebarItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export function FunctionalSidebar({ sectionLabel, items, activeKey, onSelect }: FunctionalSidebarProps) {
  const isMobile = useIsMobile();

  // Mobile: bottom navigation bar
  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0f1623] border-t border-white/10 h-14 flex items-center justify-around px-2">
        {items.filter(i => !i.separator).map((item) => {
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-md transition-colors",
                isActive ? "text-[#3b82f6]" : "text-white/50"
              )}
            >
              <span className="w-5 h-5">{item.icon}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  // Desktop: vertical sidebar
  return (
    <aside className="w-[200px] flex-shrink-0 bg-[#0f1623] min-h-full">
      <div className="sticky top-14 p-3 space-y-1">
        <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white/40 px-2.5 pb-2">
          {sectionLabel}
        </p>
        {items.map((item) => {
          if (item.separator) {
            return <div key={item.key} className="my-2 border-t border-white/10" />;
          }
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all text-left",
                isActive
                  ? "bg-white/10 border-l-2 border-[#3b82f6] text-white"
                  : "border-l-2 border-transparent text-white/60 hover:bg-white/[0.06] hover:text-white/80"
              )}
            >
              <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.count !== undefined && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.15] text-white/70 leading-none">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
