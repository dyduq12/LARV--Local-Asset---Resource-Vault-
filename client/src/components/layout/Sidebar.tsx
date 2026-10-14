import React from 'react';
import { Activity, FolderArchive, Terminal, ShieldCheck, HardDrive } from 'lucide-react';

export type NavigationTab = 'telemetry' | 'vault' | 'pipelines';

export interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  assetCount?: number;
  runningPipelinesCount?: number;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeVariant?: 'default' | 'accent' | 'pulse';
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  assetCount = 0,
  runningPipelinesCount = 0,
}) => {
  const navItems: NavItem[] = [
    {
      id: 'telemetry',
      label: 'Telemetria & Hardware',
      description: 'Métricas de CPU, RAM e Event Loop',
      icon: Activity,
    },
    {
      id: 'vault',
      label: 'Cofre de Recursos',
      description: 'Snippets, configs e tokens seguros',
      icon: FolderArchive,
      badge: assetCount,
      badgeVariant: 'default',
    },
    {
      id: 'pipelines',
      label: 'Automações & Scripts',
      description: 'Auditorias locais e backups em stream',
      icon: Terminal,
      badge: runningPipelinesCount > 0 ? `${runningPipelinesCount} rodando` : undefined,
      badgeVariant: runningPipelinesCount > 0 ? 'pulse' : undefined,
    },
  ];

  return (
    <aside className="w-72 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between select-none">
      <div className="p-4 space-y-6">
        <div className="px-3 py-2">
          <p className="text-[10px] font-mono tracking-widest text-zinc-300 uppercase font-semibold">
            Navegação Operacional
          </p>
        </div>

        <nav className="space-y-1.5" aria-label="Menu Principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full text-left px-3.5 py-3 rounded-lg transition-all duration-150 flex items-start gap-3 group relative ${
                  isActive
                    ? 'bg-zinc-900/90 text-zinc-100 border border-zinc-700/60 shadow-inner'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border border-transparent'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-400 rounded-r" />
                )}

                <div
                  className={`p-1.5 rounded-md mt-0.5 transition-colors ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : 'bg-zinc-800/50 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium tracking-tight truncate">
                      {item.label}
                    </span>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                          item.badgeVariant === 'pulse'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-300 truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/60 space-y-3">
        <div className="flex items-center gap-2 px-2 text-xs text-zinc-300 font-mono">
          <HardDrive className="w-3.5 h-3.5 text-zinc-300" />
          <span>Armazenamento: SQLite Local</span>
        </div>

        <div className="flex items-center justify-between px-2 pt-2 border-t border-zinc-900 text-[11px] font-mono text-zinc-300">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Local-First Vault</span>
          </div>
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
