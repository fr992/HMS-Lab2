import HeroSection from "@/features/landing/components/HeroSection";
import DirectorsSection from "@/features/landing/components/DirectorsSection";
import ClinicsSection from "@/features/landing/components/ClinicsSection";
import EquipmentSection from "@/features/landing/components/EquipmentSection";
import AppointmentForm from "@/features/landing/components/AppointmentForm";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <DirectorsSection />
      <ClinicsSection />
      <EquipmentSection />
      <AppointmentForm />
    </>
  );
}