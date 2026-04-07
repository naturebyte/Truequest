import ConfirmationClient from "./ConfirmationClient";

type ConfirmationPageProps = {
  searchParams: Promise<{ regNo?: string; name?: string }>;
};

export default async function AdmissionConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const params = await searchParams;
  const regNo = params.regNo || "Pending";
  const studentName = params.name || "Student";

  return <ConfirmationClient regNo={regNo} studentName={studentName} />;
}
