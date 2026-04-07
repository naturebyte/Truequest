import ConfirmationClient from "./ConfirmationClient";

type ConfirmationPageProps = {
  searchParams: Promise<{ regNo?: string; name?: string; mode?: string }>;
};

export default async function AdmissionConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const params = await searchParams;
  const regNo = params.regNo || "Pending";
  const studentName = params.name || "Student";
  const mode = params.mode === "under-review" ? "under-review" : "approved";

  return <ConfirmationClient regNo={regNo} studentName={studentName} mode={mode} />;
}
