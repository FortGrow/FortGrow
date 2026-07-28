import { CrmTabs } from "@/components/crm/crm-tabs";

/**
 * Área "Meu CRM" do Portal.
 *
 * A guarda de acesso vive em três camadas e nenhuma depende desta:
 * o menu esconde a área quando ela não está liberada, o middleware barra a
 * URL direta e `requireCrm()` recusa qualquer chamada de API. Aqui só fica
 * a navegação entre as abas.
 */
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CrmTabs basePath="/portal/crm" />
      {children}
    </>
  );
}
