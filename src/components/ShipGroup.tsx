import { useState } from 'react';
import { Ship, Plus, Trash2, ChevronDown, ChevronUp, Waves } from 'lucide-react';
import Slider from './Slider';
import { useAppStore, type Ship as ShipType } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const MAX_SHIPS = 3;

function ShipItem({ ship, index }: { ship: ShipType; index: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const removeShip = useAppStore((state) => state.removeShip);
  const updateShip = useAppStore((state) => state.updateShip);

  return (
    <div className={cn('glass-panel-light overflow-hidden')}>
      <div className="flex items-center justify-between">
        <button
          className="flex flex-1 items-center justify-between p-2.5 hover:bg-ocean-foam/5 transition-colors"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            <Ship size={14} className="text-ocean-accent" />
            <span className="hud-title text-xs">Ship {index + 1}</span>
          </div>
          {collapsed ? (
            <ChevronDown size={14} className="text-ocean-foam/60" />
          ) : (
            <ChevronUp size={14} className="text-ocean-foam/60" />
          )}
        </button>
        <button
          onClick={() => removeShip(ship.id)}
          className="px-2 mr-1 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="删除船只"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {!collapsed && (
        <div className="px-2.5 pb-2.5 space-y-3">
          <Slider
            label="Position X"
            min={-200}
            max={200}
            step={1}
            value={ship.position.x}
            onChange={(v) => updateShip(ship.id, { position: { ...ship.position, x: v } })}
          />
          <Slider
            label="Position Z"
            min={-200}
            max={200}
            step={1}
            value={ship.position.z}
            onChange={(v) => updateShip(ship.id, { position: { ...ship.position, z: v } })}
          />
          <Slider
            label="Speed"
            min={0}
            max={20}
            step={0.5}
            value={ship.speed}
            onChange={(v) => updateShip(ship.id, { speed: v })}
            unit="m/s"
          />
          <Slider
            label="Heading"
            min={0}
            max={360}
            step={1}
            value={ship.heading}
            onChange={(v) => updateShip(ship.id, { heading: v })}
            unit="°"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves size={14} className="text-ocean-foam/60" />
              <span className="hud-label">Wake</span>
            </div>
            <button
              onClick={() => updateShip(ship.id, { wakeEnabled: !ship.wakeEnabled })}
              className={cn(
                'relative w-10 h-5 rounded-full transition-colors',
                ship.wakeEnabled ? 'bg-ocean-accent' : 'bg-ocean-foam/20'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                  ship.wakeEnabled ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShipGroup() {
  const [collapsed, setCollapsed] = useState(false);
  const ships = useAppStore((state) => state.ships);
  const addShip = useAppStore((state) => state.addShip);

  return (
    <div className={cn('glass-panel-light overflow-hidden')}>
      <button
        className="flex w-full items-center justify-between p-3 hover:bg-ocean-foam/5 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Ship size={16} className="text-ocean-accent" />
          <span className="hud-title text-sm">Ships</span>
          <span className="text-ocean-foam/40 text-xs">
            ({ships.length}/{MAX_SHIPS})
          </span>
        </div>
        {collapsed ? (
          <ChevronDown size={16} className="text-ocean-foam/60" />
        ) : (
          <ChevronUp size={16} className="text-ocean-foam/60" />
        )}
      </button>
      {!collapsed && (
        <div className="px-3 pb-3 space-y-2">
          <div className="ocean-divider" />
          {ships.length < MAX_SHIPS && (
            <button
              onClick={() => addShip()}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-dashed border-ocean-foam/20 text-ocean-foam/60 hover:border-ocean-accent/50 hover:text-ocean-accent transition-colors'
              )}
            >
              <Plus size={16} />
              <span className="hud-label">Add Ship</span>
            </button>
          )}
          <div className="space-y-2">
            {ships.map((ship, idx) => (
              <ShipItem key={ship.id} ship={ship} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
