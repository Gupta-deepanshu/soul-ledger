import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonsPreview } from "@/components/dev/ButtonsPreview";

// TEMPORARY: a review page for the button system. Delete with
// components/dev/ once the buttons are rolled out site-wide.

export const metadata: Metadata = {
  title: "Buttons (dev)",
  robots: { index: false, follow: false },
};

export default function DevButtonsPage() {
  // Development only: production builds answer 404.
  if (process.env.NODE_ENV === "production") notFound();
  return <ButtonsPreview />;
}
