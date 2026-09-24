/** `https://host/path///` → `https://host/path`, so paths can be appended safely. */
export const trimTrailingSlashes = (url: string) => url.replace(/\/+$/, "");
