"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Globe, Mail, MapPin, Pencil, Phone, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { EmptyState, ErrorState } from "@/components/app/states";
import { ClientStatusBadge, ProjectStatusBadge } from "@/components/app/status-badges";
import { Can } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { clientQuery, useDeleteClient } from "@/lib/api/clients";

function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
      {icon}
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

export function ClientDetailView({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { data: client, error, isPending } = useQuery(clientQuery(clientId));
  const remove = useDeleteClient();

  if (error) {
    return (
      <PageContainer>
        <ErrorState error={error} />
      </PageContainer>
    );
  }
  if (isPending) {
    return (
      <PageContainer>
        <Skeleton className="mb-6 h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        back={{ href: "/clients", label: "Clients" }}
        title={
          <span className="flex items-center gap-3">
            {client.name} <ClientStatusBadge status={client.status} />
          </span>
        }
        description={[client.industry, client.country].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <Can action="delete" subject="Client" resource={{ id: client.id }}>
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <Trash2 /> Delete
                  </Button>
                }
                title={`Delete ${client.name}?`}
                description="Its projects are kept but will no longer be linked to a client. This cannot be undone."
                confirmLabel="Delete client"
                destructive
                onConfirm={() =>
                  remove.mutate(client.id, {
                    onSuccess: () => {
                      toast.success("Client deleted");
                      router.push("/clients");
                    },
                  })
                }
              />
            </Can>
            <Can action="update" subject="Client" resource={{ id: client.id }}>
              <Button asChild>
                <Link href={`/clients/${client.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            </Can>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {client.projects.length === 0 ? (
                <EmptyState
                  icon={<FolderKanban />}
                  title="No projects"
                  description="Assign this client when creating or editing a project."
                />
              ) : (
                <ul className="divide-y">
                  {client.projects.map((project) => (
                    <li key={project.id}>
                      <Link
                        href={`/projects/${project.id}`}
                        className="flex items-center gap-3 py-3 transition-colors hover:text-primary"
                      >
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                        <span className="font-medium">{project.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{project.code}</span>
                        <span className="ml-auto">
                          <ProjectStatusBadge status={project.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm leading-relaxed">{client.notes}</CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.legalName && <p className="text-sm font-medium">{client.legalName}</p>}
              {client.website && (
                <InfoRow icon={<Globe />}>
                  <a href={client.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {client.website.replace(/^https?:\/\//, "")}
                  </a>
                </InfoRow>
              )}
              {client.email && <InfoRow icon={<Mail />}>{client.email}</InfoRow>}
              {client.phone && <InfoRow icon={<Phone />}>{client.phone}</InfoRow>}
              {client.address && <InfoRow icon={<MapPin />}>{client.address}</InfoRow>}
              {client.vatNumber && <p className="text-xs text-muted-foreground">VAT {client.vatNumber}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {client.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts.</p>
              ) : (
                <ul className="space-y-4">
                  {client.contacts.map((c) => (
                    <li key={c.id} className="space-y-1 text-sm">
                      <div className="flex items-center gap-1.5 font-medium">
                        {c.name}
                        {c.isPrimary && <Star className="size-3.5 fill-warning text-warning" aria-label="Primary" />}
                      </div>
                      {c.position && <div className="text-muted-foreground">{c.position}</div>}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="block text-primary hover:underline">
                          {c.email}
                        </a>
                      )}
                      {c.phone && <div className="text-muted-foreground">{c.phone}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
