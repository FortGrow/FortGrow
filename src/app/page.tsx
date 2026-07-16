import { redirect } from "next/navigation";

// O middleware redireciona "/" — fallback defensivo.
export default function Home() {
  redirect("/login");
}
