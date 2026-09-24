"use client";

import { BILLING_MODELS, type ProjectDetail } from "@repo/contracts";
import { Wallet } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { FieldGroup } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupText } from "@/components/ui/input-group";
import { ClientPicker } from "../components/client-picker";
import { EnumSelect } from "../components/enum-select";
import { NumberInput } from "../components/number-input";
import { FormSection, type SectionMeta } from "./form-section";
import type { ProjectFormValues } from "./values";

export const BILLING: SectionMeta = {
  id: "billing",
  title: "Client & billing",
  description: "Who it's for and how it's paid. Budget and rate drive the burn and forecast charts.",
  icon: Wallet,
};

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY"] as const;

export function BillingSection({
  form,
  project,
}: {
  form: UseFormReturn<ProjectFormValues>;
  project?: ProjectDetail;
}) {
  const { control } = form;
  const currency = useWatch({ control, name: "currency" });
  const currencies = CURRENCIES.includes(currency as (typeof CURRENCIES)[number]) ? CURRENCIES : [currency, ...CURRENCIES];

  return (
    <FormSection section={BILLING}>
      <FieldGroup className="grid gap-5 sm:grid-cols-2">
        <FormField control={control} name="clientId" label="Client">
          {({ value, onChange, id, ...field }) => (
            <ClientPicker id={id} value={value} onChange={onChange} selected={project?.client} aria-invalid={field["aria-invalid"]} />
          )}
        </FormField>
        <FormField control={control} name="billingModel" label="Billing model">
          {({ value, onChange, id }) => <EnumSelect id={id} value={value} onChange={onChange} options={BILLING_MODELS} />}
        </FormField>
        <div className="grid grid-cols-[1fr_6.5rem] gap-3">
          <FormField control={control} name="budgetAmount" label="Budget">
            {(field) => <NumberInput {...field} min={0} step={100} placeholder="0" />}
          </FormField>
          <FormField control={control} name="currency" label="Currency">
            {({ value, onChange, id }) => <EnumSelect id={id} value={value} onChange={onChange} options={currencies} renderOption={(c) => c} />}
          </FormField>
        </div>
        <FormField control={control} name="hourlyRate" label="Hourly rate">
          {(field) => (
            <InputGroup>
              <NumberInput {...field} min={0} step={5} placeholder="0" className="flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent" data-slot="input-group-control" />
              <InputGroupAddon align="inline-end">
                <InputGroupText>{currency}/h</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          )}
        </FormField>
        <FormField control={control} name="estimatedHours" label="Estimated effort" description="Total hours; the burn-up chart tracks bookings against it.">
          {(field) => (
            <InputGroup>
              <NumberInput {...field} min={0} step={10} placeholder="0" className="flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent" data-slot="input-group-control" />
              <InputGroupAddon align="inline-end">
                <InputGroupText>hours</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          )}
        </FormField>
      </FieldGroup>
    </FormSection>
  );
}
