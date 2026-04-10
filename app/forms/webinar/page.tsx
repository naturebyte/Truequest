import WebinarRegistrationClient from "./WebinarRegistrationClient";

type WebinarRegistrationPageProps = {
  searchParams: Promise<{ webinarId?: string }>;
};

export default async function WebinarRegistrationPage({ searchParams }: WebinarRegistrationPageProps) {
  const params = await searchParams;
  return <WebinarRegistrationClient webinarIdParam={params.webinarId} />;
}
