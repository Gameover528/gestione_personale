import { redirect } from "next/navigation";

/**
 * Password e sessioni sono state accorpate in "Impostazioni profilo": qui
 * resta solo il rimando, per non rompere link e segnalibri esistenti.
 */
export default function AccountPage() {
  redirect("/impostazioni/profilo");
}
