"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { listPasti, deletePasto, updatePasto, getObiettivi } from "../queries";
import {
  PASTI,
  NUTRIENTI,
  type PastoDiario,
  type Pasto,
  type Obiettivo,
  type Nutriente,
  valoriPorzione,
  sommaValori,
} from "../types";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(nutriente: Nutriente, v: number) {
  return nutriente === "kcal" ? String(Math.round(v)) : v.toFixed(1);
}

export function DiarioGiorno() {
  const oggi = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(oggi);
  const [pasti, setPasti] = useState<PastoDiario[] | null>(null);
  const [obiettivi, setObiettivi] = useState<Obiettivo[]>([]);

  const load = useCallback(() => {
    listPasti(data).then(setPasti);
  }, [data]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    getObiettivi().then(setObiettivi);
  }, []);

  const totali = sommaValori((pasti ?? []).map(valoriPorzione));

  async function handleDelete(id: string) {
    await deletePasto(id);
    load();
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editG, setEditG] = useState("");
  const [editPasto, setEditPasto] = useState<Pasto>("pranzo");

  function startEdit(r: PastoDiario) {
    setEditingId(r.id);
    setEditG(String(r.quantita_g));
    setEditPasto(r.pasto);
  }
  async function saveEdit() {
    if (!editingId) return;
    await updatePasto(editingId, {
      quantita_g: parseFloat(editG || "0"),
      pasto: editPasto,
    });
    setEditingId(null);
    load();
  }

  function obiettivo(n: Nutriente) {
    return obiettivi.find((o) => o.nutriente === n);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-2">
          <Link
            href="/alimentazione/piatti"
            className="rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Piatti
          </Link>
          <Link
            href="/alimentazione/obiettivi"
            className="rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Obiettivi
          </Link>
          <Link
            href={`/alimentazione/aggiungi?data=${data}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Aggiungi
          </Link>
        </div>
      </div>

      {/* Totali del giorno vs obiettivi */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {NUTRIENTI.map((nu) => {
          const tot = totali[nu.value];
          const ob = obiettivo(nu.value);
          let stato: "ok" | "over" | "under" | "none" = "none";
          if (ob && ob.valore > 0) {
            if (ob.tipo === "max") stato = tot <= ob.valore ? "ok" : "over";
            else stato = tot >= ob.valore ? "ok" : "under";
          }
          return (
            <div
              key={nu.value}
              className={cn(
                "rounded-lg border p-3",
                stato === "over" && "border-destructive/40 bg-destructive/5",
                stato === "ok" && "border-success/40 bg-success/5"
              )}
            >
              <p className="text-xs text-muted-foreground">{nu.label}</p>
              <p className="text-lg font-semibold">
                {fmt(nu.value, tot)}
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}
                  {nu.unita}
                </span>
              </p>
              {ob && ob.valore > 0 && (
                <p className="text-xs text-muted-foreground">
                  {ob.tipo === "max" ? "max" : "min"} {fmt(nu.value, ob.valore)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Pasti raggruppati */}
      {pasti === null ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : pasti.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nessun alimento registrato per questo giorno.
          </p>
          <Link
            href={`/alimentazione/aggiungi?data=${data}`}
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            + Aggiungi il primo
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {PASTI.map((p) => {
            const righe = pasti.filter((x) => x.pasto === p.value);
            if (righe.length === 0) return null;
            const totPasto = sommaValori(righe.map(valoriPorzione));
            return (
              <div key={p.value} className="rounded-lg border">
                <div className="flex items-center justify-between border-b bg-muted px-4 py-2">
                  <span className="text-sm font-semibold">{p.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(totPasto.kcal)} kcal
                  </span>
                </div>
                <ul>
                  {righe.map((r) => {
                    const v = valoriPorzione(r);
                    const inEdit = editingId === r.id;
                    return (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-3 border-t px-4 py-2 text-sm first:border-t-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {r.nome_alimento}
                            {r.marca ? (
                              <span className="text-muted-foreground">
                                {" "}
                                · {r.marca}
                              </span>
                            ) : null}
                          </p>
                          {inEdit ? (
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={editG}
                                onChange={(e) => setEditG(e.target.value)}
                                className="w-24 rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
                              />
                              <span className="text-xs text-muted-foreground">g</span>
                              <select
                                value={editPasto}
                                onChange={(e) => setEditPasto(e.target.value as Pasto)}
                                className="rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
                              >
                                {PASTI.map((pp) => (
                                  <option key={pp.value} value={pp.value}>
                                    {pp.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {r.quantita_g} g · {Math.round(v.kcal)} kcal · P{" "}
                              {v.proteine.toFixed(1)} · C {v.carboidrati.toFixed(1)}{" "}
                              · G {v.grassi.toFixed(1)}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {inEdit ? (
                            <>
                              <button
                                title="Salva"
                                onClick={saveEdit}
                                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-success"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                title="Annulla"
                                onClick={() => setEditingId(null)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                title="Modifica"
                                onClick={() => startEdit(r)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                title="Elimina"
                                onClick={() => handleDelete(r.id)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
