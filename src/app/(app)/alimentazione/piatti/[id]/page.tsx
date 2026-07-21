"use client";

import { use, useEffect, useState } from "react";
import { getPiatto } from "@/modules/alimentazione/queries";
import { type PiattoConIngredienti } from "@/modules/alimentazione/types";
import { PiattoEditor } from "@/modules/alimentazione/components/PiattoEditor";
import { PageHeader } from "@/core/components/ui";

export default function ModificaPiattoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [piatto, setPiatto] = useState<PiattoConIngredienti | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPiatto(id)
      .then(setPiatto)
      .catch(() => setError("Piatto non trovato"));
  }, [id]);

  return (
    <div>
      <PageHeader title="Modifica piatto" />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : piatto ? (
        <PiattoEditor initial={piatto} />
      ) : (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      )}
    </div>
  );
}
