import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { BookingFlow, type PublicClinic } from "@/components/BookingFlow";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from("public_booking_view").select("*").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  return <BookingFlow clinic={data as PublicClinic} />;
}
