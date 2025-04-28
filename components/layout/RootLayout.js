import Header from "./Header";

export default function RootLayout({ children }) {
  return (
    <>
      <Header />
      <main className="pt-24">{children}</main>
    </>
  );
} 