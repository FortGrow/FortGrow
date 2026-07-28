import { CrmTabs } from "@/components/crm/crm-tabs";

/**
 * CRM Comercial da FortGrow.
 *
 * Mesma ferramenta que a agência entrega aos clientes, operando no espaço
 * interno (`clientId = null`). O acesso é o do módulo `crm`, controlado pelo
 * middleware e por `requireCrm("INTERNO")`.
 */
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CrmTabs basePath="/admin/crm" />
      {children}
    </>
  );
}
