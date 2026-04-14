import { useState } from 'react';
import type { ChildProfile } from '@/types/calendar';
import { USER_COLORS } from '@/types/calendar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, X, Check, Baby } from 'lucide-react';

interface ChildProfileManagerProps {
  childProfiles: ChildProfile[];
  onAdd: (name: string, color: number) => Promise<any>;
  onUpdate: (id: string, updates: Partial<Pick<ChildProfile, 'displayName' | 'preferredColor'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose?: () => void;
}

export function ChildProfileManager({ childProfiles, onAdd, onUpdate, onDelete, onClose }: ChildProfileManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await onAdd(newName.trim(), newColor);
    setNewName('');
    setNewColor(0);
    setShowAdd(false);
  };

  const handleStartEdit = (cp: ChildProfile) => {
    setEditingId(cp.id);
    setEditName(cp.displayName);
    setEditColor(cp.preferredColor);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await onUpdate(editingId, { displayName: editName.trim(), preferredColor: editColor });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete === id) {
      await onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Baby className="w-4 h-4 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Child Profiles
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        )}
      </div>

      {childProfiles.map(cp => (
        <div key={cp.id} className="flex items-center gap-2 p-2 rounded-lg bg-foreground/[0.03] border border-foreground/5 group">
          {editingId === cp.id ? (
            <>
              <div className="flex gap-1">
                {USER_COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setEditColor(i)}
                    className={`size-5 rounded-full transition-all ${editColor === i ? 'ring-2 ring-offset-1 ring-foreground/30 scale-110' : 'opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="h-7 text-xs flex-1 border-foreground/10 bg-background/50"
                onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
              />
              <button onClick={handleSaveEdit} className="size-6 rounded flex items-center justify-center hover:bg-foreground/10">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditingId(null)} className="size-6 rounded flex items-center justify-center hover:bg-foreground/10">
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              <span
                className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-background shrink-0"
                style={{ backgroundColor: USER_COLORS[cp.preferredColor % USER_COLORS.length] }}
              >
                {cp.displayName[0].toUpperCase()}
              </span>
              <span className="text-xs font-medium flex-1 truncate">{cp.displayName}</span>
              <button
                onClick={() => handleStartEdit(cp)}
                className="size-6 rounded flex items-center justify-center hover:bg-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </button>
              <button
                onClick={() => handleDelete(cp.id)}
                className={`size-6 rounded flex items-center justify-center transition-colors ${
                  confirmDelete === cp.id ? 'bg-destructive/20' : 'hover:bg-destructive/10'
                }`}
              >
                <Trash2 className={`w-3 h-3 ${confirmDelete === cp.id ? 'text-destructive' : 'text-muted-foreground'}`} />
              </button>
            </>
          )}
        </div>
      ))}

      {showAdd && (
        <div className="p-2 rounded-lg border border-foreground/10 bg-background/50 space-y-2">
          <div className="flex gap-1">
            {USER_COLORS.map((c, i) => (
              <button
                key={i}
                onClick={() => setNewColor(i)}
                className={`size-5 rounded-full transition-all ${newColor === i ? 'ring-2 ring-offset-1 ring-foreground/30 scale-110' : 'opacity-60 hover:opacity-100'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Child's name..."
              className="h-8 text-xs flex-1 border-foreground/10 bg-background/50"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} size="sm" disabled={!newName.trim()} className="h-8 text-xs bg-foreground text-background hover:bg-foreground/90">
              Add
            </Button>
            <Button onClick={() => { setShowAdd(false); setNewName(''); }} size="sm" variant="outline" className="h-8 text-xs border-foreground/10">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {childProfiles.length === 0 && !showAdd && (
        <p className="text-[11px] text-muted-foreground/60">
          No child profiles yet. Add one to assign events to family members who don't have their own login.
        </p>
      )}
    </div>
  );
}
