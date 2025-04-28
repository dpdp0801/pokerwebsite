import "@/styles/globals.css";
import RootLayout from "@/components/layout/RootLayout";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";

export default function App({ Component, pageProps }) {
  return (
    <SessionProvider session={pageProps.session}>
      <RootLayout>
        <Component {...pageProps} />
      </RootLayout>
      <Toaster />
    </SessionProvider>
  );
}