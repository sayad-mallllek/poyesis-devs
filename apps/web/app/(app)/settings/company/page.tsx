"use client";

import { useQuery } from "@tanstack/react-query";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { ErrorState } from "@/components/app/states";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyForm } from "@/features/settings/company-form";
import { companyQuery } from "@/lib/api/company";

export default function CompanySettingsPage() {
  const { data, error } = useQuery(companyQuery);
  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Company settings" description="Workspace-wide defaults." />
      {error ? <ErrorState error={error} /> : data ? <CompanyForm company={data} /> : <Skeleton className="h-96" />}
    </PageContainer>
  );
}
