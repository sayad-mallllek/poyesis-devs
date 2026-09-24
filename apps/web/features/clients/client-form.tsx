"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import {
  CLIENT_STATUSES,
  createClientSchema,
  type ClientDetail,
  type CreateClientInput,
} from "@repo/contracts";
import { Plus, Star, Trash2 } from "lucide-react";
import { useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { applyServerErrors, emptyToNull } from "@/lib/forms";
import { humanize } from "@/lib/format";

type FormValues = CreateClientInput;

const toDefaults = (client?: ClientDetail): FormValues => ({
  name: client?.name ?? "",
  legalName: client?.legalName ?? "",
  status: client?.status ?? "ACTIVE",
  industry: client?.industry ?? "",
  website: client?.website ?? "",
  email: client?.email ?? "",
  phone: client?.phone ?? "",
  address: client?.address ?? "",
  country: client?.country ?? "",
  vatNumber: client?.vatNumber ?? "",
  notes: client?.notes ?? "",
  contacts:
    client?.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ?? "",
      position: c.position ?? "",
      isPrimary: c.isPrimary,
    })) ?? [],
});

/** Inputs yield "" for blank optional fields; the API expects null. */
function normalize(values: FormValues): CreateClientInput {
  return {
    ...emptyToNull(values),
    name: values.name.trim(),
    contacts: values.contacts?.map((c) => ({ ...emptyToNull(c), name: c.name.trim() })),
  };
}

function PrimaryToggle({ control, index, onSelect }: { control: Control<FormValues>; index: number; onSelect: () => void }) {
  const isPrimary = useWatch({ control, name: `contacts.${index}.isPrimary` });
  return (
    <Toggle aria-label="Primary contact" pressed={isPrimary ?? false} onPressedChange={onSelect} size="sm">
      <Star />
    </Toggle>
  );
}

export function ClientForm({
  client,
  submitLabel,
  onSubmit,
}: {
  client?: ClientDetail;
  submitLabel: string;
  onSubmit: (input: CreateClientInput) => Promise<unknown>;
}) {
  const form = useForm<FormValues>({
    // Validate the normalized payload, so blank optional fields don't fail `string.email` etc.
    resolver: (values, ctx, options) => arktypeResolver(createClientSchema)(normalize(values), ctx, options),
    defaultValues: toDefaults(client),
  });
  const contacts = useFieldArray({ control: form.control, name: "contacts", keyName: "key" });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(normalize(values));
    } catch (error) {
      applyServerErrors(form, error);
    }
  });

  const setPrimary = (index: number) =>
    contacts.fields.forEach((_, i) => form.setValue(`contacts.${i}.isPrimary`, i === index, { shouldDirty: true }));

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
            <CardDescription>How the client appears across projects and reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="name" label="Name" className="sm:col-span-2">
                {(field) => <Input {...field} autoFocus />}
              </FormField>
              <FormField control={form.control} name="legalName" label="Legal name">
                {(field) => <Input {...field} value={field.value ?? ""} />}
              </FormField>
              <FormField control={form.control} name="industry" label="Industry">
                {(field) => <Input {...field} value={field.value ?? ""} placeholder="e.g. Retail" />}
              </FormField>
              <FormField control={form.control} name="website" label="Website">
                {(field) => <Input {...field} value={field.value ?? ""} placeholder="https://" />}
              </FormField>
              <FormField control={form.control} name="email" label="Email">
                {(field) => <Input type="email" {...field} value={field.value ?? ""} />}
              </FormField>
              <FormField control={form.control} name="phone" label="Phone">
                {(field) => <Input {...field} value={field.value ?? ""} />}
              </FormField>
              <FormField control={form.control} name="country" label="Country">
                {(field) => <Input {...field} value={field.value ?? ""} />}
              </FormField>
              <FormField control={form.control} name="address" label="Address" className="sm:col-span-2">
                {(field) => <Textarea rows={2} {...field} value={field.value ?? ""} />}
              </FormField>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Contacts</CardTitle>
              <CardDescription>People you work with on the client side.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                contacts.append({ name: "", email: "", phone: "", position: "", isPrimary: contacts.fields.length === 0 })
              }
            >
              <Plus /> Add contact
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {contacts.fields.length === 0 && (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            )}
            {contacts.fields.map((contact, index) => (
              <div key={contact.key} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]">
                <FormField control={form.control} name={`contacts.${index}.name`} label="Name">
                  {(field) => <Input {...field} />}
                </FormField>
                <FormField control={form.control} name={`contacts.${index}.position`} label="Position">
                  {(field) => <Input {...field} value={field.value ?? ""} />}
                </FormField>
                <div className="flex items-end gap-1 sm:row-span-2 sm:flex-col sm:items-end sm:justify-start">
                  <PrimaryToggle control={form.control} index={index} onSelect={() => setPrimary(index)} />
                  <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => contacts.remove(index)}>
                    <Trash2 />
                    <span className="sr-only">Remove contact</span>
                  </Button>
                </div>
                <FormField control={form.control} name={`contacts.${index}.email`} label="Email">
                  {(field) => <Input type="email" {...field} value={field.value ?? ""} />}
                </FormField>
                <FormField control={form.control} name={`contacts.${index}.phone`} label="Phone">
                  {(field) => <Input {...field} value={field.value ?? ""} />}
                </FormField>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <FormField control={form.control} name="status" label="Status">
                {({ value, onChange, ...field }) => (
                  <Select value={value} onValueChange={onChange}>
                    <SelectTrigger id={field.id} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {humanize(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
              <FormField control={form.control} name="vatNumber" label="VAT number">
                {(field) => <Input {...field} value={field.value ?? ""} />}
              </FormField>
              <FormField
                control={form.control}
                name="notes"
                label="Notes"
                description="Context for the team and the AI assistant."
              >
                {(field) => <Textarea rows={6} {...field} value={field.value ?? ""} />}
              </FormField>
            </FieldGroup>
          </CardContent>
        </Card>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
