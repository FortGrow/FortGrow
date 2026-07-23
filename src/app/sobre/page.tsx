import { redirect } from "next/navigation";

// Âncora correspondente na Home — rota mantida para o menu e para URLs diretas.
export default function Page() {
  redirect("/#sobre");
}
