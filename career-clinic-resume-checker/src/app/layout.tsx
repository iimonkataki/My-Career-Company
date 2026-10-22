export const metadata = {
  title: 'MyCareerCompany Resume Checker',
  description: 'Target JD Database & Resume Checker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
