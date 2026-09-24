"use client";

import { arktypeResolver } from "@hookform/resolvers/arktype";
import { updateCompanySchema, type Company, type UpdateCompanyInput } from "@repo/contracts";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Spinner } from "@/components/ui/spinner";
import { useUpdateCompany } from "@/lib/api/company";
import { applyServerErrors, emptyToNull } from "@/lib/forms";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Values = UpdateCompanyInput;

const normalize = (values: Values): UpdateCompanyInput => ({
  ...emptyToNull(values),
  workingHoursPerDay: Number(values.workingHoursPerDay),
  currency: values.currency?.toUpperCase(),
});

export function CompanyForm({ company }: { company: Company }) {
  const update = useUpdateCompany();
  const form = useForm<Values>({
    resolver: (values, ctx, options) =>
      arktypeResolver(updateCompanySchema)(normalize(values), ctx, options),
    defaultValues: {
      name: company.name,
      legalName: company.legalName ?? "",
      website: company.website ?? "",
      logoUrl: company.logoUrl ?? "",
      timezone: company.timezone,
      currency: company.currency,
      workingHoursPerDay: company.workingHoursPerDay,
      workingDays: company.workingDays,
      aiInstructions: company.aiInstructions ?? "",
    },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync(normalize(values));
      toast.success("Company settings saved");
    } catch (error) {
      applyServerErrors(form, error);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company</CardTitle>
          <CardDescription>Identity shown across the workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="name" label="Name">
              {(field) => <Input {...field} />}
            </FormField>
            <FormField control={form.control} name="legalName" label="Legal name">
              {(field) => <Input {...field} value={field.value ?? ""} />}
            </FormField>
            <FormField control={form.control} name="website" label="Website">
              {(field) => <Input {...field} value={field.value ?? ""} placeholder="https://" />}
            </FormField>
            <FormField control={form.control} name="logoUrl" label="Logo URL">
              {(field) => <Input {...field} value={field.value ?? ""} placeholder="https://" />}
            </FormField>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Working time</CardTitle>
          <CardDescription>Drives capacity in the schedule, utilization and project analytics.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <FormField control={form.control} name="timezone" label="Timezone" description="IANA name, e.g. Europe/Paris">
              {(field) => <Input {...field} />}
            </FormField>
            <FormField control={form.control} name="currency" label="Currency" description="ISO code, e.g. EUR">
              {(field) => <Input {...field} maxLength={3} className="uppercase" />}
            </FormField>
            <FormField control={form.control} name="workingHoursPerDay" label="Hours per day">
              {(field) => <Input type="number" step="0.5" min={1} max={24} {...field} />}
            </FormField>
            <FormField control={form.control} name="workingDays" label="Working days" className="sm:col-span-3">
              {({ value, onChange, id }) => (
                <ToggleGroup
                  id={id}
                  type="multiple"
                  variant="outline"
                  value={(value ?? []).map(String)}
                  onValueChange={(days) => onChange(days.map(Number).sort())}
                  className="justify-start"
                >
                  {WEEKDAYS.map((day, index) => (
                    <ToggleGroupItem
                      key={day}
                      value={String(index)}
                      className="w-12 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {day}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            </FormField>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI assistant</CardTitle>
          <CardDescription>
            Extra guidance appended to the assistant&apos;s instructions — conventions, priorities, vocabulary.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField control={form.control} name="aiInstructions">
            {(field) => (
              <Textarea
                rows={6}
                {...field}
                value={field.value ?? ""}
                placeholder="e.g. We bill in half days. Never book anyone above 90% capacity without flagging it."
              />
            )}
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
          {form.formState.isSubmitting && <Spinner />} Save changes
        </Button>
      </div>
    </form>
  );
}
