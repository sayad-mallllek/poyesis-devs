import { bff } from "@/lib/server/bff/app";

export const dynamic = "force-dynamic";

const handler = (request: Request) => bff.handle(request);

export { handler as DELETE, handler as GET, handler as HEAD, handler as PATCH, handler as POST, handler as PUT };
