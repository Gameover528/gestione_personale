import { redirect } from "next/navigation";
import { DEFAULT_AREA_HREF } from "@/core/modules/registry";

export default function Home() {
  redirect(DEFAULT_AREA_HREF);
}
