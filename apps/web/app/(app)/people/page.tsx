import type { Metadata } from "next";
import { Suspense } from "react";
import { PeopleList } from "@/features/people/people-list";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <Suspense>
      <PeopleList />
    </Suspense>
  );
}
