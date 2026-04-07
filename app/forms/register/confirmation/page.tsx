import ConfirmationClient from "./ConfirmationClient";

type ConfirmationPageProps = {
  searchParams: Promise<{ regNo?: string; name?: string; mode?: string; phone?: string }>;
};

export default async function AdmissionConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const params = await searchParams;
  const regNo = params.regNo || "Pending";
  const studentName = params.name || "Student";
  const phoneNumber = params.phone || "";
  const mode =
    params.mode === "under-review"
      ? "under-review"
      : params.mode === "already-registered"
        ? "already-registered"
        : "approved";

  return (
    <ConfirmationClient
      regNo={regNo}
      studentName={studentName}
      phoneNumber={phoneNumber}
      mode={mode}
    />
  );
}
