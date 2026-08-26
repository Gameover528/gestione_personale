import { NextResponse } from "next/server";
import { getAllegatiKv } from "@/lib/cf";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { path: segments } = await params;
  const path = segments.join("/");

  // Ogni allegato è salvato sotto "<user_id>/...": si può accedere solo ai propri.
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { value, metadata } = await getAllegatiKv().getWithMetadata<{
    contentType?: string;
  }>(path, "arrayBuffer");

  if (!value) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  return new Response(value, {
    headers: {
      "Content-Type": metadata?.contentType || "application/pdf",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

export const dynamic = "force-dynamic";
