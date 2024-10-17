import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "primereact/resources/themes/lara-dark-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeflex/primeflex.min.css";
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Post Disaster Simulation",
  description:
    "Post Disaster Simulation is a sophisticated platform designed to model and analyze disaster response scenarios, enabling users to simulate key operational metrics such as replenishment costs, deprivation costs, and resource allocation. With an elegant, user-friendly interface, the application allows decision-makers to optimize strategies and improve post-disaster outcomes through data-driven insights. The simulation tool integrates modern technology and premium design, providing a seamless experience for users to visualize key performance indicators (KPIs) in a visually appealing, professional format.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
