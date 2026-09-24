import type { Metadata } from "next";
import { NewPerson } from "@/features/people/new-person";

export const metadata: Metadata = { title: "Add person" };

export default function NewPersonPage() {
  return <NewPerson />;
}
