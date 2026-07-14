"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { allWidgets, getWidget } from "@/core/modules/registry";
import { getDashboardLayout, saveDashboardLayout } from "./preferences";
import { Card, CardTitle } from "@/core/components/ui";
import { GripVertical, X, Plus, Settings2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function spanClass(span?: 1 | 2 | 3) {
  if (span === 3) return "lg:col-span-3";
  if (span === 2) return "lg:col-span-2";
  return "lg:col-span-1";
}

export function DashboardGrid() {
  const [order, setOrder] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    getDashboardLayout().then((saved) => {
      const valid = (saved ?? allWidgets.map((w) => w.id)).filter((id) =>
        getWidget(id)
      );
      setOrder(valid);
      setLoaded(true);
    });
  }, []);

  const hidden = useMemo(
    () => allWidgets.filter((w) => !order.includes(w.id)),
    [order]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  async function persist(next: string[]) {
    setOrder(next);
    setSaving(true);
    try {
      await saveDashboardLayout(next);
    } finally {
      setSaving(false);
    }
  }

  function removeWidget(id: string) {
    persist(order.filter((x) => x !== id));
  }

  function addWidget(id: string) {
    persist([...order, id]);
  }

  async function toggleEdit() {
    if (editMode) {
      await saveDashboardLayout(order);
    }
    setEditMode(!editMode);
  }

  if (!loaded)
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-end gap-2">
        {saving && (
          <span className="text-xs text-muted-foreground">Salvato</span>
        )}
        <button
          onClick={toggleEdit}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
            editMode
              ? "bg-primary text-primary-foreground"
              : "border hover:bg-accent"
          )}
        >
          {editMode ? (
            <>
              <Check className="h-4 w-4" /> Fine
            </>
          ) : (
            <>
              <Settings2 className="h-4 w-4" /> Personalizza
            </>
          )}
        </button>
      </div>

      {order.length === 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          Nessun widget attivo. {editMode ? "Aggiungine uno qui sotto." : "Clicca Personalizza per aggiungerli."}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {order.map((id) => {
              const widget = getWidget(id);
              if (!widget) return null;
              return (
                <SortableWidget
                  key={id}
                  id={id}
                  editMode={editMode}
                  onRemove={() => removeWidget(id)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {editMode && hidden.length > 0 && (
        <div className="mt-6 rounded-lg border border-dashed p-4">
          <p className="mb-3 text-sm font-medium">Aggiungi widget</p>
          <div className="flex flex-wrap gap-2">
            {hidden.map((w) => (
              <button
                key={w.id}
                onClick={() => addWidget(w.id)}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition hover:bg-accent"
              >
                <Plus className="h-3.5 w-3.5" />
                {w.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SortableWidget({
  id,
  editMode,
  onRemove,
}: {
  id: string;
  editMode: boolean;
  onRemove: () => void;
}) {
  const widget = getWidget(id)!;
  const Component = widget.component;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(spanClass(widget.defaultSpan), isDragging && "z-10 opacity-70")}
    >
      <Card className={cn("h-full", editMode && "ring-1 ring-border")}>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>{widget.title}</CardTitle>
          {editMode && (
            <div className="flex items-center gap-1">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing"
                title="Trascina per riordinare"
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <button
                onClick={onRemove}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                title="Rimuovi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <Component />
      </Card>
    </div>
  );
}
