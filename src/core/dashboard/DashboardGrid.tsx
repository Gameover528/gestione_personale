"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getWidget } from "@/core/modules/registry";
import type { DashboardWidgetDef } from "@/core/modules/types";
import { getDashboardLayout, saveDashboardLayout } from "./preferences";
import { Anteprima } from "./Anteprima";
import { Card, CardTitle } from "@/core/components/ui";
import {
  GripVertical,
  X,
  Plus,
  Settings2,
  Check,
  Pin,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

function spanClass(span?: 1 | 2 | 3) {
  if (span === 3) return "lg:col-span-3";
  if (span === 2) return "lg:col-span-2";
  return "lg:col-span-1";
}

export function DashboardGrid({
  macroAreaId,
  widgets,
}: {
  macroAreaId: string;
  widgets: DashboardWidgetDef[];
}) {
  const [order, setOrder] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pannello, setPannello] = useState(false);

  /**
   * Un sensore per ogni modo di puntare, invece del PointerSensor unico.
   *
   * Il PointerSensor tratta dito e mouse allo stesso modo: con il vincolo di
   * distanza, il primo mezzo centimetro di scorrimento della pagina faceva
   * partire un trascinamento. Separandoli, il mouse continua a trascinare
   * subito dalla maniglia, mentre il dito deve restare fermo un quarto di
   * secondo: se si muove prima (cioe' se stai scorrendo) non succede niente.
   */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /**
   * I widget essenziali dell'area stanno sempre in testa e non entrano
   * nell'ordinamento salvato: non si spostano e non si rimuovono.
   */
  const fissi = useMemo(() => widgets.filter((w) => w.fisso), [widgets]);
  const opzionali = useMemo(() => widgets.filter((w) => !w.fisso), [widgets]);

  useEffect(() => {
    getDashboardLayout(macroAreaId).then((saved) => {
      const base = saved ?? opzionali.map((w) => w.id);
      // Scarta gli id non più esistenti (widget rimossi o uniti) e quelli
      // diventati fissi, che ora vengono mostrati a parte.
      setOrder(base.filter((id) => getWidget(id) && !getWidget(id)!.fisso));
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macroAreaId]);

  const attivi = useMemo(() => new Set(order), [order]);

  function handleDragStart() {
    // Un colpetto di vibrazione dice che il riquadro si e' staccato ed e'
    // pronto a essere spostato: senza, la pressione prolungata non da' segno
    // di aver funzionato finche' non si muove il dito. (Android; iOS ignora.)
    navigator.vibrate?.(10);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    // Alzando il dito il browser genera comunque un clic sull'elemento sotto:
    // senza fermarlo, il rilascio aprirebbe il collegamento del riquadro
    // appena spostato. Si blocca il primo clic e basta, e solo dopo un
    // trascinamento col dito: col mouse quel clic non esiste.
    if (typeof TouchEvent !== "undefined" && event.activatorEvent instanceof TouchEvent) {
      const blocca = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };
      document.addEventListener("click", blocca, { capture: true, once: true });
      setTimeout(() => document.removeEventListener("click", blocca, true), 350);
    }

    if (over && active.id !== over.id) {
      const next = (() => {
        const oldIndex = order.indexOf(active.id as string);
        const newIndex = order.indexOf(over.id as string);
        return arrayMove(order, oldIndex, newIndex);
      })();
      persist(next);
    }
  }

  async function persist(next: string[]) {
    setOrder(next);
    setSaving(true);
    try {
      await saveDashboardLayout(macroAreaId, next);
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

  if (!loaded)
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;

  return (
    <div>
      {/*
        Il tocco prolungato non si vede: senza una riga che lo dica, resta una
        funzione che conosce solo chi l'ha scritta. Solo su telefono, dove
        serve: al mouse si trascina dalla maniglia in Personalizza.
      */}
      {order.length > 1 && (
        <p className="mb-3 text-xs text-muted-foreground lg:hidden">
          Tieni premuto un riquadro per spostarlo.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        {saving && <span className="text-xs text-muted-foreground">Salvato</span>}
        <button
          onClick={() => setPannello(true)}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          Aggiungi widget
        </button>
        <button
          onClick={() => setEditMode((v) => !v)}
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

      <div className="space-y-4">
        {/* Widget fissi: fuori dall'ordinamento, sempre per primi */}
        {fissi.length > 0 && (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
            {fissi.map((w) => {
              const Componente = w.component;
              return (
                <div key={w.id} className={spanClass(w.defaultSpan)}>
                  <Card className="h-full">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <CardTitle>{w.title}</CardTitle>
                      {editMode && (
                        <span
                          title="Widget sempre presente in questa sezione"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                        >
                          <Pin className="h-3.5 w-3.5" />
                          fisso
                        </span>
                      )}
                    </div>
                    <Componente />
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        {order.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nessun altro widget attivo. Usa <strong>Aggiungi widget</strong> per
            scegliere cosa mostrare qui.
          </p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order} strategy={rectSortingStrategy}>
            {/*
              items-start: ogni scheda e' alta quanto il suo contenuto. Con
              l'allineamento predefinito la riga prende l'altezza della scheda
              piu' alta e le altre vengono stirate, quindi un riquadro con due
              righe di testo diventava una scatola mezza vuota alta come un
              grafico.
            */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
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
      </div>

      {pannello && (
        <PannelloWidget
          fissi={fissi}
          opzionali={opzionali}
          attivi={attivi}
          onAggiungi={addWidget}
          onRimuovi={removeWidget}
          onChiudi={() => setPannello(false)}
        />
      )}
    </div>
  );
}

/**
 * Pannello di scelta dei widget: mostra ogni widget disponibile con una
 * descrizione e un'anteprima con dati di esempio, così si capisce cosa si sta
 * aggiungendo prima di aggiungerlo.
 */
function PannelloWidget({
  fissi,
  opzionali,
  attivi,
  onAggiungi,
  onRimuovi,
  onChiudi,
}: {
  fissi: DashboardWidgetDef[];
  opzionali: DashboardWidgetDef[];
  attivi: Set<string>;
  onAggiungi: (id: string) => void;
  onRimuovi: (id: string) => void;
  onChiudi: () => void;
}) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onChiudi();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onChiudi]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <button
        aria-label="Chiudi"
        onClick={onChiudi}
        className="fixed inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Aggiungi widget"
        className="relative my-4 w-full max-w-3xl rounded-lg border bg-card p-4 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
              <LayoutGrid className="h-5 w-5" />
              Widget disponibili
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Le anteprime usano dati di esempio: servono a far vedere che
              aspetto avrà il riquadro.
            </p>
          </div>
          <button
            onClick={onChiudi}
            aria-label="Chiudi"
            className="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {opzionali.map((w) => {
            const presente = attivi.has(w.id);
            return (
              <div key={w.id} className="flex flex-col rounded-lg border p-3">
                <p className="text-sm font-medium">{w.title}</p>
                {w.descrizione && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {w.descrizione}
                  </p>
                )}
                <div className="mt-3">
                  <Anteprima spec={w.anteprima} />
                </div>
                <div className="mt-3 flex justify-end">
                  {presente ? (
                    <button
                      onClick={() => onRimuovi(w.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-accent"
                    >
                      <X className="h-3.5 w-3.5" />
                      Rimuovi
                    </button>
                  ) : (
                    <button
                      onClick={() => onAggiungi(w.id)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Aggiungi
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {fissi.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <p className="inline-flex items-center gap-1.5 text-sm font-medium">
              <Pin className="h-4 w-4 text-muted-foreground" />
              Sempre presenti
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sono l&apos;informazione principale della sezione: restano in
              testa alla dashboard e non si possono rimuovere.
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {fissi.map((w) => (
                <li key={w.id} className="text-muted-foreground">
                  · {w.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
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
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // dnd-kit tipa i suoi ascoltatori come `Function` generiche: qui serve la
  // firma di React per l'evento di tocco.
  const iniziaTocco = listeners?.onTouchStart as
    | React.TouchEventHandler<HTMLDivElement>
    | undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      /*
        Il tocco prolungato aggancia il riquadro da qualunque punto, come sulla
        schermata di un telefono: sul dito non c'e' una maniglia da centrare.
        Al mouse restano le sue regole (solo dalla maniglia, in Personalizza),
        perche' li' il puntatore serve anche a cliccare dentro il widget.
      */
      onTouchStart={iniziaTocco}
      onContextMenu={(e) => {
        // Su Android la pressione prolungata aprirebbe anche il menu del
        // sistema sopra il riquadro che si sta spostando.
        if (isDragging) e.preventDefault();
      }}
      className={cn(
        spanClass(widget.defaultSpan),
        "touch-manipulation select-none",
        isDragging && "z-10"
      )}
    >
      <Card
        className={cn(
          "h-full transition-shadow",
          editMode && "ring-1 ring-border",
          // Sollevato: si vede quale riquadro si sta spostando.
          isDragging && "scale-[1.02] shadow-xl ring-2 ring-primary"
        )}
      >
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
