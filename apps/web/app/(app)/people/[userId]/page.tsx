"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { PersonProfile } from "@/features/people/person-profile";

export default function PersonPage() {
  const { userId } = useParams<{ userId: string }>();
  return (
    <Suspense>
      <PersonProfile key={userId} userId={userId} />
    </Suspense>
  );
}
