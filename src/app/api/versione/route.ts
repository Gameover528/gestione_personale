import { NextResponse } from "next/server";

/**
 * Quale build è pubblicata adesso. La legge AvvisoNuovaVersione per capire se
 * il codice che sta girando sul telefono è rimasto indietro.
 *
 * Il valore è scritto nel codice al momento della compilazione (next.config),
 * quindi questa risposta non tocca il database e non costa quasi niente.
 */
export function GET() {
  return NextResponse.json(
    { build: process.env.ID_BUILD ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export const dynamic = "force-dynamic";
