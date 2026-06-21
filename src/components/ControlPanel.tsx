import { useState } from 'react';
import { Settings, ChevronLeft, ChevronRight, Waves } from 'lucide-react';
import EnvironmentGroup from './EnvironmentGroup';
import ShipGroup from './ShipGroup';
import RenderGroup from './RenderGroup';
import { cn } from '@/lib/utils';

export default function ControlPanel() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        'fixed top-0 right-0 h-full z-50 transition-all duration-300 ease-in-out',
        collapsed ? 'w-10' : 'w-[320px]'
      )}
    >
      <div className={cn('h-full glass-panel flex flex-col overflow-hidden')}>
        <div className="flex items-center justify-between p-3 border-b border-ocean-foam/10 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Waves size={18} className="text-ocean-accent" />
              <span className="hud-title text-base">海洋渲染控制面板</span>
            </div>
          )}
          {collapsed && (
            <Settings size={16} className="text-ocean-accent mx-auto" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-ocean-foam/10 text-ocean-foam/60 hover:text-ocean-foam transition-colors shrink-0"
          >
            {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
        {!collapsed && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <EnvironmentGroup />
            <ShipGroup />
            <RenderGroup />
          </div>
        )}
      </div>
    </div>
  );
}
