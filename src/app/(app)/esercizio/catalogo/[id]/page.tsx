import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEsercizio } from "@/modules/esercizio/queries";
import { muscoliDisegnabili, nomeAttrezzo } from "@/modules/esercizio/types";
import { MappaMuscolare } from "@/modules/esercizio/components/MappaMuscolare";
import { Card, CardTitle } from "@/core/components/ui";

export default async function EsercizioDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const esercizio = await getEsercizio(id);
  if (!esercizio) notFound();

  const { primari, secondari } = muscoliDisegnabili(esercizio);
  const attrezzi = esercizio.attrezzi.map(nomeAttrezzo);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/esercizio/catalogo"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Esercizi
        </Link>
        <h1 className="mt-1 text-2xl font-semibold capitalize">{esercizio.nome}</h1>
        {attrezzi.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {attrezzi.join(", ")}
          </p>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Muscoli coinvolti</CardTitle>
          <div className="mt-3">
            <MappaMuscolare primari={primari} secondari={secondari} />
          </div>
        </Card>

        {esercizio.gif_url && (
          <Card>
            <CardTitle>Esecuzione</CardTitle>
            {/*
              La GIF passa dal nostro dominio (/api/esercizio-gif): la CSP
              consente immagini solo da "self", e cosi' viene scaricata una
              volta sola e poi servita dalla cache su KV.
              Niente <Image> di Next: e' gia' dimensionata e animata, e
              l'ottimizzatore non tratta le GIF animate.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/esercizio-gif/${esercizio.id}`}
              alt={`Dimostrazione dell'esercizio ${esercizio.nome}`}
              width={360}
              height={360}
              className="mx-auto mt-3 h-auto w-full max-w-[360px] rounded-lg bg-muted"
            />
          </Card>
        )}
      </div>

      {esercizio.istruzioni.length > 0 && (
        <Card>
          <CardTitle>Come si esegue</CardTitle>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            {esercizio.istruzioni.map((passo, i) => (
              <li key={i}>{passo.replace(/^Step:\d+\s*/i, "")}</li>
            ))}
          </ol>
        </Card>
      )}

      {esercizio.note && (
        <Card>
          <CardTitle>Note</CardTitle>
          <p className="mt-2 whitespace-pre-wrap text-sm">{esercizio.note}</p>
        </Card>
      )}

      {esercizio.fonte === "catalogo" && (
        <p className="text-xs text-muted-foreground">
          Scheda dal catalogo{" "}
          <a
            href="https://github.com/bootstrapping-lab/exercisedb-api"
            className="underline"
            rel="noreferrer"
            target="_blank"
          >
            ExerciseDB
          </a>
          . Figura muscolare da{" "}
          <a
            href="https://github.com/lahaxearnaud/body-highlighter"
            className="underline"
            rel="noreferrer"
            target="_blank"
          >
            body-highlighter
          </a>{" "}
          (MIT).
        </p>
      )}
    </div>
  );
}
