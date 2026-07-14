"use client";

import { use, useEffect, useState } from "react";
import { getBolletta } from "@/modules/bollette/queries";
import { type Bolletta } from "@/modules/bollette/types";
import { BollettaForm } from "@/modules/bollette/components/BollettaForm";
import { PageHeader } from "@/core/components/ui";

export default function ModificaBollettaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [bolletta, setBolletta] = useState<Bolletta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBolletta(id)
      .then(setBolletta)
      .catch(() => setError("Bolletta non trovata"));
  }, [id]);

  return (
    <div>
      <PageHeader title="Modifica bolletta" />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : bolletta ? (
        <BollettaForm initial={bolletta} />
      ) : (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      )}
    </div>
  );
}
