import type { PipeTransform } from "@nestjs/common";
import { INTEGRATION_PROVIDERS, type IntegrationProvider } from "@repo/contracts";
import { ValidationException } from "../../common/validation/ark.pipe.js";

const isProvider = (value: string): value is IntegrationProvider =>
  (INTEGRATION_PROVIDERS as readonly string[]).includes(value);

/** `:provider` route segment: `github` / `sentry`, case-insensitive. */
export class ProviderPipe implements PipeTransform<string, IntegrationProvider> {
  transform(value: string): IntegrationProvider {
    const provider = String(value).toUpperCase();
    if (!isProvider(provider)) {
      throw new ValidationException({ provider: [`must be github or sentry (was "${value}")`] });
    }
    return provider;
  }
}
